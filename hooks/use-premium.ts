import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'app.premium.v1';

interface PremiumContextValue {
  isPremium: boolean | null; // null while loading
  setPremium: (value: boolean) => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setIsPremium(v === '1'))
      .catch(() => setIsPremium(false));
  }, []);

  const setPremium = useCallback(async (value: boolean) => {
    setIsPremium(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Persisting is best-effort.
    }
  }, []);

  const value = useMemo(() => ({ isPremium, setPremium }), [isPremium, setPremium]);

  return createElement(PremiumContext.Provider, { value }, children);
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used inside <PremiumProvider>');
  }
  return ctx;
}
