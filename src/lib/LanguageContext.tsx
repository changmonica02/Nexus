"use client";
import { createContext, useCallback, useContext, useMemo, useState, useEffect } from "react";
import { DEFAULT_LANGUAGE, translate, type Language } from "./i18n";

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({
  initialLanguage,
  onLanguageChange,
  children,
}: {
  initialLanguage: Language;
  onLanguageChange?: (lang: Language) => void;
  children: React.ReactNode;
}) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  useEffect(() => { setLanguageState(initialLanguage); }, [initialLanguage]);
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);
  const t = useCallback((key: string, params?: Record<string, string | number>) => translate(language, key, params), [language]);
  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage() must be used within a LanguageProvider");
  return ctx;
}

export type { Language };
export { DEFAULT_LANGUAGE };

/** Standalone dictionary routes retain their existing Chinese default without an app provider. */
export function usePaginationLanguage() {
 const ctx=useContext(LanguageContext);
 return {t:ctx?.t??((key:string,params?:Record<string,string|number>)=>translate('zh-TW',key,params))};
}
