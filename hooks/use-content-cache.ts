import {
  createContext,
  createElement,
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
import { fetchQuestionStats, flushAnswers } from '@/lib/answer-stats';
import { useLocale } from '@/hooks/use-locale';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

interface ContentCacheValue {
  snapshot: ContentSnapshot | null;
  status: Status;
  progress: number; // 0..1
  error: string | null;
  /** Force a fresh sync now, ignoring the TTL. */
  resync: () => Promise<void>;
}

const ContentCacheContext = createContext<ContentCacheValue | null>(null);

export function ContentCacheProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Tracks the locale the running sync is for, so a fast locale flip
  // cancels the in-flight sync.
  const inflightLocale = useRef<string | null>(null);

  const runSync = useCallback(
    async (forLocale: string, force: boolean) => {
      inflightLocale.current = forLocale;
      setStatus('syncing');
      setProgress(0);
      setError(null);
      try {
        const fresh = await syncContent({
          locale: forLocale,
          force,
          onProgress: (p) => {
            // Drop progress events from a stale sync.
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
        // Opportunistic, fire-and-forget: content just synced, so we're
        // online — ship any queued answer reports and refresh the cached
        // real-stats blob for the statistics hint. Never blocks content.
        flushAnswers().catch(() => {});
        fetchQuestionStats(forLocale).catch(() => {});
      } catch (err) {
        if (inflightLocale.current === forLocale) {
          setStatus('error');
          setError(err instanceof Error ? err.message : 'Sync failed');
        }
      }
    },
    [],
  );

  // Hydrate from cache + kick off a sync whenever the locale changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedSnapshot();
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

  const value: ContentCacheValue = { snapshot, status, progress, error, resync };

  return createElement(ContentCacheContext.Provider, { value }, children);
}

export function useContentCache(): ContentCacheValue {
  const ctx = useContext(ContentCacheContext);
  if (!ctx) {
    throw new Error('useContentCache must be used inside <ContentCacheProvider>');
  }
  return ctx;
}
