import { createContext, useContext, useState } from 'react'

const LANGS = {
  en: 'English', hi: 'हिन्दी', kn: 'ಕನ್ನಡ'
}

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => LANGS[localStorage.getItem('nc_lang')] ? localStorage.getItem('nc_lang') : 'en')

  const changeLang = (l) => {
    if(!LANGS[l])return
    document.documentElement.lang=l
    setLang(l)
    localStorage.setItem('nc_lang', l)
  }

  return (
    <LanguageContext.Provider value={{ lang, changeLang, LANGS }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLang = () => useContext(LanguageContext)

