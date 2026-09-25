import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { doctorLogin } from '../../api/auth'
import FormInput from '../../components/forms/FormInput'
import Button from '../../components/ui/Button'
import {Brand} from '../../components/layout/PortalShell'

export default function DoctorLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email.trim()) e.email = 'Email required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password required'
    else if (form.password.length < 6) e.password = 'Min 6 characters'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const res = await doctorLogin(form.email.trim(), form.password)
      const { access_token, doctor_id, name, district } = res.data?.data || res.data
      login(access_token, 'doctor', { doctor_id, name, district, email: form.email })
      toast('AUTH SUCCESS — WELCOME DR.', 'success')
      navigate('/doctor')
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials'
      toast(msg, 'error')
      setErrors({ password: msg })
    } finally {
      setLoading(false)
    }
  }

  return <div className="nc-auth-page"><header><Brand/><Link to="/login">Change role</Link></header><main className="nc-auth-layout"><section className="nc-auth-intro"><span className="nc-eyebrow">Connected through care</span><h1>Better context.<br/>More informed care.</h1><p>Reference readings, clear histories and guided checks, connected through NovaCare.</p><div className="nc-notice">Patient access follows your existing role permissions.</div></section><section className="nc-card"><span className="nc-eyebrow">Doctor portal</span><h2>Welcome back</h2><form onSubmit={handleSubmit} className="nc-stack"><FormInput label="Email address" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} error={errors.email} autoComplete="username"/><FormInput label="Password" type={showPass?'text':'password'} value={form.password} onChange={e=>setForm({...form,password:e.target.value})} error={errors.password} autoComplete="current-password"/><button type="button" onClick={()=>setShowPass(!showPass)}>{showPass?'Hide password':'Show password'}</button><Button type="submit" loading={loading}>Sign in →</Button></form><p className="nc-caption">Use your existing credentials. Contact your administrator for access.</p></section></main></div>
}
