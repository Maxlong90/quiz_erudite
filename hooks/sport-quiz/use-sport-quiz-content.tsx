import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  loadCachedSnapshot,
  syncContent,
  type ContentSnapshot,
} from '@/lib/content-cache';
import { SPORT_QUIZ_SLUG } from '@/lib/sport-quiz/content';
import { useLocale } from '@/hooks/use-locale';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

interface SportQuizContentValue {
  snapshot: ContentSnapshot | null;
  status: Status;
  progress: number; // 0..1
  error: string | null;
  /** Force a fresh sync now, ignoring the TTL. */
  resync: () => Promise<void>;
}

const SportQuizContentContext = createContext<SportQuizContentValue | null>(null);

/**
 * Offline-first content provider for Sport Quiz. Mirrors the Logo Quiz content
 * provider but always targets the `sport-quiz` slug (its own namespaced cache).
 * Hydrates from cache on mount and re-syncs whenever the locale changes so
 * questions, options and explanations follow the active language.
 */
export function SportQuizContentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Tracks the locale the running sync is for, so a fast locale flip cancels the
  // in-flight sync.
  const inflightLocale = useRef<string | null>(null);

  const runSync = useCallback(async (forLocale: string, force: boolean) => {
    inflightLocale.current = forLocale;
    setStatus('syncing');
    setProgress(0);
    setError(null);
    try {
      const fresh = await syncContent({
        locale: forLocale,
        appSlug: SPORT_QUIZ_SLUG,
        force,
        onSnapshot: (snap) => {
          if (inflightLocale.current === forLocale) {
            setSnapshot(snap);
            setStatus('ready');
          }
        },
        onProgress: (p) => {
          if (inflightLocale.current === forLocale) {
            setProgress(p);
          }
        },
      });
      if (inflightLocale.current === forLocale) {
        setSnapshot(fresh);
        setStatus('ready');
        setProgress(1);
      }
    } catch (err) {
      // Log so the failure also shows in the Metro console, not just on-screen.
      console.warn('[sport-quiz] content sync failed:', err);
      if (inflightLocale.current === forLocale) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Sync failed');
      }
    }
  }, []);

  // Hydrate from cache + kick off a sync whenever the locale changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedSnapshot(SPORT_QUIZ_SLUG);
      if (cancelled) return;
      if (cached && cached.locale === locale) {
        setSnapshot(cached);
        setStatus('ready');
        setProgress(1);
      }
      await runSync(locale, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, runSync]);

  const resync = useCallback(async () => {
    await runSync(locale, true);
  }, [locale, runSync]);

  const value: SportQuizContentValue = { snapshot, status, progress, error, resync };

  return (
    <SportQuizContentContext.Provider value={value}>{children}</SportQuizContentContext.Provider>
  );
}

export function useSportQuizContent(): SportQuizContentValue {
  const ctx = useContext(SportQuizContentContext);
  if (!ctx) {
    throw new Error('useSportQuizContent must be used inside <SportQuizContentProvider>');
  }
  return ctx;
}
