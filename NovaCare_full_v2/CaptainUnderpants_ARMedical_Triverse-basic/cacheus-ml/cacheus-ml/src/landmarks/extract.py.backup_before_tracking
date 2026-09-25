import cv2
import mediapipe as mp


class LandmarkExtractor:
    def __init__(self):
        self.mp_hands = mp.solutions.hands

        self.hands = self.mp_hands.Hands(
            static_image_mode=True,
            max_num_hands=2,
            model_complexity=0,
            min_detection_confidence=0.2,
            min_tracking_confidence=0.2,
        )

    def extract(self, image):
        if image is None:
            return []

        rgb = cv2.cvtColor(
            image,
            cv2.COLOR_BGR2RGB,
        )

        result = self.hands.process(rgb)

        output = []

        if result.multi_hand_landmarks:
            for hand in result.multi_hand_landmarks:
                landmarks = []

                for landmark in hand.landmark:
                    landmarks.append(
                        {
                            "x": float(landmark.x),
                            "y": float(landmark.y),
                            "z": float(landmark.z),
                        }
                    )

                output.append(landmarks)

        return output

    def close(self):
        self.hands.close()
