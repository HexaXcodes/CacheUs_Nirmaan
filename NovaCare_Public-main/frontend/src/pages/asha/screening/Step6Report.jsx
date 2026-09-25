import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../../context/ToastContext'
import { useLang } from '../../../context/LanguageContext'
import { getReport } from '../../../api/sessions'
import { completeFollowup } from '../../../api/followup'
import Button from '../../../components/ui/Button'
import Skeleton from '../../../components/ui/Skeleton'

export default function Step6Report({ sessionId, patientId }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { lang } = useLang()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [marked, setMarked] = useState(false)

  useEffect(() => {
    getReport(sessionId, lang)
      .then(res => setReport(res.data))
      .catch(err => toast(err.response?.data?.detail || 'Failed to load report', 'error'))
      .finally(() => setLoading(false))
  }, [sessionId, lang])

  const handleMarkFollowup = async () => {
    setMarking(true)
    try {
      await completeFollowup({ session_id: sessionId, patient_id: patientId })
      toast('Follow-up marked as complete!', 'success')
      setMarked(true)
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to mark follow-up', 'error')
    } finally {
      setMarking(false)
    }
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-64" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-hud-ink">Full Report</h2>
        {report?.generated_at && (
          <span className="text-xs text-hud-ink3">
            {new Date(report.generated_at).toLocaleDateString()}
          </span>
        )}
      </div>

      {report ? (
        <div className="space-y-4">
          {/* Report header */}
          <div className="bg-hud-surface border border-hud-line2/40 rounded-none p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-hud-ink">{report.patient_name || 'Patient'}</p>
                <p className="text-sm text-hud-ink3">{report.patient_age} yrs · {report.village_code}</p>
              </div>
              <div className={`px-4 py-2 rounded-none font-bold text-sm
                ${(report.risk_tier || '').toUpperCase() === 'RED' ? 'bg-red-100 text-red-700' :
                  (report.risk_tier || '').toUpperCase() === 'AMBER' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'}`}>
                {(report.risk_tier || 'Unknown').toUpperCase()} RISK
              </div>
            </div>

            {report.summary && (
              <div className="bg-hud-bg rounded-none p-4">
                <p className="text-sm text-hud-ink2 leading-relaxed">{report.summary}</p>
              </div>
            )}
          </div>

          {/* Sections */}
          {report.sections && report.sections.map((section, i) => (
            <div key={i} className="bg-hud-surface border border-hud-line2/40 rounded-none p-5 space-y-2">
              <h3 className="font-semibold text-gray-800">{section.title}</h3>
              <p className="text-sm text-hud-ink2 leading-relaxed">{section.content}</p>
            </div>
          ))}

          {/* Diet advice */}
          {report.diet_advice && (
            <div className="bg-green-50 border border-green-200 rounded-none p-5">
              <h3 className="font-semibold text-green-800 mb-2">🥗 Diet Advice</h3>
              <p className="text-sm text-green-700 leading-relaxed">{report.diet_advice}</p>
            </div>
          )}

          {/* Recommendation */}
          {report.recommendation && (
            <div className="bg-blue-50 border border-blue-200 rounded-none p-5">
              <h3 className="font-semibold text-blue-800 mb-2">📋 Recommended Actions</h3>
              <p className="text-sm text-blue-700 leading-relaxed">{report.recommendation}</p>
            </div>
          )}

          {/* Followup */}
          {report.followup_date && (
            <div className="bg-amber-50 border border-amber-200 rounded-none p-5">
              <h3 className="font-semibold text-amber-800 mb-1">📅 Next Follow-up</h3>
              <p className="text-amber-700">{new Date(report.followup_date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-hud-bg rounded-none p-8 text-center text-hud-ink3">
          Report could not be generated. The session data has been saved.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-3">
        {!marked && (
          <Button
            onClick={handleMarkFollowup}
            variant="success"
            loading={marking}
            className="w-full"
          >
            ✅ Mark Follow-up Complete
          </Button>
        )}
        {marked && (
          <div className="text-center text-green-600 font-semibold py-2">
            ✓ Follow-up marked as complete
          </div>
        )}
        <Button
          onClick={() => navigate('/asha')}
          variant="outline"
          className="w-full"
        >
          ← Back to Dashboard
        </Button>
        {patientId && (
          <Button
            onClick={() => navigate(`/asha/patient/${patientId}`)}
            variant="ghost"
            className="w-full"
          >
            View Patient Profile
          </Button>
        )}
      </div>
    </div>
  )
}
