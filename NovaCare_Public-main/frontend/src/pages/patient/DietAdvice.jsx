import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { useLang } from '../../context/LanguageContext'
import { getDietAdvice } from '../../api/diet'
import { generateTts } from '../../api/i18n'
import Skeleton from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'

export default function DietAdvice() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { lang, changeLang, LANGS } = useLang()

  const [advice, setAdvice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ttsLoading, setTtsLoading] = useState(null) // index of item playing

  const patientId = user?.patient_id

  useEffect(() => {
    if (!patientId) { setLoading(false); return }
    setLoading(true)
    getDietAdvice(patientId, lang)
      .then(res => setAdvice(res.data))
      .catch(err => toast(err.response?.data?.detail || 'Failed to load diet advice', 'error'))
      .finally(() => setLoading(false))
  }, [patientId, lang])

  const handleTts = async (text, idx) => {
    setTtsLoading(idx)
    try {
      const res = await generateTts(text, lang)
      if (res.data?.audio_url) {
        new Audio(res.data.audio_url).play()
      } else if (res.data?.audio_base64) {
        new Audio(`data:audio/wav;base64,${res.data.audio_base64}`).play()
      } else {
        toast('TTS not available', 'warning')
      }
    } catch {
      toast('Text-to-speech failed', 'error')
    } finally {
      setTtsLoading(null)
    }
  }

  const tips = advice?.tips || advice?.weekly_tips || []
  const swaps = advice?.food_swaps || advice?.swaps || []

  return (
    <div className="px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-hud-ink">🥗 Diet Advice</h1>
            <p className="text-hud-ink3 text-sm mt-0.5">Personalized for your health status</p>
          </div>
          <select
            value={lang}
            onChange={e => changeLang(e.target.value)}
            className="border border-hud-line2/40 rounded-none px-2 py-1 text-xs bg-hud-surface"
          >
            {Object.entries(LANGS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
        ) : !patientId ? (
          <div className="bg-amber-50 border border-amber-200 rounded-none p-6 text-center text-amber-700">
            <p className="font-semibold">No patient profile found</p>
            <p className="text-sm mt-1">Please contact your ASHA worker</p>
          </div>
        ) : (
          <>
            {/* Weekly tips */}
            {tips.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-hud-ink2">Weekly Nutrition Tips</h2>
                {tips.map((tip, i) => {
                  const text = typeof tip === 'string' ? tip : tip.tip || tip.text || ''
                  const title = typeof tip === 'object' ? tip.title : null
                  return (
                    <div key={i} className="bg-hud-surface rounded-none p-4 shadow-none border border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {title && <p className="font-semibold text-gray-800 text-sm mb-1">{title}</p>}
                          <p className="text-sm text-hud-ink2 leading-relaxed">{text}</p>
                        </div>
                        <Button
                          onClick={() => handleTts(text, i)}
                          variant="ghost"
                          size="sm"
                          loading={ttsLoading === i}
                          className="shrink-0 text-hud-ink3"
                        >
                          🔊
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Food swaps */}
            {swaps.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-semibold text-hud-ink2">Food Swap Suggestions</h2>
                {swaps.map((swap, i) => {
                  const from = typeof swap === 'object' ? (swap.from || swap.avoid || '') : ''
                  const to = typeof swap === 'object' ? (swap.to || swap.prefer || '') : swap
                  const reason = typeof swap === 'object' ? swap.reason : null
                  return (
                    <div key={i} className="bg-hud-surface rounded-none p-4 shadow-none border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="bg-red-50 rounded-none p-3 text-center">
                            <p className="text-xs text-red-400 mb-1">Avoid</p>
                            <p className="text-sm font-semibold text-red-700">{from || '—'}</p>
                          </div>
                          <div className="bg-green-50 rounded-none p-3 text-center">
                            <p className="text-xs text-green-400 mb-1">Prefer</p>
                            <p className="text-sm font-semibold text-green-700">{to}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleTts(`Replace ${from} with ${to}. ${reason || ''}`, 100 + i)}
                          variant="ghost"
                          size="sm"
                          loading={ttsLoading === 100 + i}
                          className="text-hud-ink3"
                        >
                          🔊
                        </Button>
                      </div>
                      {reason && <p className="text-xs text-hud-ink3 mt-2 px-1">{reason}</p>}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Fallback */}
            {tips.length === 0 && swaps.length === 0 && (
              <div className="bg-hud-surface rounded-none p-10 text-center text-hud-ink3 shadow-none">
                <p className="text-4xl mb-3">🥗</p>
                <p className="font-medium">No diet advice available yet</p>
                <p className="text-sm mt-1">Complete a screening to get personalized advice</p>
              </div>
            )}

            {/* General advice */}
            {advice?.general && (
              <div className="bg-green-50 border border-green-200 rounded-none p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800 mb-2">General Guidelines</h3>
                    <p className="text-sm text-green-700 leading-relaxed">{advice.general}</p>
                  </div>
                  <Button onClick={() => handleTts(advice.general, 999)} variant="ghost" size="sm" loading={ttsLoading === 999}>
                    🔊
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
  )
}
