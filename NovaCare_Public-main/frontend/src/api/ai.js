import client from './client'

export const analyzeVoice = (audioBlob) => {
  // Use the extension hint attached by AudioRecorder so the server writes
  // the correct temp-file suffix and librosa picks the right decoder.
  const ext = audioBlob._ext || '.webm'
  const form = new FormData()
  form.append('file', audioBlob, `audio${ext}`)
  return client.post('/ai/voice-triage/analyze', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

// processVideo kept for backward-compat but Step4RPPG now uses processSignal
export const processVideo = (blob, algorithm = 'pos') => {
  const form = new FormData()
  form.append('file', blob, 'video.webm')
  return client.post('/ai/rppg/process-video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: { algorithm },
    timeout: 120000,
  })
}

export const processSignal = (signal, fps, algorithm = 'pos') =>
  client.post('/ai/rppg/process-signal', { signal, fps, algorithm }, { timeout: 30000 })

export const aiHealth = () => client.get('/ai/health')
