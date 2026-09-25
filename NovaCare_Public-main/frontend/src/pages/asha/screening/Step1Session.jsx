import { useState, useEffect } from 'react'
import { useToast } from '../../../context/ToastContext'
import { getPatient } from '../../../api/patients'
import { createSession } from '../../../api/sessions'
import Button from '../../../components/ui/Button'
import Skeleton from '../../../components/ui/Skeleton'

export default function Step1Session({ patientId, onNext }) {
  const { toast } = useToast()
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!patientId) { setLoading(false); return }
    getPatient(patientId)
      .then(res => setPatient(res.data))
      .catch(() => toast('Failed to load patient info', 'error'))
      .finally(() => setLoading(false))
  }, [patientId])

  const handleCreate = async () => {
    if (!patientId) {
      toast('No patient selected. Please register or select a patient first.', 'error')
      return
    }
    setCreating(true)
    try {
      const res = await createSession({
        patient_id: patientId,
        village_code: patient?.village_code || 'UNKNOWN',
      })
      const session = res.data
      const sessionId = session.session_id || session.id
      toast('Session created!', 'success')
      onNext({ sessionId, patient })
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.detail || 'Failed to create session', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-hud-ink">Session Setup</h2>
        <p className="text-hud-ink3 text-sm mt-1">Review patient details and start the screening session</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-24" />
        </div>
      ) : patient ? (
        <div className="bg-hud-bg rounded-none p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-nova/10 rounded-full flex items-center justify-center text-nova font-bold text-xl">
              {patient.name?.charAt(0) || '?'}
            </div>
            <div>
              <p className="font-bold text-hud-ink text-lg">{patient.name}</p>
              <p className="text-hud-ink3 text-sm">{patient.age} yrs · {patient.sex}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-hud-ink3">Phone:</span>
              <span className="ml-1 text-hud-ink2">{patient.phone}</span>
            </div>
            <div>
              <span className="text-hud-ink3">Village:</span>
              <span className="ml-1 text-hud-ink2">{patient.village_code}</span>
            </div>
            <div>
              <span className="text-hud-ink3">Waist:</span>
              <span className="ml-1 text-hud-ink2">{patient.waist_cm} cm</span>
            </div>
            <div>
              <span className="text-hud-ink3">Language:</span>
              <span className="ml-1 text-hud-ink2 capitalize">{patient.preferred_lang || 'en'}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-none p-5 text-amber-700">
          <p className="font-semibold">⚠ No patient selected</p>
          <p className="text-sm mt-1">Please register a new patient or navigate from a patient profile to start screening.</p>
        </div>
      )}

      <Button
        onClick={handleCreate}
        variant="primary"
        size="lg"
        loading={creating}
        disabled={!patient || creating}
        className="w-full"
      >
        🚀 Create Screening Session
      </Button>
    </div>
  )
}
