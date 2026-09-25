import client from './client'

export const getDietAdvice = (patient_id, lang = 'en', region = null) =>
  client.get(`/diet/advice/${patient_id}`, { params: { lang, region } })
