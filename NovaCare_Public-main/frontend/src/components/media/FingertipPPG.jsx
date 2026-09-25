/**
 * FingertipPPG — flash-based photoplethysmography via rear camera.
 *
 * Scientific basis: fingertip placed over camera + flashlight modulates
 * reflected light intensity with each cardiac pulse cycle. The red channel
 * absorbs most of the blood-volume change (oxyhaemoglobin absorption peak
 * ~660 nm). This is the same physical principle used by clinical pulse
 * oximeters — no skin-tone classification is involved.
 *
 * Output: array of [R, G, B] average pixel intensities at ~30 fps for
 * ~30 seconds → sent to backend /ai/rppg/process-signal.
 */
import { useState, useRef, useEffect, useCallback } from 'react'

const SAMPLE_DURATION_S = 30   // recording window
const TARGET_FPS        = 30   // frames to capture per second
const CANVAS_W          = 64   // tiny canvas — only average needed
const CANVAS_H          = 64

// Quality heuristic: red channel mean should be >> green/blue when finger covers lens
const MIN_RED_DOMINANCE = 1.15  // red must be 15% brighter than green

export default function FingertipPPG({ onSignalReady, disabled }) {
  const [phase, setPhase] = useState('idle')
  // idle | requesting | placing | recording | processing | done | error
  const [secondsLeft, setSecondsLeft] = useState(SAMPLE_DURATION_S)
  const [quality, setQuality] = useState(null)   // 'good' | 'bad' | null
  const [errorMsg, setErrorMsg] = useState('')
  const [torchOn, setTorchOn] = useState(false)
  const [framesCollected, setFramesCollected] = useState(0)

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const trackRef    = useRef(null)
  const signalRef   = useRef([])   // [[R,G,B], ...]
  const timerRef    = useRef(null)
  const rafRef      = useRef(null)
  const countdownRef = useRef(null)

  // ── cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => () => stopEverything(), [])

  const stopEverything = () => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(timerRef.current)
    clearInterval(countdownRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    trackRef.current = null
  }

  // ── request rear camera + torch ─────────────────────────────────────────
  const startCamera = async () => {
    setPhase('requesting')
    setErrorMsg('')
    signalRef.current = []

    try {
      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width:  { ideal: CANVAS_W },
          height: { ideal: CANVAS_H },
          frameRate: { ideal: TARGET_FPS, max: 60 },
        },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      const track = stream.getVideoTracks()[0]
      trackRef.current = track

      // Activate torch (Android Chrome/Edge — silently fails on iOS)
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] })
        setTorchOn(true)
      } catch {
        setTorchOn(false) // iOS or desktop — continue without torch
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setPhase('placing')
    } catch (err) {
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access and try again.'
          : err.name === 'NotFoundError'
          ? 'No rear camera found on this device.'
          : `Camera error: ${err.message}`
      )
      setPhase('error')
    }
  }

  // ── extract average RGB from one frame ──────────────────────────────────
  const extractFrame = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return null

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(video, 0, 0, CANVAS_W, CANVAS_H)
    const { data } = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H)

    let r = 0, g = 0, b = 0
    const n = data.length / 4
    for (let i = 0; i < data.length; i += 4) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]
    }
    return [r / n, g / n, b / n]
  }, [])

  // ── start recording loop ─────────────────────────────────────────────────
  const startRecording = () => {
    setPhase('recording')
    setSecondsLeft(SAMPLE_DURATION_S)
    setFramesCollected(0)
    signalRef.current = []

    const interval = Math.round(1000 / TARGET_FPS)
    let lastCapture = 0

    const loop = (ts) => {
      if (phase === 'done') return
      if (ts - lastCapture >= interval) {
        const rgb = extractFrame()
        if (rgb) {
          signalRef.current.push(rgb)
          setFramesCollected(signalRef.current.length)

          // Quality check: red should dominate when finger covers lens
          const [r, g] = rgb
          setQuality(r > g * MIN_RED_DOMINANCE ? 'good' : 'bad')
        }
        lastCapture = ts
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)

    // Countdown
    countdownRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(countdownRef.current)
          finishRecording()
          return 0
        }
        return s - 1
      })
    }, 1000)
  }

  // ── finish recording ─────────────────────────────────────────────────────
  const finishRecording = () => {
    cancelAnimationFrame(rafRef.current)
    stopEverything()
    setPhase('done')

    const signal = signalRef.current
    if (signal.length < 150) {
      setErrorMsg(`Only ${signal.length} frames captured — try again in better lighting.`)
      setPhase('error')
      return
    }
    onSignalReady && onSignalReady(signal, TARGET_FPS)
  }

  const reset = () => {
    stopEverything()
    setPhase('idle')
    setQuality(null)
    setSecondsLeft(SAMPLE_DURATION_S)
    setFramesCollected(0)
    setErrorMsg('')
  }

  // ── progress ring percentage ─────────────────────────────────────────────
  const pct = Math.round(((SAMPLE_DURATION_S - secondsLeft) / SAMPLE_DURATION_S) * 100)

  return (
    <div className="space-y-4">
      {/* Hidden video + canvas */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="hidden" />

      {/* ── IDLE ── */}
      {phase === 'idle' && (
        <div className="space-y-4">
          <InstructionCard />
          <button
            onClick={startCamera}
            disabled={disabled}
            className="w-full py-4 bg-hud-cyan text-hud-bg font-mono font-black text-sm tracking-widest
              uppercase transition hover:opacity-90 active:scale-95 disabled:opacity-40"
            style={{ boxShadow: '4px 4px 0 0 #2563EB' }}
          >
            📱 START FINGERTIP SCAN
          </button>
        </div>
      )}

      {/* ── REQUESTING CAMERA ── */}
      {phase === 'requesting' && (
        <div className="text-center py-8 space-y-2">
          <div className="font-mono text-xs text-hud-cyan animate-pulse tracking-widest">
            REQUESTING CAMERA ACCESS...
          </div>
        </div>
      )}

      {/* ── PLACING FINGER ── */}
      {phase === 'placing' && (
        <div className="space-y-4">
          <div className="border-2 border-hud-cyan/60 bg-hud-cyan/5 p-5 space-y-3">
            <p className="font-mono text-xs text-hud-cyan tracking-widest uppercase">
              {torchOn ? '🔦 Flashlight ON' : '⚠ No flashlight — use bright external light'}
            </p>
            <p className="font-mono text-sm text-hud-text">
              Place your <strong>index finger</strong> firmly over the rear camera lens.
              Keep still. The screen will turn red when correctly placed.
            </p>
            <div className="flex justify-center">
              <FingerIcon />
            </div>
          </div>
          <button
            onClick={startRecording}
            className="w-full py-4 bg-tier-green text-hud-bg font-mono font-black text-sm tracking-widest
              uppercase hover:opacity-90 active:scale-95"
            style={{ boxShadow: '4px 4px 0 0 #065f46' }}
          >
            ✅ FINGER PLACED — BEGIN 30s SCAN
          </button>
          <button onClick={reset} className="w-full font-mono text-xs text-hud-dim hover:text-hud-muted uppercase tracking-widest py-2">
            ✕ Cancel
          </button>
        </div>
      )}

      {/* ── RECORDING ── */}
      {phase === 'recording' && (
        <div className="space-y-4">
          {/* Quality indicator */}
          <div className={`border-2 p-3 flex items-center gap-3 transition-colors
            ${quality === 'good' ? 'border-tier-green bg-tier-green/10' :
              quality === 'bad'  ? 'border-tier-red  bg-tier-red/10'  :
                                   'border-hud-dim'}`}>
            <div className={`w-3 h-3 rounded-full animate-pulse
              ${quality === 'good' ? 'bg-tier-green' :
                quality === 'bad'  ? 'bg-tier-red'   : 'bg-hud-dim'}`} />
            <span className="font-mono text-xs uppercase tracking-widest text-hud-text">
              {quality === 'good' ? 'Good signal — keep still'
               : quality === 'bad' ? 'Adjust finger — cover lens fully'
               : 'Detecting signal...'}
            </span>
          </div>

          {/* Progress ring */}
          <div className="flex flex-col items-center gap-2">
            <ProgressRing pct={pct} secondsLeft={secondsLeft} />
            <p className="font-mono text-xs text-hud-ink3">
              {framesCollected} frames captured
            </p>
          </div>

          <button onClick={finishRecording}
            className="w-full font-mono text-xs text-hud-dim hover:text-tier-red uppercase tracking-widest py-2">
            Stop early
          </button>
        </div>
      )}

      {/* ── DONE ── */}
      {phase === 'done' && (
        <div className="space-y-4">
          <div className="border border-tier-green/60 bg-tier-green/10 p-4 text-center">
            <p className="font-mono text-sm text-tier-green font-bold uppercase tracking-widest">
              ✓ SCAN COMPLETE — {framesCollected} frames
            </p>
            <p className="font-mono text-xs text-hud-ink3 mt-1">
              Signal sent for heart-rate and pulse-variability analysis
            </p>
          </div>
          <button onClick={reset}
            className="w-full font-mono text-xs text-hud-dim hover:text-hud-muted uppercase tracking-widest py-2">
            🔄 Re-scan
          </button>
        </div>
      )}

      {/* ── ERROR ── */}
      {phase === 'error' && (
        <div className="space-y-4">
          <div className="border border-tier-red/60 bg-tier-red/10 p-4 space-y-2">
            <p className="font-mono text-xs text-tier-red uppercase tracking-widest font-bold">⚠ Error</p>
            <p className="font-mono text-xs text-hud-text">{errorMsg}</p>
          </div>
          <button onClick={reset}
            className="w-full py-3 border border-hud-dim font-mono text-xs text-hud-muted
              uppercase tracking-widest hover:border-hud-cyan hover:text-hud-cyan transition">
            Try Again
          </button>
        </div>
      )}
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function InstructionCard() {
  return (
    <div className="border border-hud-line2/40 bg-hud-surface p-4 space-y-3">
      <p className="font-mono text-xs text-hud-cyan uppercase tracking-widest font-bold">
        How fingertip PPG works
      </p>
      <div className="space-y-2 font-mono text-xs text-hud-ink3">
        <p>1. Place your index finger firmly over the rear camera lens.</p>
        <p>2. The flashlight illuminates the fingertip from behind.</p>
        <p>3. Each heartbeat changes blood volume, varying light intensity.</p>
        <p>4. This measures pulse rate and variability — not skin colour.</p>
      </div>
      <div className="border-t border-hud-dim pt-2 font-mono text-xs text-hud-dim">
        Same principle as clinical pulse oximeters. Works for all skin tones.
      </div>
    </div>
  )
}

function FingerIcon() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
      <rect x="32" y="8" width="16" height="40" rx="8" fill="#2563EB" opacity="0.8" />
      <rect x="20" y="32" width="40" height="32" rx="4" fill="#DCE6F2" stroke="#2563EB" strokeWidth="2" />
      <circle cx="40" cy="52" r="6" fill="#2563EB" opacity="0.6" />
      <circle cx="40" cy="52" r="3" fill="#2563EB" />
    </svg>
  )
}

function ProgressRing({ pct, secondsLeft }) {
  const r = 44
  const circ = 2 * Math.PI * r
  const dash = circ * (pct / 100)
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="112" height="112">
        <circle cx="56" cy="56" r={r} stroke="#DCE6F2" strokeWidth="6" fill="none" />
        <circle cx="56" cy="56" r={r} stroke="#2563EB" strokeWidth="6" fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 6px #2563EB)', transition: 'stroke-dasharray 0.3s' }}
        />
      </svg>
      <div className="text-center">
        <div className="font-mono font-black text-2xl text-hud-cyan">{secondsLeft}s</div>
        <div className="font-mono text-xs text-hud-ink3">left</div>
      </div>
    </div>
  )
}
