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
import {
  classicImageUrlsInPlayOrder,
  priorityImageUrls,
  SPORT_QUIZ_SLUG,
} from '@/lib/sport-quiz/content';
import { legendsPriorityImageUrls } from '@/lib/sport-quiz/legends';
import { useLocale } from '@/hooks/use-locale';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

interface SportQuizContentValue {
  snapshot: ContentSnapshot | null;
  status: Status;
  progress: number; // 0..1
  error: string | null;
  /**
   * The images of the first PRIORITY_LEVELS Classic levels are on disk — the
   * splash gate. A ONE-WAY LATCH: once true it never goes back to false, so a
   * re-sync (or a re-mounted splash) can never re-trap the player behind it.
   */
  priorityReady: boolean;
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
  const [priorityReady, setPriorityReady] = useState(false);
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
        // Download in PLAY ORDER: the first Classic levels first, then the rest
        // of Classic in the order the player meets them, then the opening
        // Legends levels. Category icons fall into the implicit trailing batch.
        imageBatches: (data) => {
          const priority = priorityImageUrls(data);
          const priorityKeys = new Set(priority);
          return [
            priority,
            classicImageUrlsInPlayOrder(data).filter((u) => !priorityKeys.has(u)),
            legendsPriorityImageUrls(data),
          ];
        },
        // Merge each finished batch into the live snapshot so the artwork already
        // on disk starts resolving to file:// immediately, instead of everything
        // staying remote until the very last image lands. Safe mid-sync: level
        // membership is decided by whether image_url is set, never by whether it
        // has been downloaded, so a partial map cannot reshuffle a question.
        onBatchImages: (map, batchIndex) => {
          if (inflightLocale.current !== forLocale) return;
          setSnapshot((prev) =>
            prev ? { ...prev, imageMap: { ...prev.imageMap, ...map } } : prev,
          );
          if (batchIndex === 0) setPriorityReady(true);
        },
      });
      if (inflightLocale.current === forLocale) {
        setSnapshot(fresh);
        setStatus('ready');
        setProgress(1);
        // Also latch here: a TTL-fresh sync returns early WITHOUT ever entering
        // the image phase, so onBatchImages never fires on that path.
        setPriorityReady(true);
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
        // A cached snapshot already carries its imageMap, so the artwork is on
        // disk — never hold the splash on a returning player.
        setPriorityReady(true);
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

  const value: SportQuizContentValue = {
    snapshot,
    status,
    progress,
    error,
    priorityReady,
    resync,
  };

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
