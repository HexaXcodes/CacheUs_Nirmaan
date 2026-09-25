import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button'

// Maps MediaRecorder MIME type to a file extension the voice service can decode.
function mimeToExt(mimeType) {
  if (!mimeType) return '.wav'
  if (mimeType.includes('ogg')) return '.ogg'
  if (mimeType.includes('mp4')) return '.mp4'
  if (mimeType.includes('webm')) return '.webm'
  return '.wav'
}

export default function AudioRecorder({ onResult, disabled }) {
  const [state, setState] = useState('idle') // idle | recording | recorded
  const [seconds, setSeconds] = useState(0)
  const [error, setError] = useState(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const mimeRef = useRef('audio/webm')
  const timerRef = useRef(null)
  const fileRef = useRef(null)

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const start = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Pick the best supported MIME type
      const preferred = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg',
        'audio/mp4',
      ]
      const mimeType = preferred.find(m => MediaRecorder.isTypeSupported(m)) || ''
      mimeRef.current = mimeType || 'audio/webm'

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        // Use the actual recorded MIME type — NOT hardcoded 'audio/wav'
        const actualMime = mr.mimeType || mimeRef.current
        const b = new Blob(chunksRef.current, { type: actualMime })
        // Attach the extension so the voice service writes the correct temp file suffix
        b._ext = mimeToExt(actualMime)
        onResult && onResult(b)
        setState('recorded')
      }

      mr.start(100)
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000)
    } catch (err) {
      const msg = 'Microphone permission denied. Please allow microphone access or upload an audio file.'
      setError(msg)
      fileRef.current?.click()
    }
  }

  const stop = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
    clearInterval(timerRef.current)
  }

  const reset = () => {
    setError(null)
    onResult && onResult(null)
    setState('idle')
    setSeconds(0)
  }

  const onFileUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    // Attach extension hint from the file's actual type
    f._ext = mimeToExt(f.type) || mimeToExt(f.name.split('.').pop())
    onResult && onResult(f)
    setState('recorded')
  }

  useEffect(() => () => clearInterval(timerRef.current), [])

  return (
    <div className="space-y-4">
      {/* Animated waveform */}
      <div className="flex items-end justify-center gap-1 h-16 bg-gray-50 rounded-xl p-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 rounded-full transition-all duration-150 ${state === 'recording' ? 'bg-red-400' : 'bg-gray-300'}`}
            style={{
              height: state === 'recording' ? `${20 + ((i * 37 + Date.now() / 100) % 60)}%` : '20%',
            }}
          />
        ))}
      </div>

      <div className="text-center text-2xl font-mono text-gray-600">{fmt(seconds)}</div>

      {error && (
        <p className="text-sm text-red-500 text-center">{error}</p>
      )}

      <div className="flex gap-3 justify-center flex-wrap">
        {state === 'idle' && (
          <>
            <Button onClick={start} variant="danger" size="lg" disabled={disabled}>
              🎙 Start Recording
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" disabled={disabled}>
              📁 Upload Audio
            </Button>
          </>
        )}
        {state === 'recording' && (
          <Button onClick={stop} variant="outline" size="lg">
            ⏹ Stop Recording
          </Button>
        )}
        {state === 'recorded' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-green-600 font-semibold">✓ Recording ready ({fmt(seconds)})</div>
            <Button onClick={reset} variant="ghost" size="sm">🔄 Re-record</Button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={onFileUpload} />
    </div>
  )
}
