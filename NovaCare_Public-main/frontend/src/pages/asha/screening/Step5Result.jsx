import { useState, useEffect } from 'react'
import { useToast } from '../../../context/ToastContext'
import { useLang } from '../../../context/LanguageContext'
import { useT } from '../../../i18n/useT'
import { getResult } from '../../../api/sessions'
import RiskCard from '../../../components/ui/RiskCard'
import Button from '../../../components/ui/Button'
import Skeleton from '../../../components/ui/Skeleton'

export default function Step5Result({ sessionId, onNext }) {
  const { toast } = useToast()
  const { lang } = useLang()
  const t = useT()

  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    getResult(sessionId, lang)
      .then(res => setResult(res.data))
      .catch(err => {
        const msg =
          err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message ||
          t('result_fail')
        setLoadError(msg)
        toast(msg, 'error')
      })
      .finally(() => setLoading(false))
  }, [sessionId, lang])

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40" />
      <Skeleton className="h-20" />
      <p className="text-center text-xs text-hud-ink3 animate-pulse">{t('result_title')}…</p>
    </div>
  )

  if (loadError) return (
    <div className="text-center py-10 space-y-4">
      <p className="text-red-500 text-sm">{loadError}</p>
      <Button onClick={() => { setLoading(true); setLoadError(null) }} variant="outline">
        Retry
      </Button>
      <Button onClick={() => onNext({})} variant="ghost" className="block mx-auto mt-2">
        {t('result_continue')}
      </Button>
    </div>
  )

  if (!result) return (
    <div className="text-center py-10 text-hud-ink3">
      <p>{t('result_no_result')}</p>
      <Button onClick={() => onNext({})} variant="primary" className="mt-4">
        {t('result_continue')}
      </Button>
    </div>
  )

  const tier = result.risk_tier || result.tier
  const score = result.risk_score ?? result.composite_score ?? result.score

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-hud-ink">{t('result_title')}</h2>
        <p className="text-hud-ink3 text-sm mt-1">{t('result_subtitle')}</p>
      </div>

      <RiskCard
        tier={tier}
        score={score}
        headline={result.headline}
        explanation={result.explanation || result.summary}
        action={result.action_text || result.action || result.recommendation}
      />

      {/* Component score breakdown */}
      {(result.component_breakdown || result.components) && (
        <div className="bg-hud-bg rounded-none p-5 space-y-3">
          <h3 className="font-semibold text-hud-ink2 text-sm">{t('result_breakdown')}</h3>
          <div className="space-y-2">
            {Object.entries(result.component_breakdown || result.components).map(([key, val]) => {
              const pct = Math.min(100, Math.abs(typeof val === 'number' ? val : 0))
              return (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-hud-ink2 capitalize">{key.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-nova rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-hud-ink2 font-medium w-10 text-right">
                      {typeof val === 'number' ? val.toFixed(2) : val}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Prediabetes trajectory */}
      {result.prediabetes_trajectory && (
        <div className={`rounded-none p-4 border text-sm space-y-1 ${
          result.prediabetes_trajectory.label === 'high_risk'
            ? 'bg-red-50 border-red-200 text-red-700'
            : result.prediabetes_trajectory.label === 'rising'
            ? 'bg-amber-50 border-amber-200 text-amber-700'
            : 'bg-green-50 border-green-200 text-green-700'
        }`}>
          <p className="font-semibold capitalize">
            Trajectory: {result.prediabetes_trajectory.label.replace(/_/g, ' ')}
          </p>
          {result.prediabetes_trajectory.drivers?.length > 0 && (
            <ul className="list-disc list-inside text-xs space-y-0.5">
              {result.prediabetes_trajectory.drivers.map((d, i) => <li key={i}>{d}</li>)}
            </ul>
          )}
        </div>
      )}

      {result.followup_days != null && (
        <div className="bg-blue-50 border border-blue-200 rounded-none p-4 text-sm text-blue-700">
          <p className="font-semibold">📅 {t('result_followup')}</p>
          <p>{t('result_followup_days', result.followup_days)}</p>
        </div>
      )}

      <Button onClick={() => onNext({ result })} variant="primary" size="lg" className="w-full">
        {t('result_view_report')}
      </Button>
    </div>
  )
}
