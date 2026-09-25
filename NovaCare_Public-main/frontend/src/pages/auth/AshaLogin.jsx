import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { ashaLogin } from '../../api/auth'
import FormInput from '../../components/forms/FormInput'
import Button from '../../components/ui/Button'
import {Brand} from '../../components/layout/PortalShell'

export default function AshaLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ asha_id: '', pin: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.asha_id.trim()) e.asha_id = 'ASHA ID required'
    if (!form.pin.trim()) e.pin = 'PIN required'
    else if (form.pin.length < 4) e.pin = 'Minimum 4 digits'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await ashaLogin(form.asha_id.trim(), form.pin.trim())
      const { access_token, asha_id, name, district, village_code, district_code } = res.data?.data || res.data
      login(access_token, 'asha', { asha_id, name, district, village_code, district_code })
      toast('AUTH SUCCESS — WELCOME', 'success')
      navigate('/asha')
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials'
      toast(msg, 'error')
      setErrors({ pin: msg })
    } finally {
      setLoading(false)
    }
  }

  return <div className="nc-auth-page"><header><Brand/><Link to="/login">Change role</Link></header><main className="nc-auth-layout"><section className="nc-auth-intro"><span className="nc-eyebrow">Connected through care</span><h1>Better context.<br/>More informed care.</h1><p>Reference readings, clear histories and guided checks, connected through NovaCare.</p><div className="nc-notice">Patient access follows your existing role permissions.</div></section><section className="nc-card"><span className="nc-eyebrow">ASHA worker portal</span><h2>Welcome back</h2><form onSubmit={handleSubmit} className="nc-stack"><FormInput label="ASHA Worker ID" value={form.asha_id} onChange={e=>setForm({...form,asha_id:e.target.value})} error={errors.asha_id} autoComplete="username"/><FormInput label="Security PIN" type="password" value={form.pin} onChange={e=>setForm({...form,pin:e.target.value})} error={errors.pin} autoComplete="current-password" maxLength={6}/><Button type="submit" loading={loading}>Sign in →</Button></form><p className="nc-caption">Use your existing credentials. Contact your administrator for access.</p></section></main></div>
}
