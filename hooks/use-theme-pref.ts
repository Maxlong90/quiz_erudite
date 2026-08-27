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

// User-selected app appearance. Persisted independently of the OS setting so a
// deliberate choice survives restarts. The app currently ships a single dark
// palette; 'light' is wired end-to-end (stored + exposed) so the light theme
// can be rolled out screen-by-screen without touching the selector again.
const THEMES = ['dark', 'light'] as const;
export type ThemePref = (typeof THEMES)[number];

const STORAGE_KEY = 'app.theme.v1';
const DEFAULT_THEME: ThemePref = 'dark';

interface ThemePrefContextValue {
  /** Current appearance. Defaults to 'dark' until the stored value loads. */
  theme: ThemePref;
  /** True once the persisted value has been read (or confirmed absent). */
  ready: boolean;
  setTheme: (theme: ThemePref) => Promise<void>;
}

const ThemePrefContext = createContext<ThemePrefContextValue | null>(null);

export function ThemePrefProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePref>(DEFAULT_THEME);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v && (THEMES as readonly string[]).includes(v)) {
          setThemeState(v as ThemePref);
        }
      })
      .catch(() => {
        // Best-effort read; fall back to the default dark theme.
      })
      .finally(() => setReady(true));
  }, []);

  const setTheme = useCallback(async (next: ThemePref) => {
    setThemeState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Persisting is best-effort; UI state is the authoritative read.
    }
  }, []);

  const value = useMemo<ThemePrefContextValue>(
    () => ({ theme, ready, setTheme }),
    [theme, ready, setTheme],
  );

  return createElement(ThemePrefContext.Provider, { value }, children);
}

export function useThemePref(): ThemePrefContextValue {
  const ctx = useContext(ThemePrefContext);
  if (!ctx) {
    throw new Error('useThemePref must be used inside <ThemePrefProvider>');
  }
  return ctx;
}
