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

import { isPremiumEntitlementActive, revenueCatEnabled } from '@/lib/revenuecat';

const STORAGE_KEY = 'app.premium.v1';

interface PremiumContextValue {
  isPremium: boolean | null; // null while loading
  setPremium: (value: boolean) => Promise<void>;
  resetPremium: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  const setPremium = useCallback(async (value: boolean) => {
    setIsPremium(value);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Persisting is best-effort.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      // Local flag is the source of truth for the initial render.
      let local = false;
      try {
        local = (await AsyncStorage.getItem(STORAGE_KEY)) === '1';
      } catch {
        // Fall through with local = false.
      }
      if (cancelled) return;
      setIsPremium(local);

      // When RevenueCat is enabled, sync from the live entitlement so a
      // returning subscriber stays premium. Upgrade only — a returning user
      // is never DOWNGRADED here: a false result or a network error (offline =
      // unknown) leaves the stored flag untouched.
      if (!revenueCatEnabled || local) return;
      try {
        const active = await isPremiumEntitlementActive();
        if (!cancelled && active) {
          await setPremium(true);
        }
      } catch {
        // Network/SDK error → entitlement unknown, keep the local flag.
      }
    }

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [setPremium]);

  const resetPremium = useCallback(async () => {
    setIsPremium(false);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({ isPremium, setPremium, resetPremium }),
    [isPremium, setPremium, resetPremium],
  );

  return createElement(PremiumContext.Provider, { value }, children);
}

export function usePremium(): PremiumContextValue {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error('usePremium must be used inside <PremiumProvider>');
  }
  return ctx;
}
