import client from './client'

export const getLanguages = () => client.get('/i18n/languages')
export const generateTts = (text, lang) => client.post('/tts/generate', { text, lang })
