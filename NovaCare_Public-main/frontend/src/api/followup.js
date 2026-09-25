import client from './client'

export const getFollowupDue = () => client.get('/followup/due')
export const getFollowupMissed = () => client.get('/followup/missed')
export const completeFollowup = (data) => client.post('/followup/complete', data)
