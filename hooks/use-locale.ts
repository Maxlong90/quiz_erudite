import { getLocales } from 'expo-localization';
import { useState, useCallback } from 'react';

const SUPPORTED_LOCALES = ['en', 'ru', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function useLocale() {
  const deviceLocales = getLocales();
  const deviceLanguage = deviceLocales[0]?.languageCode ?? 'en';

  const defaultLocale: SupportedLocale = SUPPORTED_LOCALES.includes(
    deviceLanguage as SupportedLocale
  )
    ? (deviceLanguage as SupportedLocale)
    : 'en';

  const [locale, setLocale] = useState<SupportedLocale>(defaultLocale);

  const changeLocale = useCallback((newLocale: SupportedLocale) => {
    setLocale(newLocale);
  }, []);

  return { locale, changeLocale, supportedLocales: SUPPORTED_LOCALES };
}
