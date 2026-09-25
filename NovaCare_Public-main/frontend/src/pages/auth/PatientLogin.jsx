import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'
import { patientRequestOtp, patientVerifyOtp } from '../../api/auth'
import Button from '../../components/ui/Button'
import {Brand} from '../../components/layout/PortalShell'

export default function PatientLogin() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [otpInput, setOtpInput] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [otpError, setOtpError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [devOtp, setDevOtp] = useState('')
  const timerRef = useRef(null)
  const otpRef = useRef(null)

  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown(c => c - 1), 1000)
    }
    return () => clearTimeout(timerRef.current)
  }, [countdown])

  const requestOtp = async (cleanedPhone) => {
    const res = await patientRequestOtp(cleanedPhone)
    const data = res.data
    if (data?.dev_otp) setDevOtp(data.dev_otp)
  }

  const handlePhoneSubmit = async (e) => {
    e.preventDefault()
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length < 10) { setPhoneError('10-digit number required'); return }
    setPhoneError('')
    setLoading(true)
    try {
      await requestOtp(cleaned)
      toast('OTP transmitted', 'success')
      setStep(2)
      setCountdown(60)
      setTimeout(() => otpRef.current?.focus(), 100)
    } catch (err) {
      const msg = err.response?.data?.error || 'Transmission failed'
      toast(msg, 'error')
      setPhoneError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    const code = otpInput.trim()
    if (code.length !== 6) { setOtpError('Enter the 6-digit code'); return }
    const cleaned = phone.replace(/\D/g, '')
    setOtpError('')
    setLoading(true)
    try {
      const res = await patientVerifyOtp(cleaned, code)
      const { access_token, patient_id, name } = res.data
      login(access_token, 'patient', { patient_id, name, phone: cleaned })
      toast('IDENTITY VERIFIED', 'success')
      navigate('/patient')
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed'
      toast(msg, 'error')
      setOtpError(msg)
      setOtpInput('')
      otpRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    const cleaned = phone.replace(/\D/g, '')
    setLoading(true)
    try {
      await requestOtp(cleaned)
      toast('OTP retransmitted', 'success')
      setCountdown(60)
      setOtpInput('')
      otpRef.current?.focus()
    } catch {
      toast('Retransmit failed', 'error')
    } finally {
      setLoading(false)
    }
  }

  return <div className="nc-auth-page"><header><Brand/><Link to="/login">Change role</Link></header><main className="nc-auth-layout"><section className="nc-auth-intro"><span className="nc-eyebrow">Your personal health companion</span><h1>A clearer picture.<br/>One reading at a time.</h1><p>Follow a guided check, keep your readings together and take your history into your next care conversation.</p><div className="nc-notice">Commercial devices measure. NovaCare guides and records.</div></section><section className="nc-card"><span className="nc-eyebrow">Patient portal</span><h2>{step===1?'Welcome back':'Check your phone'}</h2>{step===1?<form className="nc-stack" onSubmit={handlePhoneSubmit}><p>Enter your phone number to receive a sign-in code.</p><label>Phone number<input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="10-digit phone number" required/></label>{phoneError&&<p role="alert" className="nc-alert">{phoneError}</p>}<Button type="submit" loading={loading}>Send verification code →</Button></form>:<form className="nc-stack" onSubmit={handleVerify}><p>Enter the six-digit code sent to {phone}.</p><label>Verification code<input ref={otpRef} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otpInput} onChange={e=>setOtpInput(e.target.value)} required/></label>{devOtp&&<p className="nc-notice">Development OTP: {devOtp}</p>}{otpError&&<p role="alert" className="nc-alert">{otpError}</p>}<Button type="submit" loading={loading}>Verify and continue →</Button><button className="nc-secondary" type="button" disabled={countdown>0||loading} onClick={handleResend}>{countdown>0?'Resend in '+countdown+'s':'Resend code'}</button><button type="button" onClick={()=>setStep(1)}>Change phone number</button></form>}</section></main></div>
}
