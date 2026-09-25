import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { getCampaigns, createCampaign, getCampaignCoverage } from '../../api/campaigns'
import Navbar from '../../components/layout/Navbar'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import FormInput from '../../components/forms/FormInput'

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-700',
  planned: 'bg-blue-100 text-blue-700',
  completed: 'bg-hud-bg2 text-hud-ink2',
  cancelled: 'bg-red-100 text-red-600',
}

export default function Campaigns() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(false)
  const [coverageModal, setCoverageModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [coverage, setCoverage] = useState(null)
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const [form, setForm] = useState({
    name: '',
    district_code: user?.district || '',
    village_codes: '',
    scheduled_date: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState({})

  const fetchCampaigns = () => {
    setLoading(true)
    getCampaigns(user?.district)
      .then(res => setCampaigns(res.data?.campaigns || res.data || []))
      .catch(err => toast(err.response?.data?.detail || 'Failed to load campaigns', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchCampaigns() }, [])

  const validateForm = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Campaign name is required'
    if (!form.district_code.trim()) e.district_code = 'District code is required'
    if (!form.village_codes.trim()) e.village_codes = 'At least one village code is required'
    return e
  }

  const handleCreate = async () => {
    const errs = validateForm()
    if (Object.keys(errs).length) { setFormErrors(errs); return }
    setCreating(true)
    try {
      const payload = {
        ...form,
        village_codes: form.village_codes.split(',').map(s => s.trim()).filter(Boolean),
      }
      const res = await createCampaign(payload)
      toast('Campaign created!', 'success')
      setCreateModal(false)
      setForm({ name: '', district_code: user?.district || '', village_codes: '', scheduled_date: '', notes: '' })
      setFormErrors({})
      fetchCampaigns()
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to create campaign', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleViewCoverage = async (campaign) => {
    setSelectedCampaign(campaign)
    setCoverageModal(true)
    setCoverageLoading(true)
    try {
      const id = campaign.id || campaign.campaign_id
      const res = await getCampaignCoverage(id)
      setCoverage(res.data)
    } catch {
      toast('Failed to load coverage data', 'error')
    } finally {
      setCoverageLoading(false)
    }
  }

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  return (
    <div className="min-h-screen bg-hud-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-hud-ink">  Campaigns</h1>
          <Button onClick={() => setCreateModal(true)} variant="primary" size="sm">
            + Create Campaign
          </Button>
        </div>

        {/* Campaign list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-hud-surface rounded-none p-10 text-center text-hud-ink3 shadow-none">
            <p className="text-4xl mb-3"> </p>
            <p className="font-medium">No campaigns yet</p>
            <Button onClick={() => setCreateModal(true)} variant="primary" className="mt-4">
              Create First Campaign
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map(c => {
              const id = c.id || c.campaign_id
              const status = (c.status || 'planned').toLowerCase()
              return (
                <div key={id} className="bg-hud-surface rounded-none shadow-none p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="font-bold text-hud-ink">{c.name}</h2>
                      <p className="text-sm text-hud-ink3 mt-0.5">
                        {c.district_code} · {c.scheduled_date ? new Date(c.scheduled_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Date TBD'}
                      </p>
                    </div>
                    <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${STATUS_COLORS[status] || 'bg-hud-bg2 text-hud-ink2'}`}>
                      {status}
                    </span>
                  </div>

                  {/* Village codes */}
                  {c.village_codes && c.village_codes.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(c.village_codes) ? c.village_codes : [c.village_codes]).map(v => (
                        <span key={v} className="bg-hud-bg2 text-hud-ink2 text-xs px-2 py-0.5 rounded-none font-mono">
                          {v}
                        </span>
                      ))}
                    </div>
                  )}

                  {c.notes && <p className="text-sm text-hud-ink3 italic">{c.notes}</p>}

                  {/* Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4 text-xs text-hud-ink3">
                      {c.target_count != null && <span>Target: {c.target_count}</span>}
                      {c.completed_count != null && <span>Completed: {c.completed_count}</span>}
                    </div>
                    <Button
                      onClick={() => handleViewCoverage(c)}
                      variant="ghost"
                      size="sm"
                      className="text-xs"
                    >
                      View Coverage →
                    </Button>
                  </div>

                  {/* Progress bar */}
                  {c.target_count && c.completed_count != null && (
                    <div className="h-2 bg-hud-bg2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-nova rounded-full"
                        style={{ width: `${Math.min(100, Math.round(c.completed_count / c.target_count * 100))}%` }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New Campaign">
        <div className="space-y-4">
          <FormInput
            label="Campaign Name *"
            placeholder="e.g. Tumkur Diabetes Drive 2025"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            error={formErrors.name}
          />
          <FormInput
            label="District Code *"
            placeholder="e.g. TUMKUR"
            value={form.district_code}
            onChange={e => set('district_code', e.target.value.toUpperCase())}
            error={formErrors.district_code}
          />
          <FormInput
            label="Village Codes * (comma-separated)"
            placeholder="KA001, KA002, KA003"
            value={form.village_codes}
            onChange={e => set('village_codes', e.target.value)}
            error={formErrors.village_codes}
          />
          <FormInput
            label="Scheduled Date"
            type="date"
            value={form.scheduled_date}
            onChange={e => set('scheduled_date', e.target.value)}
          />
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-hud-ink2">Notes</label>
            <textarea
              placeholder="Any additional notes..."
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-none border border-hud-line2/60 text-sm focus:outline-none focus:ring-2 focus:ring-nova resize-none"
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => setCreateModal(false)} variant="ghost" className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} variant="primary" loading={creating} className="flex-1">Create Campaign</Button>
          </div>
        </div>
      </Modal>

      {/* Coverage Modal */}
      <Modal open={coverageModal} onClose={() => setCoverageModal(false)} title={`Coverage: ${selectedCampaign?.name || ''}`}>
        {coverageLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32" />
          </div>
        ) : coverage ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-nova/5 rounded-none p-4 text-center">
                <p className="text-2xl font-black text-nova">{coverage.assigned || 0}</p>
                <p className="text-xs text-hud-ink3">Assigned Villages</p>
              </div>
              <div className="bg-green-50 rounded-none p-4 text-center">
                <p className="text-2xl font-black text-green-600">{coverage.completed || 0}</p>
                <p className="text-xs text-hud-ink3">Completed</p>
              </div>
            </div>

            {coverage.villages && (
              <div className="space-y-2">
                <p className="font-semibold text-sm text-hud-ink2">Village Status</p>
                {coverage.villages.map(v => (
                  <div key={v.code || v.village_code} className="flex items-center justify-between px-3 py-2 bg-hud-bg rounded-none">
                    <span className="text-sm text-hud-ink2 font-mono">{v.code || v.village_code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                      ${v.status === 'done' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-hud-ink3'}`}>
                      {v.status || 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-hud-ink3 py-6">No coverage data available</p>
        )}
      </Modal>
    </div>
  )
}
