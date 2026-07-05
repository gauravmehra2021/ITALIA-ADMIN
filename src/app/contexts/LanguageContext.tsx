import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import authTranslations from '../translations/auth.json';
import dashboardTranslations from '../translations/dashboard.json';
import privateTranslations from '../translations/private.json';

type Language = 'it' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const merge = (a: any = {}, b: any = {}): any => {
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && typeof out[k] === 'object') {
      out[k] = merge(out[k], b[k]);
    } else {
      out[k] = b[k];
    }
  }
  return out;
};

const buildTranslations = () => {
  const result: any = {};
  const langs = new Set([
    ...Object.keys(authTranslations || {}),
    ...Object.keys(dashboardTranslations || {}),
    ...Object.keys(privateTranslations || {}),
  ]);
  for (const lang of langs) {
    result[lang] = merge(
      merge((authTranslations as any)[lang] || {}, (dashboardTranslations as any)[lang] || {}),
      (privateTranslations as any)[lang] || {}
    );
  }
  return result;
};

const allTranslations = buildTranslations();

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('it');

  const t = useCallback((path: string): any => {
    const keys = path.split('.');
    let result: any = allTranslations[language];
    for (const key of keys) {
      result = result?.[key];
    }
    return result ?? path;
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
