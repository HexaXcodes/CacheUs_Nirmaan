import { useCallback, useEffect, useRef, useState } from 'react'
import { saveMeasurement } from '../../api/measurements'
import {
  splitSerialLines, parseSerialLine, reduceReplay, initialReplayState,
  REPLAY_PHASE, buildReplayPayload, replayDurationSeconds,
  pickRandomSegment, isValidSegment, revealedSampleCount,
} from '../../lib/unoReplay'

const SILENCE_TIMEOUT_MS = 5000
const btnClass = 'border border-hud-dim text-hud-muted font-mono text-[10px] px-3 py-1.5 hover:border-hud-cyan hover:text-hud-cyan transition-all uppercase tracking-wider disabled:opacity-40'

/** Compact scrolling-waveform view: renders the samples revealed so far as an
 * SVG polyline. Always shows a prefix of the exact same array that will be (or
 * was) submitted — never a re-sampled/truncated copy. */
function WaveformView({ samples, count }) {
  const windowSize = 300
  const start = Math.max(0, count - windowSize)
  const visible = samples.slice(start, count)
  if (!visible.length) return <div className="h-16 border border-hud-dim/60 bg-[#0f1a24]" />
  const min = Math.min(...visible), max = Math.max(...visible)
  const span = max - min || 1
  const points = visible.map((v, i) => {
    const x = (i / Math.max(1, windowSize - 1)) * 100
    const y = 100 - ((v - min) / span) * 100
    return `${x.toFixed(2)},${y.toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-16 border border-hud-dim/60 bg-[#0f1a24]">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-hud-cyan" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

/**
 * Arduino Uno finger-trigger PPG dataset replay.
 *
 * Hardware: Arduino Uno + yellow LED (220ohm) + LDR (10k divider) on A0. The
 * board only detects finger presence via light level; it does NOT measure a
 * real PPG/heart-rate signal. Placing a finger on it "arms" a timed replay of
 * a prerecorded BIDMC dataset segment, which is what actually gets analysed.
 *
 * The dataset segment is chosen uniformly at random from the 15-segment
 * manifest for each armed attempt (never based on any "desirable" outcome),
 * loaded and validated before the Arm button is enabled, and frozen for the
 * whole attempt so it cannot change mid-flow.
 *
 * Uses the Web Serial API (Chrome/Edge desktop only). The Arduino IDE Serial
 * Monitor/Plotter and hardware/uno_replay_bridge.py must both be closed —
 * only one process can own the serial port at a time.
 */
export default function UnoPpgReplay({ patientId, screeningId, onResult, disabled }) {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator
  const [segments, setSegments] = useState([])
  const [candidate, setCandidate] = useState(null) // {file,label,data} — loaded+validated, not yet armed
  const [loadingCandidate, setLoadingCandidate] = useState(false)
  const [candidateError, setCandidateError] = useState('')
  const [armedSegment, setArmedSegment] = useState(null) // frozen selection for the current attempt
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState(supported ? 'Not connected.' : '')
  const [replayState, setReplayState] = useState(initialReplayState())
  const [countdown, setCountdown] = useState(0)
  const [revealCount, setRevealCount] = useState(0)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const portRef = useRef(null)
  const readerRef = useRef(null)
  const keepReadingRef = useRef(false)
  const bufferRef = useRef('')
  const silenceTimerRef = useRef(null)
  const replayTimerRef = useRef(null)
  const rafRef = useRef(null)
  const replayStartRef = useRef(0)
  const submittedRef = useRef(false)
  // Armed context is captured at FINGER_IN time and re-checked before submit so a
  // patient/questionnaire switch mid-replay can never attach the result to the wrong record.
  const armedContextRef = useRef(null)
  const segmentRef = useRef(null)
  const mountedRef = useRef(true)
  const patientIdRef = useRef(patientId)
  const screeningIdRef = useRef(screeningId)

  useEffect(() => { segmentRef.current = armedSegment?.data || null }, [armedSegment])
  useEffect(() => { patientIdRef.current = patientId }, [patientId])
  useEffect(() => { screeningIdRef.current = screeningId }, [screeningId])

  useEffect(() => {
    let cancelled = false
    fetch('/uno_ppg_dataset/index.json').then(r => r.json()).then(list => { if (!cancelled) setSegments(list) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const pickCandidate = useCallback(async () => {
    if (!segments.length) return
    setLoadingCandidate(true)
    setCandidateError('')
    try {
      const entry = pickRandomSegment(segments)
      const data = await fetch(`/uno_ppg_dataset/${entry.file}`).then(r => r.json())
      delete data._reference
      if (!isValidSegment(data)) throw new Error('Invalid dataset segment')
      if (mountedRef.current) setCandidate({ file: entry.file, label: entry.label, data })
    } catch {
      if (mountedRef.current) setCandidateError('Could not load a demo segment. Retrying…')
    } finally {
      if (mountedRef.current) setLoadingCandidate(false)
    }
  }, [segments])

  // Auto-select + validate a fresh random segment whenever there is none staged
  // and the widget is idle, so a segment is always ready before Arm is enabled.
  useEffect(() => {
    if (replayState.phase === REPLAY_PHASE.DISARMED && !candidate && !loadingCandidate && segments.length) {
      pickCandidate()
    }
  }, [replayState.phase, candidate, loadingCandidate, segments, pickCandidate])

  const dispatch = useCallback(action => setReplayState(s => reduceReplay(s, action)), [])

  const cancelPendingReplay = useCallback((reason) => {
    clearTimeout(replayTimerRef.current)
    cancelAnimationFrame(rafRef.current)
    armedContextRef.current = null
    setCountdown(0)
    setRevealCount(0)
    setArmedSegment(null)
    dispatch({ type: 'CANCEL' })
    if (reason) setStatus(reason)
  }, [dispatch])

  // Item 12: invalidate any pending/armed replay if the patient or questionnaire changes.
  useEffect(() => {
    cancelPendingReplay(null)
  }, [patientId, screeningId, cancelPendingReplay])

  const resetSilenceTimer = useCallback(() => {
    clearTimeout(silenceTimerRef.current)
    silenceTimerRef.current = setTimeout(() => {
      cancelPendingReplay('Serial silence — no data from the board for 5s. Replay cancelled; reconnect if needed.')
    }, SILENCE_TIMEOUT_MS)
  }, [cancelPendingReplay])

  async function submitReplay() {
    const ctx = armedContextRef.current
    const seg = segmentRef.current
    if (!ctx || !seg || submittedRef.current) return
    if (ctx.patientId !== patientIdRef.current || ctx.screeningId !== screeningIdRef.current) {
      cancelPendingReplay('Patient or questionnaire changed during replay; discarded to avoid mislinking.')
      return
    }
    submittedRef.current = true
    setSubmitting(true)
    setError('')
    try {
      const payload = buildReplayPayload({ segment: seg, patientId: ctx.patientId, screeningId: ctx.screeningId, deviceId: 'arduino-uno-finger-trigger' })
      const response = await saveMeasurement('bp/ppg', payload)
      if (mountedRef.current) onResult?.(response.data)
      setStatus('Replay submitted and analyzed.')
    } catch (e) {
      // Honest handling per spec item 11: an already-sent request may have saved despite
      // a network error on the response; never auto-retry an ambiguous failure.
      setError(e.response?.data?.error || e.message || 'Replay submission failed. Check history before retrying — it may have already saved.')
    } finally {
      if (mountedRef.current) setSubmitting(false)
      submittedRef.current = false
      armedContextRef.current = null
      cancelAnimationFrame(rafRef.current)
      dispatch({ type: 'REPLAY_DONE' })
    }
  }

  const handleEvent = useCallback((evt) => {
    resetSilenceTimer()
    if (evt.type === 'READY') {
      // Board reset: always cancel; a fresh Arm + FINGER_OUT is required afterward.
      cancelPendingReplay('Board reset detected (READY). Re-arm and remove finger to continue.')
      return
    }
    if (evt.type === 'FINGER_OUT') {
      clearTimeout(replayTimerRef.current)
      cancelAnimationFrame(rafRef.current)
      setRevealCount(0)
      dispatch({ type: 'FINGER_OUT' })
      setStatus('Finger removed — confirmed. Insert finger to start the timed replay.')
      return
    }
    if (evt.type === 'FINGER_IN') {
      setReplayState(s => {
        const next = reduceReplay(s, { type: 'FINGER_IN' })
        if (next.phase === REPLAY_PHASE.REPLAYING && s.phase !== REPLAY_PHASE.REPLAYING) {
          const seg = segmentRef.current
          if (!seg) { setStatus('Insert cancelled: no dataset segment selected.'); return initialReplayState() }
          armedContextRef.current = { patientId, screeningId }
          const seconds = replayDurationSeconds(seg)
          setCountdown(seconds)
          setStatus(`Measuring.... ${seconds.toFixed(1)}s…`)
          replayStartRef.current = performance.now()
          setRevealCount(0)
          const tick = () => {
            const elapsed = (performance.now() - replayStartRef.current) / 1000
            setRevealCount(revealedSampleCount(seg, elapsed))
            setCountdown(Math.max(0, seconds - elapsed))
            rafRef.current = requestAnimationFrame(tick)
          }
          rafRef.current = requestAnimationFrame(tick)
          replayTimerRef.current = setTimeout(submitReplay, seconds * 1000)
        }
        return next
      })
    }
  }, [dispatch, resetSilenceTimer, cancelPendingReplay, patientId, screeningId])

  async function readLoop(port) {
    const decoder = new TextDecoderStream()
    const readable = port.readable.pipeThrough(decoder)
    const reader = readable.getReader()
    readerRef.current = reader
    resetSilenceTimer()
    try {
      while (keepReadingRef.current) {
        const { value, done } = await reader.read()
        if (done) break
        if (value) {
          const { lines, remainder } = splitSerialLines(bufferRef.current, value)
          bufferRef.current = remainder
          for (const line of lines) {
            const evt = parseSerialLine(line)
            if (evt) handleEvent(evt)
          }
        }
      }
    } catch {
      // Read error usually means the device was unplugged; fall through to cleanup.
    } finally {
      try { reader.releaseLock() } catch {}
    }
  }

  const disconnect = useCallback(async (message) => {
    keepReadingRef.current = false
    clearTimeout(silenceTimerRef.current)
    cancelPendingReplay(null)
    try { await readerRef.current?.cancel() } catch {}
    readerRef.current = null
    try { await portRef.current?.close() } catch {}
    portRef.current = null
    bufferRef.current = ''
    setConnected(false)
    setStatus(message || 'Disconnected.')
  }, [cancelPendingReplay])

  async function connect() {
    setError('')
    try {
      const port = await navigator.serial.requestPort()
      await port.open({ baudRate: 115200 })
      portRef.current = port
      keepReadingRef.current = true
      port.addEventListener?.('disconnect', () => disconnect('Board disconnected.'))
      setConnected(true)
      setStatus('Connected. Waiting for board data…')
      readLoop(port)
    } catch (e) {
      if (e?.name !== 'NotFoundError') setError(e.message || 'Could not open serial port.')
    }
  }

  function arm() {
    if (!candidate) { setError('No demo segment ready yet — please wait.'); return }
    setError('')
    setArmedSegment(candidate)
    setCandidate(null)
    dispatch({ type: 'ARM' })
    setStatus('Armed. Remove finger from the sensor (confirmed FINGER_OUT) to continue.')
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      keepReadingRef.current = false
      clearTimeout(silenceTimerRef.current)
      clearTimeout(replayTimerRef.current)
      cancelAnimationFrame(rafRef.current)
      readerRef.current?.cancel?.().catch(() => {})
      portRef.current?.close?.().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const onUnload = () => { if (!submittedRef.current) cancelPendingReplay(null) }
    window.addEventListener('beforeunload', onUnload)
    return () => window.removeEventListener('beforeunload', onUnload)
  }, [cancelPendingReplay])

  if (!supported) {
    return <p role="alert" className="font-mono text-xs text-tier-red bg-tier-red/10 border border-tier-red/30 px-3 py-2">
      Web Serial is not supported in this browser. Use desktop Chrome or Edge to connect the Arduino Uno.
    </p>
  }

  const phase = replayState.phase
  const activeSegment = armedSegment || candidate
  const fingerStatus = {
    [REPLAY_PHASE.DISARMED]: 'Not armed.',
    [REPLAY_PHASE.WAITING_FOR_OUT]: 'Armed — waiting for finger to be removed first.',
    [REPLAY_PHASE.READY_FOR_IN]: 'Finger removed — insert finger to start replay.',
    [REPLAY_PHASE.REPLAYING]: 'Finger in — replay running.',
  }[phase]

  return (
    <div className="space-y-3 border border-hud-line/60 p-3">
      <div className="flex gap-2 flex-wrap">
        {!connected
          ? <button type="button" className={btnClass} onClick={connect} disabled={disabled}>Connect Uno</button>
          : <button type="button" className={btnClass} onClick={() => disconnect('Disconnected.')}>Disconnect</button>}
        <button type="button" className={btnClass} onClick={arm} disabled={disabled || !connected || !candidate || loadingCandidate || phase !== REPLAY_PHASE.DISARMED}>
          {loadingCandidate ? 'Preparing demo segment…' : 'Arm for finger insertion'}
        </button>
        {phase !== REPLAY_PHASE.DISARMED && <button type="button" className={btnClass} onClick={() => cancelPendingReplay('Cancelled by user.')}>Cancel</button>}
      </div>
      <p role="status" className="font-mono text-[10px] text-hud-cyan uppercase tracking-wide">
        {connected ? 'Connected.' : 'Not connected.'} {fingerStatus}
      </p>
      <p role="status" className="font-mono text-[10px] text-hud-ink3 uppercase tracking-wide">{status}</p>
      {phase === REPLAY_PHASE.REPLAYING && armedSegment && (
        <div className="space-y-1">
          <p className="font-mono text-xs text-tier-amber bg-tier-amber/10 border border-tier-amber/30 px-2 py-1.5 font-bold uppercase tracking-wide">
            PPG replay ({countdown.toFixed(1)}s remaining)
          </p>
          <WaveformView samples={armedSegment.data.samples} count={revealCount} />
        </div>
      )}
      {submitting && <p role="status" className="font-mono text-xs text-hud-cyan uppercase tracking-widest animate-pulse">Sending replay to the ML service…</p>}
      {error && <p role="alert" className="font-mono text-xs text-tier-red bg-tier-red/10 border border-tier-red/30 px-3 py-2">{error}</p>}
      {candidateError && !candidate && <p role="alert" className="font-mono text-xs text-tier-red bg-tier-red/10 border border-tier-red/30 px-3 py-2">{candidateError}</p>}

      <details className="nc-more">
        <summary>Demo details</summary>
        {activeSegment ? (
          <p className="font-mono text-[10px] text-hud-ink3">
            Segment: {activeSegment.label || activeSegment.file} ({activeSegment.file})
          </p>
        ) : <p className="font-mono text-[10px] text-hud-ink3">No segment staged yet.</p>}
      </details>
      <details className="nc-more">
        <summary>Troubleshooting &amp; requirements</summary>
        <p className="text-[10px] text-hud-ink3 font-mono uppercase tracking-wide leading-relaxed">
          Close the Arduino Serial Monitor/Plotter and the Python bridge (hardware/uno_replay_bridge.py) before
          connecting — only one program can use the serial port at a time. Web Serial requires desktop
          Chrome or Edge; it is not available on mobile browsers or Firefox/Safari.
        </p>
      </details>
    </div>
  )
}
