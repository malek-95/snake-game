import { useState, useCallback } from 'react';
import { translations, type Language, type Translations } from './translations';

const STORAGE_KEY = 'snake-language';

// Storage can hold anything (old versions, manual edits) or be blocked entirely.
const loadLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in translations) return saved as Language;
  } catch { /* storage unavailable */ }
  return 'fr';
};

export const useTranslation = () => {
  const [language, setLanguageState] = useState<Language>(loadLanguage);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch { /* storage unavailable */ }
  }, []);

  const t = useCallback((key: keyof Translations): string => {
    return translations[language][key];
  }, [language]);

  return { language, setLanguage, t };
};
