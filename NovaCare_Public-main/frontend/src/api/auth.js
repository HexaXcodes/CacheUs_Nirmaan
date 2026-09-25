import client from './client'

export const ashaLogin = (asha_id, pin) =>
  client.post('/auth/asha/login', { asha_id, pin })

export const patientRequestOtp = (phone) =>
  client.post('/auth/patient/otp', { phone })

export const patientVerifyOtp = (phone, otp) =>
  client.post('/auth/patient/verify', { phone, otp })

export const doctorLogin = (email, password) =>
  client.post('/auth/doctor/login', { email, password })
