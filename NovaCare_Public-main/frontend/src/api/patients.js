import client from './client'

export const createPatient = (data) => client.post('/patients/', data)
export const getPatient = (id) => client.get(`/patients/${id}`)
export const updatePatient = (id, data) => client.put(`/patients/${id}`, data)
export const getPatientHistory = (id) => client.get(`/patients/${id}/history`)
