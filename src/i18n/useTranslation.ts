import { useState, useCallback } from 'react';
import { translations, type Language, type Translations } from './translations';

const STORAGE_KEY = 'snake-language';

export const useTranslation = () => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as Language) || 'fr';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const t = useCallback((key: keyof Translations): string => {
    return translations[language][key];
  }, [language]);

  return { language, setLanguage, t };
};
