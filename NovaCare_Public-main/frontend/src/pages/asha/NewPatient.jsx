import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../context/ToastContext'
import { createPatient } from '../../api/patients'
import PortalShell from '../../components/layout/PortalShell'
import FormInput from '../../components/forms/FormInput'
import FormSelect from '../../components/forms/FormSelect'
import Button from '../../components/ui/Button'
import { useAuth } from '../../context/AuthContext'
import client from '../../api/client'

const LANGS = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi' },
  { value: 'kn', label: 'Kannada' },
  { value: 'ta', label: 'Tamil' },
  { value: 'te', label: 'Telugu' },
]

const SEX_OPTIONS = [
  { value: '', label: 'Select sex' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export default function NewPatient() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [form, setForm] = useState({
    name: '',
    age: '',
    sex: '',
    phone: '',
    village_code: user?.village_code || '',
    district_code: user?.district_code || user?.district || '',
    waist_cm: 80,
    family_history: false,
    occupation_transition: false,
    preferred_lang: 'en',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [scope,setScope] = useState(null)
  const [scopeError,setScopeError] = useState('')
  const [scopeAttempt,setScopeAttempt] = useState(0)
  const [submitError,setSubmitError] = useState('')
  useEffect(()=>{
    let cancelled=false
    setScope(null);setScopeError('')
    client.get('/auth/asha/scope').then(({data})=>{
      if(cancelled)return
      if(!data.village_code||!data.district_code)throw new Error('Your village and district assignment is incomplete. Contact your administrator.')
      setScope(data)
      setForm(f=>({...f,village_code:data.village_code,district_code:data.district_code}))
    }).catch(e=>{if(!cancelled)setScopeError(e.response?.data?.error||e.message||'Unable to load your assignment.')})
    return()=>{cancelled=true}
  },[scopeAttempt])

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required'
    if (!form.age || isNaN(form.age) || +form.age < 1 || +form.age > 120) e.age = 'Enter a valid age (1-120)'
    if (!form.sex) e.sex = 'Sex is required'
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid 10-digit mobile number'
    if (!form.village_code.trim()) e.village_code = 'Village code is required'
    if (!form.district_code.trim()) e.district_code = 'District code is required'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if(!scope)return
    setSubmitError('')
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = {
        name: form.name.trim(),
        age: parseInt(form.age),
        sex: form.sex,
        phone: form.phone.replace(/\D/g, ''),
        village_code: scope.village_code,
        district_code: scope.district_code,
        waist_cm: parseFloat(form.waist_cm),
        family_history_flag: form.family_history,
        occupation_transition_flag: form.occupation_transition,
        preferred_lang: form.preferred_lang,
      }
      const res = await createPatient(payload)
      const patient = res.data
      toast('Patient registered successfully!', 'success')
      navigate(`/asha/check/${patient.id || patient.local_id}`)
    } catch (err) {
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to register patient'
      setSubmitError(typeof msg==='string'?msg:'Please check the registration details.')
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }

  const Toggle = ({ field, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-hud-dim/40 last:border-0">
      <span className="text-sm font-medium text-hud-ink2">{label}</span>
      <button
        type="button"
        aria-label={label}
        aria-pressed={form[field]}
        onClick={() => set(field, !form[field])}
        className={`relative w-12 h-6 rounded-full transition-colors ${form[field] ? 'bg-nova' : 'bg-hud-dim'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-hud-surface rounded-full shadow transition-transform ${form[field] ? 'translate-x-6' : ''}`} />
      </button>
    </div>
  )

  return (
    <PortalShell>
      <div className="max-w-xl mx-auto px-4 py-6">
        <div className="bg-hud-surface rounded-none shadow-none p-6 space-y-6">
          <div>
            <h1 className="text-xl font-bold text-hud-ink">Register New Patient</h1>
            <p className="text-sm text-hud-ink3 mt-1">Fill in all required fields to register a patient</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!scope&&!scopeError&&<p role="status">Loading your assigned area…</p>}
            {scopeError&&<div role="alert">{scopeError} <button type="button" onClick={()=>setScopeAttempt(n=>n+1)}>Retry</button></div>}
            {submitError&&<p role="alert" className="nc-alert">{submitError}</p>}
            {/* Personal Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-hud-ink2 text-sm uppercase tracking-wide">Personal Information</h3>
              <FormInput
                label="Full Name *"
                placeholder="Patient's full name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                error={errors.name}
              />
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Age *"
                  type="number"
                  placeholder="Age in years"
                  value={form.age}
                  onChange={e => set('age', e.target.value)}
                  error={errors.age}
                  min={1}
                  max={120}
                />
                <FormSelect
                  label="Sex *"
                  options={SEX_OPTIONS}
                  value={form.sex}
                  onChange={e => set('sex', e.target.value)}
                  error={errors.sex}
                />
              </div>
              <FormInput
                label="Mobile Number *"
                type="tel"
                placeholder="10-digit mobile number"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                error={errors.phone}
              />
            </div>

            {/* Location */}
            <div className="space-y-3">
              <h3 className="font-semibold text-hud-ink2 text-sm uppercase tracking-wide">Location</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Village Code *"
                  readOnly
                  autoComplete="off"
                  placeholder="e.g. KA001"
                  value={scope?.village_code || ''}
                  onChange={e => set('village_code', e.target.value.toUpperCase())}
                  error={errors.village_code}
                />
                <FormInput
                  label="District Code *"
                  readOnly
                  autoComplete="off"
                  placeholder="e.g. TUMKUR"
                  value={scope?.district_code || ''}
                  onChange={e => set('district_code', e.target.value.toUpperCase())}
                  error={errors.district_code}
                />
              </div>
            </div>

            {/* Health Info */}
            <div className="space-y-3">
              <h3 className="font-semibold text-hud-ink2 text-sm uppercase tracking-wide">Health Information</h3>

              {/* Waist slider */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-hud-ink2">
                  Waist Circumference: <span className="text-nova font-bold">{form.waist_cm} cm</span>
                </label>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={form.waist_cm}
                  onChange={e => set('waist_cm', +e.target.value)}
                  className="w-full accent-nova"
                />
                <div className="flex justify-between text-xs text-hud-ink3">
                  <span>50 cm</span>
                  <span>150 cm</span>
                </div>
              </div>

              {/* Toggles */}
              <div className="bg-hud-bg rounded-none px-4">
                <Toggle field="family_history" label="Family History of Diabetes" />
                <Toggle field="occupation_transition" label="Occupation Transition (e.g. farmer to sedentary)" />
              </div>

              <FormSelect
                label="Preferred Language"
                options={LANGS}
                value={form.preferred_lang}
                onChange={e => set('preferred_lang', e.target.value)}
              />
            </div>

            {scope&&<p className="text-sm">Assigned area: {scope.village_code} · {scope.district_code}</p>}
            <Button type="submit" variant="success" size="lg" loading={loading} disabled={!scope} className="w-full">
              Register &amp; Start Guided Check
            </Button>
          </form>
        </div>
      </div>
    </PortalShell>
  )
}
