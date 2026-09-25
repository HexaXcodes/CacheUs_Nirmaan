import { useState, useRef, useEffect } from 'react'
import Button from '../ui/Button'

export default function VideoRecorder({ onResult, disabled }) {
  const [state, setState] = useState('idle') // idle | recording | recorded
  const [seconds, setSeconds] = useState(0)
  const videoRef = useRef(null)
  const mediaRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  const streamRef = useRef(null)
  const fileRef = useRef(null)

  const MAX = 30
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  const stopRecording = () => {
    if (mediaRef.current && mediaRef.current.state !== 'inactive') {
      mediaRef.current.stop()
    }
    clearInterval(timerRef.current)
  }

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
        : 'video/webm'

      const mr = new MediaRecorder(stream, { mimeType })
      mediaRef.current = mr
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const b = new Blob(chunksRef.current, { type: 'video/webm' })
        if (videoRef.current) {
          videoRef.current.srcObject = null
          videoRef.current.src = URL.createObjectURL(b)
          videoRef.current.controls = true
        }
        onResult && onResult(b)
        setState('recorded')
      }
      mr.start(100)
      setState('recording')
      setSeconds(0)
      timerRef.current = setInterval(() => {
        setSeconds(s => {
          if (s + 1 >= MAX) {
            stopRecording()
            return s + 1
          }
          return s + 1
        })
      }, 1000)
    } catch {
      alert('Camera permission denied. Please allow camera access or upload a video file.')
      fileRef.current?.click()
    }
  }

  const reset = () => {
    setState('idle')
    setSeconds(0)
    if (videoRef.current) {
      videoRef.current.src = ''
      videoRef.current.srcObject = null
      videoRef.current.controls = false
    }
    onResult && onResult(null)
  }

  const onFileUpload = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    onResult && onResult(f)
    setState('recorded')
    if (videoRef.current) {
      videoRef.current.src = URL.createObjectURL(f)
      videoRef.current.controls = true
    }
  }

  useEffect(() => () => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [])

  return (
    <div className="space-y-4">
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video max-h-64">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {state === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center text-white text-4xl">📷</div>
        )}
        {state === 'recording' && (
          <div className="absolute top-3 right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold animate-pulse">
            ● REC {fmt(seconds)} / {fmt(MAX)}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-center flex-wrap">
        {state === 'idle' && (
          <>
            <Button onClick={start} variant="primary" size="lg" disabled={disabled}>
              📹 Start Recording
            </Button>
            <Button onClick={() => fileRef.current?.click()} variant="outline" disabled={disabled}>
              📁 Upload Video
            </Button>
          </>
        )}
        {state === 'recording' && (
          <Button onClick={stopRecording} variant="outline" size="lg">
            ⏹ Stop ({MAX - seconds}s left)
          </Button>
        )}
        {state === 'recorded' && (
          <div className="flex flex-col items-center gap-2">
            <div className="text-green-600 font-semibold">✓ Video recorded ({fmt(seconds)}s)</div>
            <Button onClick={reset} variant="ghost" size="sm">🔄 Retake</Button>
          </div>
        )}
      </div>

      <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={onFileUpload} />
    </div>
  )
}
