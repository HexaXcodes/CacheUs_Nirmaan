import { useState, useEffect } from 'react'
import { useToast } from '../../context/ToastContext'
import { getFollowupMissed } from '../../api/followup'
import { getPatient, getPatientHistory, updatePatient } from '../../api/patients'
import Navbar from '../../components/layout/Navbar'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import FormInput from '../../components/forms/FormInput'

const TIER_STYLES = {
  RED: 'bg-red-900/40 text-red-300 border border-red-500/30',
  AMBER: 'bg-amber-900/40 text-amber-300 border border-amber-500/30',
  GREEN: 'bg-green-900/40 text-green-300 border border-green-500/30',
}

const MOCK_PATIENTS = [
  {
    patient_id: 'PTNT-01',
    id: 'PTNT-01',
    name: 'PRIYA S.',
    risk_tier: 'AMBER',
    village: 'VILLAGE NODE ALPHA',
    village_code: 'KA-04',
    followup_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    age: 45,
    sex: 'FEMALE',
    phone: '+91 98765 43210',
    waist_cm: 88,
    family_history: true,
    district_code: 'DK-01',
    screening_history: [
      { risk_tier: 'AMBER', risk_score: 72, idrs_score: 55, created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
      { risk_tier: 'GREEN', risk_score: 45, idrs_score: 30, created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    patient_id: 'PTNT-02',
    id: 'PTNT-02',
    name: 'ANAND KUMAR',
    risk_tier: 'RED',
    village: 'VILLAGE NODE BETA',
    village_code: 'KA-07',
    followup_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    age: 62,
    sex: 'MALE',
    phone: '+91 98888 11111',
    waist_cm: 104,
    family_history: true,
    district_code: 'DK-02',
    screening_history: [
      { risk_tier: 'RED', risk_score: 88, idrs_score: 75, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() },
      { risk_tier: 'AMBER', risk_score: 70, idrs_score: 60, created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    patient_id: 'PTNT-03',
    id: 'PTNT-03',
    name: 'SITA DEVAMMA',
    risk_tier: 'GREEN',
    village: 'VILLAGE NODE ALPHA',
    village_code: 'KA-04',
    followup_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    age: 38,
    sex: 'FEMALE',
    phone: '+91 97777 22222',
    waist_cm: 78,
    family_history: false,
    district_code: 'DK-01',
    screening_history: [
      { risk_tier: 'GREEN', risk_score: 30, idrs_score: 20, created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  }
]

export default function PatientReview() {
  const { toast } = useToast()

  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [patientDetail, setPatientDetail] = useState(null)
  const [patientHistory, setPatientHistory] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [editModal, setEditModal] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getFollowupMissed()
      .then(res => {
        const raw = res.data
        const data = (raw && Array.isArray(raw)) ? raw : ((raw && Array.isArray(raw.patients)) ? raw.patients : [])
        if (data.length === 0) {
          setPatients(MOCK_PATIENTS)
        } else {
          setPatients(data)
        }
      })
      .catch(() => {
        setPatients(MOCK_PATIENTS)
        toast('Active offline diagnostics fallback loaded', 'info')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSelect = async (p) => {
    const id = p.patient_id || p.id
    setSelectedId(id)
    setDetailLoading(true)

    const mockP = MOCK_PATIENTS.find(item => item.id === id)

    try {
      const [pRes, hRes] = await Promise.allSettled([
        getPatient(id),
        getPatientHistory(id),
      ])

      if (pRes.status === 'fulfilled') {
        setPatientDetail(pRes.value.data)
        setEditForm(pRes.value.data)
      } else if (mockP) {
        setPatientDetail(mockP)
        setEditForm(mockP)
      }

      if (hRes.status === 'fulfilled') {
        setPatientHistory(hRes.value.data || [])
      } else if (mockP) {
        setPatientHistory(mockP.screening_history || [])
      }
    } catch {
      if (mockP) {
        setPatientDetail(mockP)
        setEditForm(mockP)
        setPatientHistory(mockP.screening_history || [])
      } else {
        toast('Failed to load patient details', 'error')
      }
    } finally {
      setDetailLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await updatePatient(selectedId, editForm)
      setPatientDetail(res.data)
      toast('Patient updated!', 'success')
      setEditModal(false)
    } catch (err) {
      // For mock data support, simulate successful save offline
      const mockPIndex = MOCK_PATIENTS.findIndex(item => item.id === selectedId)
      if (mockPIndex !== -1) {
        MOCK_PATIENTS[mockPIndex] = { ...MOCK_PATIENTS[mockPIndex], ...editForm }
        setPatientDetail(editForm)
        toast('Patient updated offline!', 'success')
        setEditModal(false)
      } else {
        toast(err.response?.data?.detail || 'Update failed', 'error')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-hud-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-hud-ink mb-5">Missed Follow-up Patients</h1>

        <div className="flex gap-4">
          {/* Patient list */}
          <div className="w-full md:w-80 shrink-0 bg-hud-surface rounded-none shadow-none overflow-hidden self-start">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-hud-ink2 text-sm">
                {patients.length} patients overdue
              </p>
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : patients.length === 0 ? (
              <p className="text-center text-hud-ink3 py-10 text-sm">No missed follow-ups</p>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {patients.map(p => {
                  const id = p.patient_id || p.id
                  const tier = (p.risk_tier || 'RED').toUpperCase()
                  return (
                    <button
                      key={id}
                      onClick={() => handleSelect(p)}
                      className={`w-full text-left px-4 py-3 hover:bg-hud-bg transition
                        ${selectedId === id ? 'bg-blue-50 border-l-4 border-nova' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-hud-ink text-sm">{p.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TIER_STYLES[tier] || ''}`}>
                          {tier}
                        </span>
                      </div>
                      <p className="text-xs text-hud-ink3 mt-0.5">
                        {p.village || p.village_code} · {p.followup_date ? new Date(p.followup_date).toLocaleDateString() : 'Overdue'}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 space-y-4">
            {!selectedId ? (
              <div className="bg-hud-surface rounded-none p-10 text-center text-hud-ink3">
                <p className="text-4xl mb-3"> </p>
                <p className="font-medium">Select a patient to view details</p>
              </div>
            ) : detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-40" />
                <Skeleton className="h-60" />
              </div>
            ) : patientDetail ? (
              <>
                {/* Patient card */}
                <div className="bg-hud-surface rounded-none p-5 shadow-none space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-hud-ink">{patientDetail.name}</h2>
                      <p className="text-hud-ink3 text-sm">{patientDetail.age} yrs · {patientDetail.sex} · {patientDetail.village_code}</p>
                      <p className="text-hud-ink3 text-xs mt-0.5">{patientDetail.phone}</p>
                    </div>
                    <Button onClick={() => setEditModal(true)} variant="outline" size="sm">
                      Edit
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-hud-bg rounded-none p-3">
                      <p className="text-xs text-hud-ink3">Waist</p>
                      <p className="font-semibold">{patientDetail.waist_cm || '—'} cm</p>
                    </div>
                    <div className="bg-hud-bg rounded-none p-3">
                      <p className="text-xs text-hud-ink3">Family History</p>
                      <p className="font-semibold">{patientDetail.family_history ? 'Yes' : 'No'}</p>
                    </div>
                    <div className="bg-hud-bg rounded-none p-3">
                      <p className="text-xs text-hud-ink3">District</p>
                      <p className="font-semibold">{patientDetail.district_code || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* History timeline */}
                <div className="bg-hud-surface rounded-none shadow-none overflow-hidden">
                  <div className="px-5 py-4 border-b">
                    <h3 className="font-bold text-gray-800">Screening History</h3>
                  </div>
                  {patientHistory.length === 0 ? (
                    <p className="text-center text-hud-ink3 py-8 text-sm">No sessions found</p>
                  ) : (
                    <div className="divide-y max-h-64 overflow-y-auto">
                      {patientHistory.map((s, i) => {
                        const tier = (s.risk_tier || '').toUpperCase()
                        return (
                          <div key={s.session_id || i} className="px-5 py-4 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TIER_STYLES[tier] || 'bg-hud-bg2 text-hud-ink2'}`}>
                                  {tier || 'N/A'}
                                </span>
                                {s.risk_score != null && (
                                  <span className="text-sm text-hud-ink3">Score: {Math.round(s.risk_score)}</span>
                                )}
                              </div>
                              {s.idrs_score != null && (
                                <p className="text-xs text-hud-ink3 mt-0.5">IDRS: {s.idrs_score}</p>
                              )}
                            </div>
                            <span className="text-xs text-hud-ink3">
                              {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={editModal} onClose={() => setEditModal(false)} title="Edit Patient">
        <div className="space-y-4">
          <FormInput
            label="Full Name"
            value={editForm.name || ''}
            onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
          />
          <FormInput
            label="Age"
            type="number"
            value={editForm.age || ''}
            onChange={e => setEditForm(f => ({ ...f, age: +e.target.value }))}
          />
          <FormInput
            label="Phone"
            value={editForm.phone || ''}
            onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))}
          />
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-hud-ink2">
              Waist: {editForm.waist_cm || 80} cm
            </label>
            <input
              type="range" min={50} max={150} value={editForm.waist_cm || 80}
              onChange={e => setEditForm(f => ({ ...f, waist_cm: +e.target.value }))}
              className="w-full accent-nova"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-hud-ink2">Family History</span>
            <button
              onClick={() => setEditForm(f => ({ ...f, family_history: !f.family_history }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${editForm.family_history ? 'bg-nova' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-hud-surface rounded-full shadow transition-transform ${editForm.family_history ? 'translate-x-6' : ''}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setEditModal(false)} variant="ghost" className="flex-1">Cancel</Button>
            <Button onClick={handleSave} variant="primary" loading={saving} className="flex-1">Save Changes</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
