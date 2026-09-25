import client from './client'
export const saveMeasurement = (path, body) => client.post(`/measurements/${path}`, body, { timeout: 70000 })
export const measurementHistory = (id, offset = 0) => client.get(`/measurements/${encodeURIComponent(id)}`, { params: { offset, limit: 20 } })
export const measurementTrends = id => client.get(`/measurements/${encodeURIComponent(id)}/trends`)
