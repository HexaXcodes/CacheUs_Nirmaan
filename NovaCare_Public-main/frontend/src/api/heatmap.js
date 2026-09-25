import client from './client'

export const getVillages = (params) => client.get('/heatmap/villages', { params })
export const getTrends = (village_code) => client.get('/heatmap/trends', { params: { village_code } })
export const getMapsPoints = (params) => client.get('/heatmap/maps-points', { params })
