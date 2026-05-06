import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';

const SUPPORTED_LOCALES = ['en', 'ru', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const STORAGE_KEY = 'app.locale.v1';

function detectDeviceLocale(): SupportedLocale {
  const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
  return SUPPORTED_LOCALES.includes(deviceLanguage as SupportedLocale)
    ? (deviceLanguage as SupportedLocale)
    : 'en';
}

export function useLocale() {
  const [locale, setLocale] = useState<SupportedLocale>(detectDeviceLocale());
  const [hasPicked, setHasPicked] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && (SUPPORTED_LOCALES as readonly string[]).includes(v)) {
          setLocale(v as SupportedLocale);
          setHasPicked(true);
        } else {
          setHasPicked(false);
        }
      })
      .catch(() => setHasPicked(false));
  }, []);

  const changeLocale = useCallback(async (newLocale: SupportedLocale) => {
    setLocale(newLocale);
    setHasPicked(true);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      // Persisting is best-effort; UI state is the authoritative read.
    }
  }, []);

  return { locale, changeLocale, hasPicked, supportedLocales: SUPPORTED_LOCALES };
}
