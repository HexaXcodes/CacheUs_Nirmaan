import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { useLang } from '../../context/LanguageContext'
import { getReport } from '../../api/sessions'
import { generateTts } from '../../api/i18n'
import Navbar from '../../components/layout/Navbar'
import Skeleton from '../../components/ui/Skeleton'
import RiskCard from '../../components/ui/RiskCard'
import Button from '../../components/ui/Button'

export default function PatientReport() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { lang, changeLang, LANGS } = useLang()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ttsLoading, setTtsLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    getReport(sessionId, lang)
      .then(res => setReport(res.data))
      .catch(err => toast(err.response?.data?.detail || 'Failed to load report', 'error'))
      .finally(() => setLoading(false))
  }, [sessionId, lang])

  const handleTts = async (text) => {
    setTtsLoading(true)
    try {
      const res = await generateTts(text, lang)
      if (res.data?.audio_url) {
        const audio = new Audio(res.data.audio_url)
        audio.play()
      } else if (res.data?.audio_base64) {
        const src = `data:audio/wav;base64,${res.data.audio_base64}`
        const audio = new Audio(src)
        audio.play()
      } else {
        toast('TTS not available for this content', 'warning')
      }
    } catch {
      toast('Text-to-speech failed', 'error')
    } finally {
      setTtsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-hud-bg">
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-hud-ink">Health Report</h1>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={e => changeLang(e.target.value)}
              className="border border-hud-line2/40 rounded-none px-2 py-1 text-xs bg-hud-surface"
            >
              {Object.entries(LANGS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-36" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : report ? (
          <div className="space-y-4">
            {/* Patient info */}
            <div className="bg-hud-surface rounded-none p-5 shadow-none">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-hud-ink">{report.patient_name || 'Patient'}</p>
                  <p className="text-sm text-hud-ink3">
                    {report.patient_age} yrs · {report.village_code}
                  </p>
                </div>
                {report.generated_at && (
                  <p className="text-xs text-hud-ink3">
                    {new Date(report.generated_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            {/* Risk card */}
            <RiskCard
              tier={report.risk_tier || report.tier}
              score={report.risk_score || report.score}
              headline={report.headline}
              explanation={report.summary || report.explanation}
              action={report.recommendation}
            />

            {/* TTS button for summary */}
            {report.summary && (
              <div className="flex justify-end">
                <Button
                  onClick={() => handleTts(report.summary)}
                  variant="ghost"
                  size="sm"
                  loading={ttsLoading}
                >
                  🔊 Listen
                </Button>
              </div>
            )}

            {/* Report sections */}
            {report.sections && report.sections.map((s, i) => (
              <div key={i} className="bg-hud-surface rounded-none p-5 shadow-none space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">{s.title}</h3>
                  <Button
                    onClick={() => handleTts(s.content)}
                    variant="ghost"
                    size="sm"
                    loading={ttsLoading}
                    className="text-xs"
                  >
                    🔊
                  </Button>
                </div>
                <p className="text-sm text-hud-ink2 leading-relaxed">{s.content}</p>
              </div>
            ))}

            {/* Diet advice */}
            {report.diet_advice && (
              <div className="bg-green-50 border border-green-200 rounded-none p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-green-800">🥗 Diet Advice</h3>
                  <Button onClick={() => handleTts(report.diet_advice)} variant="ghost" size="sm" loading={ttsLoading}>
                    🔊
                  </Button>
                </div>
                <p className="text-sm text-green-700 leading-relaxed">{report.diet_advice}</p>
              </div>
            )}

            {/* Follow-up */}
            {report.followup_date && (
              <div className="bg-amber-50 border border-amber-200 rounded-none p-5">
                <h3 className="font-semibold text-amber-800 mb-1">📅 Next Follow-up</h3>
                <p className="text-amber-700">
                  {new Date(report.followup_date).toLocaleDateString('en-IN', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </p>
              </div>
            )}

            <Button onClick={() => navigate('/patient')} variant="outline" className="w-full">
              ← Back to Dashboard
            </Button>
          </div>
        ) : (
          <div className="bg-hud-surface rounded-none p-10 text-center text-hud-ink3">
            <p className="text-4xl mb-3">📄</p>
            <p className="font-medium">Report not available</p>
            <Button onClick={() => navigate('/patient')} variant="ghost" className="mt-4">
              ← Back
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
