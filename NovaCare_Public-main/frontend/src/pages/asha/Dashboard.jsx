import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getFollowupDue } from '../../api/followup'
import { getCampaigns } from '../../api/campaigns'
import Navbar from '../../components/layout/Navbar'
import Skeleton from '../../components/ui/Skeleton'
import Button from '../../components/ui/Button'

const TIER_COLORS = {
  RED: 'bg-red-100 border-red-300 text-red-700',
  AMBER: 'bg-amber-100 border-amber-300 text-amber-700',
  GREEN: 'bg-green-100 border-green-300 text-green-700',
}

const TIER_EMOJI = { RED: '🔴', AMBER: '🟡', GREEN: '🟢' }

export default function AshaaDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [due, setDue] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dueRes, campRes] = await Promise.allSettled([
          getFollowupDue(),
          getCampaigns(user?.district),
        ])
        if (dueRes.status === 'fulfilled') setDue(dueRes.value.data?.due || dueRes.value.data || [])
        if (campRes.status === 'fulfilled') setCampaigns(campRes.value.data?.campaigns || campRes.value.data || [])
      } catch (err) {
        toast('Failed to load dashboard data', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const redPatients = due.filter(p => (p.risk_tier || p.tier || '').toUpperCase() === 'RED')
  const amberPatients = due.filter(p => (p.risk_tier || p.tier || '').toUpperCase() === 'AMBER')
  const dueToday = due.filter(p => {
    if (!p.followup_date) return false
    const d = new Date(p.followup_date)
    const today = new Date()
    return d.toDateString() === today.toDateString()
  })

  return (
    <div className="min-h-screen bg-hud-bg">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome */}
        <div className="bg-hud-surface rounded-none p-5 shadow-none">
          <h1 className="text-xl font-bold text-hud-ink">
            Welcome, {user?.name || 'ASHA Worker'}
          </h1>
          <p className="text-hud-ink3 text-sm mt-1">
            {user?.district ? `District: ${user.district}` : 'NovaCare ASHA Dashboard'}
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => navigate('/asha/new-patient')}
            variant="success"
            className="w-full flex-col h-20 text-sm"
          >
            <span className="text-2xl"> </span>
            Register Patient
          </Button>
          <Button
            onClick={() => navigate('/asha/screening')}
            variant="primary"
            className="w-full flex-col h-20 text-sm"
          >
            <span className="text-2xl"> </span>
            New Screening
          </Button>
        </div>

        {/* Summary Cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 border border-red-200 rounded-none p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{redPatients.length}</div>
              <div className="text-xs text-red-500 mt-1">🔴 High Risk</div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-none p-4 text-center">
              <div className="text-2xl font-bold text-amber-600">{amberPatients.length}</div>
              <div className="text-xs text-amber-500 mt-1">🟡 Medium Risk</div>
            </div>
            <div className="000000 border border-blue-200 rounded-none p-4 text-center">
              <div className="text-2xl font-bold text-nova">{dueToday.length}</div>
              <div className="text-xs text-nova mt-1"> Due Today</div>
            </div>
          </div>
        )}

        {/* HIGH RISK patients */}
        <div className="bg-hud-surface rounded-none shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-red-600">🔴 High Risk Follow-ups</h2>
            <span className="bg-red-100 text-red-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {redPatients.length}
            </span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : redPatients.length === 0 ? (
            <p className="text-center text-hud-ink3 py-8 text-sm">No high-risk patients due</p>
          ) : (
            <div className="divide-y">
              {redPatients.map(p => (
                <div
                  key={p.patient_id || p.id}
                  className="px-5 py-4 flex items-center justify-between hover:bg-red-50 cursor-pointer transition"
                  onClick={() => navigate(`/asha/patient/${p.patient_id || p.id}`)}
                >
                  <div>
                    <p className="font-semibold text-hud-ink">{p.name}</p>
                    <p className="text-sm text-hud-ink3">{p.village || p.village_code} · Age {p.age}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-none font-semibold">
                      Score: {Math.round(p.risk_score || 0)}
                    </span>
                    <span className="text-hud-ink3">›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AMBER patients */}
        <div className="bg-hud-surface rounded-none shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-amber-600">🟡 Medium Risk Follow-ups</h2>
            <span className="bg-amber-100 text-amber-600 text-xs font-semibold px-2 py-0.5 rounded-full">
              {amberPatients.length}
            </span>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : amberPatients.length === 0 ? (
            <p className="text-center text-hud-ink3 py-8 text-sm">No medium-risk patients due</p>
          ) : (
            <div className="divide-y">
              {amberPatients.map(p => (
                <div
                  key={p.patient_id || p.id}
                  className="px-5 py-4 flex items-center justify-between hover:bg-amber-50 cursor-pointer transition"
                  onClick={() => navigate(`/asha/patient/${p.patient_id || p.id}`)}
                >
                  <div>
                    <p className="font-semibold text-hud-ink">{p.name}</p>
                    <p className="text-sm text-hud-ink3">{p.village || p.village_code} · Age {p.age}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-1 rounded-none font-semibold">
                      Score: {Math.round(p.risk_score || 0)}
                    </span>
                    <span className="text-hud-ink3">›</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Campaigns */}
        <div className="bg-hud-surface rounded-none shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-bold text-gray-800"> Active Campaigns</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-16" />
            </div>
          ) : campaigns.length === 0 ? (
            <p className="text-center text-hud-ink3 py-8 text-sm">No active campaigns</p>
          ) : (
            <div className="divide-y">
              {campaigns.slice(0, 5).map(c => (
                <div key={c.id || c.campaign_id} className="px-5 py-4">
                  <p className="font-semibold text-hud-ink">{c.name}</p>
                  <p className="text-sm text-hud-ink3">
                    {c.district} · {c.scheduled_date ? new Date(c.scheduled_date).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
