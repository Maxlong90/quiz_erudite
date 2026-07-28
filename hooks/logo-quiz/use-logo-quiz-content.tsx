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
import { LOGO_QUIZ_SLUG } from '@/lib/logo-quiz/content';
import { useLocale } from '@/hooks/use-locale';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

interface LogoQuizContentValue {
  snapshot: ContentSnapshot | null;
  status: Status;
  progress: number; // 0..1
  error: string | null;
  /** Force a fresh sync now, ignoring the TTL. */
  resync: () => Promise<void>;
}

const LogoQuizContentContext = createContext<LogoQuizContentValue | null>(null);

/**
 * Offline-first content provider for the Logo Quiz. Mirrors the main app's
 * ContentCacheProvider but always targets the `logo-quiz` slug (its own
 * namespaced cache) and skips the erudite-only answer-stats side effects.
 * Hydrates from cache on mount and re-syncs whenever the locale changes so
 * category names, questions, and explanations follow the active language.
 */
export function LogoQuizContentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Tracks the locale the running sync is for, so a fast locale flip
  // cancels the in-flight sync.
  const inflightLocale = useRef<string | null>(null);

  const runSync = useCallback(async (forLocale: string, force: boolean) => {
    inflightLocale.current = forLocale;
    setStatus('syncing');
    setProgress(0);
    setError(null);
    try {
      const fresh = await syncContent({
        locale: forLocale,
        appSlug: LOGO_QUIZ_SLUG,
        force,
        onSnapshot: (snap) => {
          // JSON is in — make it usable now, before images finish.
          // Guard against a stale (superseded) sync.
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
        // Refresh with the full snapshot (now carrying the downloaded imageMap).
        setSnapshot(fresh);
        setStatus('ready');
        setProgress(1);
      }
    } catch (err) {
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
      const cached = await loadCachedSnapshot(LOGO_QUIZ_SLUG);
      if (cancelled) return;
      if (cached && cached.locale === locale) {
        setSnapshot(cached);
        setStatus('ready');
        setProgress(1);
      }
      // Always trigger a sync attempt — the function itself decides
      // whether the cache is fresh enough to skip the network call.
      await runSync(locale, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, runSync]);

  const resync = useCallback(async () => {
    await runSync(locale, true);
  }, [locale, runSync]);

  const value: LogoQuizContentValue = { snapshot, status, progress, error, resync };

  return (
    <LogoQuizContentContext.Provider value={value}>{children}</LogoQuizContentContext.Provider>
  );
}

export function useLogoQuizContent(): LogoQuizContentValue {
  const ctx = useContext(LogoQuizContentContext);
  if (!ctx) {
    throw new Error('useLogoQuizContent must be used inside <LogoQuizContentProvider>');
  }
  return ctx;
}
