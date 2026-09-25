import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { getPatient, getPatientHistory } from '../../api/patients'
import PortalShell from '../../components/layout/PortalShell'
import Skeleton from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'

const TIER_STYLES = {
  RED: 'bg-tier-red/10 text-tier-red border-tier-red/30',
  AMBER: 'bg-tier-amber/10 text-tier-amber border-tier-amber/30',
  GREEN: 'bg-tier-green/10 text-tier-green border-tier-green/30',
}

const TIER_EMOJI = { RED: '🔴', AMBER: '🟡', GREEN: '🟢' }

export default function PatientProfile() {
  const { patientId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [patient, setPatient] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [pRes, hRes] = await Promise.allSettled([
          getPatient(patientId),
          getPatientHistory(patientId),
        ])
        if (pRes.status === 'fulfilled') setPatient(pRes.value.data)
        else toast('Failed to load patient', 'error')
        if (hRes.status === 'fulfilled') setHistory(hRes.value.data?.sessions || hRes.value.data || [])
      } catch {
        toast('Error loading patient data', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [patientId])

  const latest = history[0]
  const latestTier = (latest?.risk_tier || '').toUpperCase()

  return (
    <PortalShell>
      <div className="max-w-xl mx-auto px-4 py-6 space-y-5">
        {/* Patient Card */}
        {loading ? (
          <Skeleton className="h-40" />
        ) : patient ? (
          <div className="bg-hud-surface rounded-none shadow-none p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-hud-ink">{patient.name}</h1>
                <p className="text-hud-ink3 text-sm mt-1">
                  {patient.age} yrs · {patient.sex} · {patient.village_code}
                </p>
                <p className="text-hud-ink3 text-xs mt-0.5">{patient.phone}</p>
              </div>
              {latestTier && (
                <span className={`border px-3 py-1 rounded-full text-sm font-semibold ${TIER_STYLES[latestTier] || ''}`}>
                  {TIER_EMOJI[latestTier]} {latestTier}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-hud-bg rounded-none p-3">
                <p className="text-hud-ink3 text-xs">Waist</p>
                <p className="font-semibold">{patient.waist_cm || '—'} cm</p>
              </div>
              <div className="bg-hud-bg rounded-none p-3">
                <p className="text-hud-ink3 text-xs">Family History</p>
                <p className="font-semibold">{patient.family_history ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-hud-bg rounded-none p-3">
                <p className="text-hud-ink3 text-xs">Occupation Change</p>
                <p className="font-semibold">{patient.occupation_transition ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-hud-bg rounded-none p-3">
                <p className="text-hud-ink3 text-xs">Language</p>
                <p className="font-semibold capitalize">{patient.preferred_lang || 'en'}</p>
              </div>
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => navigate(`/asha/screening/${patientId}`)}
                variant="primary"
                className="flex-1"
              >
                New Screening
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-hud-surface rounded-none p-8 text-center text-hud-ink3">Patient not found</div>
        )}

        {/* Session History */}
        <div className="bg-hud-surface rounded-none shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-hud-line/60">
            <h2 className="font-bold text-hud-ink">Screening History</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : history.length === 0 ? (
            <p className="text-center text-hud-ink3 py-10 text-sm">No screening sessions yet</p>
          ) : (
            <div className="relative">
              {/* Timeline */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-hud-bg2" />
              <div className="divide-y divide-hud-line/30">
                {history.map((s, i) => {
                  const tier = (s.risk_tier || '').toUpperCase()
                  return (
                    <div key={s.session_id || s.id || i} className="px-5 py-4 flex items-start gap-4">
                      <div className={`relative z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm shrink-0 mt-0.5
                        ${tier === 'RED' ? 'bg-tier-red/10 border-tier-red/40' :
                          tier === 'AMBER' ? 'bg-tier-amber/10 border-tier-amber/40' :
                            'bg-tier-green/10 border-tier-green/40'}`}>
                        {TIER_EMOJI[tier] || '⚪'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-hud-ink text-sm">
                            {tier || 'Completed'} Risk
                          </p>
                          <span className="text-xs text-hud-ink3">
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                          </span>
                        </div>
                        {s.risk_score != null && (
                          <p className="text-xs text-hud-ink3 mt-0.5">Score: {Math.round(s.risk_score)}/100</p>
                        )}
                        {s.idrs_score != null && (
                          <p className="text-xs text-hud-ink3">IDRS: {s.idrs_score}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </PortalShell>
  )
}
