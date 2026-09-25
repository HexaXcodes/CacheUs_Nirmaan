import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

const client = axios.create({ baseURL: BASE })

client.interceptors.request.use(cfg => {
  const token = localStorage.getItem('nc_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

client.interceptors.response.use(
  r => {
    // Auto-unwrap the {success, data, error} envelope so callers see r.data = payload
    if (r.data && typeof r.data === 'object' && 'success' in r.data) {
      r.data = r.data.data
    }
    return r
  },
  err => {
    const url = err.config?.url || ''
    const isAuthEndpoint = url.includes('/auth/')
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('nc_token')
      localStorage.removeItem('nc_role')
      localStorage.removeItem('nc_user')
      window.location.href = '/'
    }
    return Promise.reject(err)
  }
)

export default client
