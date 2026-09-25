import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getPatientHistory } from '../../api/patients'
import Skeleton from '../../components/ui/Skeleton'

export default function ScreeningHistory() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  const patientId = user?.patient_id

  useEffect(() => {
    if (!patientId) {
      setLoading(false)
      return
    }
    getPatientHistory(patientId)
      .then(res => {
        setHistory(res.data?.sessions || res.data || [])
      })
      .catch(() => {
        toast('Failed to load clinical screening logs', 'error')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [patientId])

  const getTierColor = (tier) => {
    const t = (tier || '').toUpperCase()
    if (t === 'RED') return 'text-tier-red border-tier-red/40 bg-tier-red/5 shadow-glow-r'
    if (t === 'AMBER') return 'text-tier-amber border-tier-amber/40 bg-tier-amber/5 shadow-glow-a'
    return 'text-tier-green border-tier-green/40 bg-tier-green/5 shadow-glow-g'
  }

  const getTierBadge = (tier) => {
    const t = (tier || '').toUpperCase()
    if (t === 'RED') return 'RED REFERRAL'
    if (t === 'AMBER') return 'AMBER MONITOR'
    return 'GREEN STABLE'
  }

  return (
    <div className="px-4 py-6 space-y-5">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-hud-ink flex items-center gap-2 uppercase tracking-widest">
          Clinical History Ledger
        </h1>
        <p className="text-hud-ink3 text-xs mt-1 uppercase tracking-wider">
          Diagnostic logs & composite risk recordings
        </p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-28 w-full bg-hud-surface" />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-hud-line/80 p-8 text-center text-hud-ink3">
          <p className="font-bold text-hud-ink text-sm uppercase tracking-wider">
            Your health timeline will appear here
          </p>
          <p className="text-xs mt-1.5 uppercase font-mono leading-relaxed">
            No diagnostic sessions found on this node. Consult your local ASHA worker to run NCD screenings.
          </p>
        </div>
      ) : (
        <div className="space-y-5 relative pl-4 border-l border-hud-line/60 py-2">
          {history.map((s, idx) => {
            const date = s.created_at
              ? new Date(s.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : 'Unknown Date'
            const tier = s.risk_tier || 'GREEN'
            
            return (
              <div key={s.id || s.session_id || idx} className="relative bg-[#FFFFFF] border border-hud-line/85 p-4 group hover:border-hud-cyan transition-colors">
                {/* Timeline node marker */}
                <span className="absolute -left-[22.5px] top-5 w-3 h-3 bg-[#F5F9FF] border-2 border-hud-cyan rotate-45 z-10 shrink-0 shadow-glow" />
                
                {/* Corner highlights */}
                <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-hud-cyan opacity-40 group-hover:opacity-100" />
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-hud-cyan opacity-40 group-hover:opacity-100" />

                <div className="flex justify-between items-start gap-3">
                  <div>
                    <span className="font-mono text-[9px] text-hud-ink3 font-bold block mb-1">
                      SESSION ID: {s.session_id?.substring(0, 10).toUpperCase() || 'NODE_SESSION'}
                    </span>
                    <h3 className="font-mono text-[10px] text-hud-ink uppercase tracking-wider font-bold">
                      ASHA worker: {s.asha_name || s.asha_id || 'Health Node Staff'}
                    </h3>
                    <p className="text-[11px] text-hud-ink3 mt-1 leading-relaxed">
                      {s.explanation || 'Complete NCD health screening, cardiac HRV pulse triage, and vocal stress vectoring analysis.'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="block font-mono text-[11px] text-hud-cyan font-bold leading-none">
                      {date}
                    </span>
                    
                    {/* Risk Tier Badge */}
                    <div className={`mt-2 border px-2 py-0.5 font-mono text-[8px] font-black tracking-widest text-center select-none ${getTierColor(tier)}`}>
                      {getTierBadge(tier)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2.5 border-t border-hud-line/45 flex justify-between items-center">
                  <div className="text-[9px] text-hud-ink3 uppercase font-mono font-bold">
                    Cardiac HRV status: {s.rppg_hrv_flag || s.hrv_flag ? 'ABNORMAL_DETECTED' : 'NORMAL'}
                  </div>
                  
                  <button
                    onClick={() => navigate(`/patient/report/${s.session_id || s.id}`)}
                    className="border border-hud-cyan text-hud-cyan font-mono text-[9px] px-3 py-1.5 hover:bg-hud-cyan/15 hover:shadow-glow transition-all tracking-wider font-bold uppercase rounded-none"
                  >
                    View diagnostic report
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
