// src/components/ar/CameraFeed.jsx
// ============================================================================
//  Plain getUserMedia camera view — deliberately markerless. No QR/marker
//  detection library is loaded for the new workflows (see legacy note in
//  components/ar/arConfig.js for the retained AR.js prototype). This is the
//  camera surface that <ARAnchor /> is layered on top of.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { Camera, AlertTriangle, ScanLine, X } from 'lucide-react';

// Rear-camera ("environment") requests are known to hang — not reject —
// on some Windows/Chromium + webcam-driver combos that don't report a
// facing mode at all. Try it first, but fall back to a bare video request
// if it stalls, instead of leaving the user stuck on a black screen.
const CANDIDATE_CONSTRAINTS = [
  { video: { facingMode: { ideal: 'environment' } }, audio: false },
  { video: true, audio: false }
];
const PER_ATTEMPT_TIMEOUT_MS = 6000;

const CameraFeed = ({ onReady, onVideoReady, onExit, children }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [armed, setArmed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  // Cleanup on unmount only. Opening the camera is driven by the button's
  // click handler below rather than an effect keyed on `armed` — an effect
  // gets double-invoked by React StrictMode in dev, which fires two
  // concurrent getUserMedia() calls against the same physical camera. Only
  // one permission prompt shows (so the OS-level preview looks fine), but
  // the stale call's cleanup stops its stream right as the real one is
  // trying to start, leaving the <video> element with a dead stream.
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = async () => {
    setError(null);
    setStarting(true);

    let lastErr;
    for (const constraints of CANDIDATE_CONSTRAINTS) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await Promise.race([
            videoRef.current.play(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), PER_ATTEMPT_TIMEOUT_MS))
          ]);
        }

        setStarting(false);
        setArmed(true);
        onReady?.();
        onVideoReady?.(videoRef.current);
        return;
      } catch (err) {
        lastErr = err;
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }

    setStarting(false);
    setError(
      lastErr?.message === 'timeout'
        ? 'Camera opens but never produces video, even without a rear-camera request. Another app or the OS is likely holding an exclusive lock on it, or the driver is stuck — close other camera apps, restart the "Windows Camera Frame Server" service, or reboot.'
        : (lastErr?.message || 'Could not access camera.')
    );
  };

  return (
    <div className="absolute inset-0 bg-black overflow-hidden">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      {armed && children}

      {!armed && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-black text-white p-6">
          {onExit && (
            <button
              onClick={onExit}
              className="absolute top-4 right-4 w-11 h-11 grid place-items-center bg-white/90 text-black border-2 border-black rounded-lg hover:bg-white"
              title="Exit"
            >
              <X size={18} strokeWidth={2.5} />
            </button>
          )}
          <div className="w-full max-w-sm space-y-4 text-center">
            <div className="w-16 h-16 mx-auto grid place-items-center bg-white/10 border-2 border-white/30 rounded-2xl">
              <Camera size={28} />
            </div>
            <h3 className="font-bold text-2xl">Ready to guide you</h3>
            <p className="text-sm text-white/70">
              NovaCare uses your camera to visually verify your technique. Nothing is uploaded except what's needed for verification.
            </p>
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/40 rounded-lg text-left">
                <AlertTriangle size={16} className="text-red-300 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-200">{error}</p>
              </div>
            )}
            <button
              onClick={startCamera}
              disabled={starting}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 active:scale-95 transition disabled:opacity-60"
            >
              <ScanLine size={18} />
              {starting ? 'Starting…' : error ? 'Try again' : 'Start camera'}
            </button>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Requires HTTPS · grant camera permission
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraFeed;
