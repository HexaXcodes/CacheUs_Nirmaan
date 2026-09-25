import { useState, useRef, useEffect } from 'react'
import { useToast } from '../../../context/ToastContext'
import { useT } from '../../../i18n/useT'
import { processSignal } from '../../../api/ai'
import { submitRppg } from '../../../api/sessions'
import Button from '../../../components/ui/Button'
import Spinner from '../../../components/ui/Spinner'

const CAPTURE_SECS = 30

export default function Step4RPPG({ sessionId, onNext }) {
  const { toast } = useToast()
  const t = useT()

  const algorithm = 'chrom' // CHROM is more accurate; no user choice needed
  const [phase, setPhase] = useState('idle') // idle | capturing | processing | done
  const [progress, setProgress] = useState(0)     // 0–100 during capture
  const [frameCount, setFrameCount] = useState(0)
  const [torchOn, setTorchOn] = useState(false)
  const [fingerDetected, setFingerDetected] = useState(null) // null | true | false
  const [result, setResult] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [captureError, setCaptureError] = useState(null)

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(null)
  const signalsRef = useRef([])   // [[R,G,B], ...]
  const tsRef = useRef([])         // ms timestamps for real fps

  // Clean up stream on unmount
  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  const startCapture = async () => {
    setCaptureError(null)
    signalsRef.current = []
    tsRef.current = []
    setFrameCount(0)
    setProgress(0)
    setFingerDetected(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // rear camera
          width: { ideal: 64 },
          height: { ideal: 64 },
        },
        audio: false,
      })
      streamRef.current = stream

      // Try to enable torch / flashlight
      const track = stream.getVideoTracks()[0]
      try {
        await track.applyConstraints({ advanced: [{ torch: true }] })
        setTorchOn(true)
      } catch {
        setTorchOn(false)
        toast(t('rppg_torch_unavailable'), 'warning')
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setPhase('capturing')
      const startMs = performance.now()

      const canvas = canvasRef.current
      canvas.width = 64
      canvas.height = 64
      const ctx = canvas.getContext('2d', { willReadFrequently: true })

      const captureFrame = () => {
        const elapsed = (performance.now() - startMs) / 1000
        const pct = Math.min(100, Math.round((elapsed / CAPTURE_SECS) * 100))
        setProgress(pct)

        if (elapsed >= CAPTURE_SECS) {
          finishCapture()
          return
        }

        const vid = videoRef.current
        if (vid && vid.readyState >= 2) {
          ctx.drawImage(vid, 0, 0, 64, 64)
          const px = ctx.getImageData(0, 0, 64, 64).data
          let r = 0, g = 0, b = 0
          const n = px.length / 4
          for (let i = 0; i < px.length; i += 4) {
            r += px[i]; g += px[i + 1]; b += px[i + 2]
          }
          const avgR = r / n, avgG = g / n, avgB = b / n
          signalsRef.current.push([avgR, avgG, avgB])
          tsRef.current.push(performance.now())
          setFrameCount(signalsRef.current.length)
          // Finger detection: a covered lens shows high R, low B, and overall dark frame
          // R dominance (R > G*1.2 && R > B*1.5) + not fully black (R > 20)
          const isRed = avgR > 20 && avgR > avgG * 1.2 && avgR > avgB * 1.5
          setFingerDetected(isRed)
        }

        rafRef.current = requestAnimationFrame(captureFrame)
      }

      rafRef.current = requestAnimationFrame(captureFrame)
    } catch {
      setCaptureError(t('rppg_cam_denied'))
      setPhase('idle')
    }
  }

  const finishCapture = async (manual = false) => {
    cancelAnimationFrame(rafRef.current)
    setTorchOn(false)

    // Turn off torch and stop tracks
    const track = streamRef.current?.getVideoTracks()[0]
    if (track) {
      try { await track.applyConstraints({ advanced: [{ torch: false }] }) } catch {}
      track.stop()
    }
    streamRef.current?.getTracks().forEach(t => t.stop())

    const frames = signalsRef.current
    const ts = tsRef.current

    if (frames.length < 150) {
      setCaptureError(t('rppg_too_short') + ` (${frames.length} frames)`)
      setPhase('idle')
      return
    }

    const actualFps = ts.length > 1
      ? Math.round(((ts.length - 1) / ((ts[ts.length - 1] - ts[0]) / 1000)) * 10) / 10
      : 30.0

    setPhase('processing')
    try {
      const res = await processSignal(frames, actualFps, algorithm)
      setResult(res.data)
      setPhase('done')
      toast(t('rppg_success'), 'success')
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || t('rppg_fail')
      setCaptureError(msg)
      setPhase('idle')
    }
  }

  const handleNext = async () => {
    setSubmitting(true)
    try {
      if (result) {
        await submitRppg(sessionId, {
          hrv_flag: result.hrv_flag ?? false,
          hr_bpm: result.hr_bpm ?? null,
          rr_rate: result.rr_rate ?? null,
          sdnn: result.sdnn ?? null,
          rmssd: result.rmssd ?? null,
        })
      }
      onNext({ rppgResult: result })
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || t('rppg_save_fail')
      toast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-hud-ink">{t('rppg_title')}</h2>
        <p className="text-hud-ink3 text-sm mt-1">{t('rppg_subtitle')}</p>
      </div>

      {/* Camera preview + hidden canvas */}
      <div className="relative bg-black rounded-none overflow-hidden aspect-video max-h-48">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {phase === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 select-none">
            <svg viewBox="0 0 48 48" fill="none" className="w-12 h-12 text-hud-cyan/60" stroke="currentColor" strokeWidth="1.5">
              <rect x="16" y="4" width="16" height="28" rx="8" />
              <path d="M8 28c0 8.837 7.163 16 16 16s16-7.163 16-16" strokeLinecap="round" />
              <line x1="24" y1="44" x2="24" y2="44" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-[10px] text-hud-cyan/50 tracking-widest uppercase">Place fingertip on lens</span>
          </div>
        )}

        {phase === 'capturing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
            {/* Progress ring */}
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1e293b" strokeWidth="3" />
                <circle
                  cx="18" cy="18" r="15.9" fill="none"
                  stroke={torchOn ? '#f97316' : '#2563EB'}
                  strokeWidth="3"
                  strokeDasharray={`${progress} 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
                {progress}%
              </span>
            </div>
            <p className="text-white text-xs font-semibold">{t('rppg_capturing')}</p>
            <p className="text-white/70 text-[10px]">{t('rppg_capturing_sub')}</p>
            <p className="text-white/50 text-[10px]">{frameCount} frames</p>
            {torchOn && <span className="text-orange-400 text-[10px]">🔦 TORCH ON</span>}
            {/* Finger detection indicator */}
            {fingerDetected === true && (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-green-500/90 text-white px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                Finger detected
              </span>
            )}
            {fingerDetected === false && (
              <span className="flex items-center gap-1 text-[11px] font-semibold bg-red-500/90 text-white px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-white inline-block" />
                No finger — cover lens
              </span>
            )}
          </div>
        )}

        {phase === 'processing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <Spinner size="lg" />
            <p className="text-white text-sm font-medium">{t('rppg_processing')}</p>
          </div>
        )}
      </div>

      {/* Error */}
      {captureError && (
        <div className="bg-red-50 border border-red-200 rounded-none p-3 text-sm text-red-700">
          {captureError}
        </div>
      )}

      {/* Start button */}
      {phase === 'idle' && !result && (
        <Button onClick={startCapture} variant="primary" size="lg" className="w-full">
          {t('rppg_start')}
        </Button>
      )}

      {/* Stop early */}
      {phase === 'capturing' && (
        <Button onClick={() => finishCapture(true)} variant="outline" size="lg" className="w-full">
          {t('rppg_stop')}
        </Button>
      )}

      {/* Results */}
      {result && phase === 'done' && (
        <div className="bg-hud-bg rounded-none p-5 space-y-4 border border-hud-line2/40">
          <h3 className="font-bold text-gray-800">{t('rppg_result_title')}</h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-hud-surface rounded-none p-3 border text-center">
              <p className="text-xs text-hud-ink3 mb-1">{t('rppg_hr_label')}</p>
              <p className="text-xl font-black text-nova">
                {result.hr_bpm != null ? Math.round(result.hr_bpm) : '—'}
                {result.hr_bpm != null && <span className="text-xs font-normal text-hud-ink3 ml-1">bpm</span>}
              </p>
            </div>
            <div className="bg-hud-surface rounded-none p-3 border text-center">
              <p className="text-xs text-hud-ink3 mb-1">{t('rppg_hrv_label')}</p>
              <p className="text-xl font-black text-hud-ink2">
                {result.rmssd != null ? Math.round(result.rmssd * 10) / 10 : '—'}
                {result.rmssd != null && <span className="text-xs font-normal text-hud-ink3 ml-1">ms</span>}
              </p>
            </div>
            <div className="bg-hud-surface rounded-none p-3 border text-center">
              <p className="text-xs text-hud-ink3 mb-1">{t('rppg_rr_label')}</p>
              <p className="text-xl font-black text-hud-ink2">
                {result.rr_rate != null ? Math.round(result.rr_rate) : '—'}
                {result.rr_rate != null && <span className="text-xs font-normal text-hud-ink3 ml-1">br/m</span>}
              </p>
            </div>
          </div>

          {/* HRV flag */}
          <div className={`text-sm font-semibold px-3 py-2 rounded-none border ${
            result.hrv_flag
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}>
            {result.hrv_flag ? t('rppg_hrv_flag_stress') : t('rppg_hrv_flag_ok')}
          </div>

          {/* Re-capture */}
          <Button onClick={() => { setResult(null); setPhase('idle'); setCaptureError(null) }}
            variant="ghost" size="sm">
            🔄 Re-capture
          </Button>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <Button
          onClick={() => onNext({ rppgResult: null })}
          variant="ghost"
          className="flex-1"
          disabled={phase === 'capturing' || phase === 'processing' || submitting}
        >
          {t('rppg_skip')}
        </Button>
        <Button
          onClick={handleNext}
          variant="primary"
          className="flex-2"
          loading={submitting}
          disabled={phase === 'capturing' || phase === 'processing'}
        >
          {result ? t('rppg_save_continue') : t('rppg_continue_without')} →
        </Button>
      </div>
    </div>
  )
}
