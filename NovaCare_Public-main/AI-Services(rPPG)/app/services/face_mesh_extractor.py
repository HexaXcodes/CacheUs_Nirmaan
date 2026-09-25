import os
import cv2
import numpy as np
from typing import List, Tuple, Optional

# Attempt to import mediapipe
try:
    import mediapipe as mp
    MEDIAPIPE_AVAILABLE = True
except ImportError:
    MEDIAPIPE_AVAILABLE = False


def extract_roi_signals(video_path: str) -> Tuple[List[List[float]], float]:
    """
    Reads a video file frame-by-frame and extracts the average R, G, B values from the forehead ROI.
    Returns:
        - rgb_signals: A list of [R, G, B] lists for each frame.
        - fps: The frame rate (sampling frequency) of the video.
    """
    if not os.path.exists(video_path):
        raise FileNotFoundError(f"Video file not found at: {video_path}")

    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 30.0  # Default fallback fps

    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    
    rgb_signals = []

    # Initialize MediaPipe Face Mesh if available
    mp_face_mesh = None
    face_mesh = None
    if MEDIAPIPE_AVAILABLE:
        try:
            mp_face_mesh = mp.solutions.face_mesh
            face_mesh = mp_face_mesh.FaceMesh(
                max_num_faces=1,
                refine_landmarks=False,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
        except Exception:
            # If MediaPipe fails to initialize (e.g. missing native libraries)
            face_mesh = None

    # Load OpenCV Haar Cascade as fallback
    haar_cascade = None
    try:
        cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
        if os.path.exists(cascade_path):
            haar_cascade = cv2.CascadeClassifier(cascade_path)
    except Exception:
        haar_cascade = None

    # Forehead landmark indices in MediaPipe Face Mesh
    # We use a polygon bounding the center of the forehead:
    # 9 (midpoint), 107 (right eyebrow inner), 66 (right forehead), 109 (right forehead outer),
    # 10 (top center forehead), 338 (left forehead outer), 296 (left forehead), 336 (left eyebrow inner)
    forehead_indices = [9, 107, 66, 109, 10, 338, 296, 336]

    frame_idx = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # Convert to RGB (OpenCV reads in BGR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        r_avg, g_avg, b_avg = None, None, None

        # 1. Try MediaPipe Face Mesh
        if face_mesh is not None:
            results = face_mesh.process(frame_rgb)
            if results.multi_face_landmarks:
                landmarks = results.multi_face_landmarks[0].landmark
                
                # Get forehead polygon coordinates
                points = []
                for idx in forehead_indices:
                    landmark = landmarks[idx]
                    x_px = int(landmark.x * width)
                    y_px = int(landmark.y * height)
                    points.append((x_px, y_px))
                
                points = np.array(points, dtype=np.int32)
                
                # Create a mask and compute average color inside the polygon
                mask = np.zeros((height, width), dtype=np.uint8)
                cv2.fillPoly(mask, [points], 255)
                
                mean_val = cv2.mean(frame_rgb, mask=mask)
                r_avg, g_avg, b_avg = mean_val[0], mean_val[1], mean_val[2]

        # 2. Try Haar Cascade Fallback
        if (r_avg is None) and (haar_cascade is not None):
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = haar_cascade.detectMultiScale(gray, scaleFactor=1.2, minNeighbors=5, minSize=(100, 100))
            
            if len(faces) > 0:
                # Use the largest face
                faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
                x, y, w, h = faces[0]
                
                # Forehead box approximation: top 15% of the face, centered horizontally
                fh_x = x + int(w * 0.25)
                fh_y = y + int(h * 0.05)
                fh_w = int(w * 0.5)
                fh_h = int(h * 0.15)
                
                # Boundary check
                fh_x = max(0, fh_x)
                fh_y = max(0, fh_y)
                fh_w = min(width - fh_x, fh_w)
                fh_h = min(height - fh_y, fh_h)
                
                if fh_w > 0 and fh_h > 0:
                    roi = frame_rgb[fh_y:fh_y + fh_h, fh_x:fh_x + fh_w]
                    mean_val = cv2.mean(roi)
                    r_avg, g_avg, b_avg = mean_val[0], mean_val[1], mean_val[2]

        # 3. Center-Top Screen Fallback
        if r_avg is None:
            # Approximate where the forehead would be if user is centered
            fh_x = int(width * 0.35)
            fh_y = int(height * 0.15)
            fh_w = int(width * 0.3)
            fh_h = int(height * 0.15)
            
            roi = frame_rgb[fh_y:fh_y + fh_h, fh_x:fh_x + fh_w]
            mean_val = cv2.mean(roi)
            r_avg, g_avg, b_avg = mean_val[0], mean_val[1], mean_val[2]

        rgb_signals.append([float(r_avg), float(g_avg), float(b_avg)])
        frame_idx += 1

    cap.release()
    
    if len(rgb_signals) == 0:
        raise ValueError("No frames could be read from the video.")

    return rgb_signals, float(fps)
