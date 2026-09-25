import { useLang } from '../context/LanguageContext'
import T from './translations'

// Returns a t(key, ...args) function for the current language.
// Falls back to English if key is missing in the active language.
export function useT() {
  const { lang } = useLang()
  const dict = T[lang] || T.en

  function t(key, ...args) {
    const val = dict[key] ?? T.en[key]
    if (val === undefined) return key
    if (typeof val === 'function') return val(...args)
    return val
  }

  return t
}
