import client from './client'

export const createSession = (data) => client.post('/sessions/', data)
export const submitIdrs = (id, data) => client.post(`/sessions/${id}/idrs`, data)
export const submitVoice = (id, data) => client.post(`/sessions/${id}/voice`, data)
export const submitRppg = (id, data) => client.post(`/sessions/${id}/rppg`, data)
export const getResult = (id, lang = 'en') => client.get(`/sessions/${id}/result`, { params: { lang } })
export const getReport = (id, lang = 'en') => client.get(`/sessions/${id}/report`, { params: { lang } })
