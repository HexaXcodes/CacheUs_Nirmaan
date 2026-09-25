import client from './client'

export const getCampaigns = (district) => client.get('/campaigns/', { params: { district } })
export const createCampaign = (data) => client.post('/campaigns/', data)
export const updateCampaign = (id, data) => client.put(`/campaigns/${id}`, data)
export const getCampaignCoverage = (id) => client.get(`/campaigns/${id}/coverage`)
