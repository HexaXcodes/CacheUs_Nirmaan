// src/context/LanguageContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';
import { LANGUAGES, t as translate } from '../i18n/translations';

const LanguageContext = createContext(null);

const STORAGE_KEY = 'novacare_lang';

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'en';
    } catch {
      return 'en';
    }
  });

  const setLang = useCallback((code) => {
    setLangState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key, vars) => translate(key, lang, vars), [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, languages: LANGUAGES, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside <LanguageProvider>');
  return ctx;
};
