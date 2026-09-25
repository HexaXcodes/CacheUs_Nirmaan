import {useCopy} from '../i18n/nirmaan'
import CarePlanEditor from './doctor/CarePlanEditor'
import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PortalShell from '../components/layout/PortalShell'
import Measurements from './patient/Measurements'
import AssistedScreening from './asha/screening/AssistedScreening'
import { QUESTIONS } from './asha/screening/Step0Intake'
import { measurementHistory } from '../api/measurements'

export default function CarePortal({ mode = 'overview' }) {
  const t=useCopy(); const { role, user } = useAuth()
  const { patientId: routeId } = useParams()
  const [id, setId] = useState(routeId || '')
  const [selected, setSelected] = useState('')
  const [kind, setKind] = useState('bp/reference')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const request = useRef(0)
  const isCheck = mode === 'check' && role === 'asha'
  const base = role === 'asha' ? '/asha' : '/doctor'
  const accessError = e => e.response?.status === 403
    ? `This patient is outside your assigned ${role === 'asha' ? 'village' : 'district'}. Choose a patient in your area, or ask an administrator to review your assignment.`
    : e.response?.data?.error || 'Unable to open this patient record.'

  useEffect(() => {
    const version = ++request.current
    setId(routeId || '')
    setSelected('')
    setError('')
    setBusy(!!routeId)
    setKind('bp/reference')
    if (routeId) {
      measurementHistory(routeId)
        .then(() => { if (version === request.current) setSelected(routeId) })
        .catch(e => { if (version === request.current) setError(accessError(e)) })
        .finally(() => { if (version === request.current) setBusy(false) })
    }
    return () => { request.current++ }
  }, [mode, routeId])

  async function select(event) {
    event.preventDefault()
    const version = ++request.current
    const patientId = id.trim()
    if (!patientId) return
    setBusy(true)
    setError('')
    setSelected('')
    try {
      await measurementHistory(patientId)
      if (version === request.current) setSelected(patientId)
    } catch (e) {
      if (version === request.current) setError(accessError(e))
    } finally {
      if (version === request.current) setBusy(false)
    }
  }

  if (mode === 'overview') return (
    <PortalShell>
      <div className="nc-stack">
        <section className="nc-welcome">
          <div>
            <span className="nc-eyebrow">{role === 'asha' ? 'Community care' : 'Care overview'}</span>
            <h1>Welcome, {user?.name || (role === 'asha' ? 'ASHA worker' : 'Doctor')}.</h1>
            <p>{role === 'asha' ? 'What would you like to do today?' : 'Patient readings, ready to review.'}</p>
          </div>
          <Link className="nc-primary" to={role === 'asha' ? '/asha/check' : '/doctor/queue'}>
            {role === 'asha' ? 'Start assisted check →' : 'Open review queue →'}
          </Link>
        </section>
        <div className="nc-grid">
          <Link className="nc-card nc-choice" to={base + '/patients'}>
            <span className="nc-icon">♧</span><h2>Patient records</h2>
            <p>Review saved readings and trends.</p><strong>Open records →</strong>
          </Link>
          {role === 'doctor' && <Link className="nc-card nc-choice" to="/doctor/heatmap">
            <span className="nc-icon">▦</span><h2>Screening heatmap</h2>
            <p>Explore village screening records.</p><strong>Open map →</strong>
          </Link>}
          {role === 'asha' && <Link className="nc-card nc-choice" to="/asha/new-patient">
            <span className="nc-icon">+</span><h2>Add a patient</h2>
            <p>Register someone new.</p><strong>Register patient →</strong>
          </Link>}
        </div>
      </div>
    </PortalShell>
  )

  return (
    <PortalShell>
      <div className="nc-stack">
        <div>
          <span className="nc-eyebrow">{isCheck ? 'AR-guided measurement' : 'Patient records'}</span>
          <h1>{isCheck ? t('Start an assisted check') : t('Patients')}</h1>
          <p>{isCheck ? t('Select a patient to start the questionnaire.') : 'Open a patient’s readings and trends.'}</p>
        </div>
        {!selected && <section className="nc-card">
          <form onSubmit={select} className="nc-stack">
            {isCheck && <p>{t('{n} questions → finger PPG',{n:QUESTIONS.length})}</p>}
            <label className="nc-grow">{t('Patient ID')}
              <input required value={id} disabled={busy} onChange={e => setId(e.target.value)} placeholder="Enter patient ID" />
            </label>
            <button className="nc-primary" disabled={busy || !id.trim()}>
              {busy ? t('Checking access…') : isCheck ? t('Start questionnaire →') : 'Open patient history →'}
            </button>
          </form>
        </section>}
        {error && <p role="alert" className="nc-alert">{error}</p>}
        {selected && <section className="nc-stack">
          <div className="nc-section-heading">
            <span className="nc-pill">{isCheck ? 'Recording for' : 'Patient'}: {selected}</span>
            <button className="nc-secondary" onClick={() => { request.current++; setSelected(''); setError('') }}>{t('Change patient')}</button>
          </div>
          {isCheck
            ? <AssistedScreening key={selected} patientId={selected} onExit={() => setSelected('')} />
            : <>{role === 'doctor' && <CarePlanEditor key={selected + '-plan'} patientId={selected}/>}<Measurements key={selected + '-history'} patientIdOverride={selected} view="history" />
              {role === 'asha' && <Link className="nc-primary" to={'/asha/check/' + encodeURIComponent(selected)}>Start assisted check →</Link>}
            </>}
        </section>}
      </div>
    </PortalShell>
  )
}



