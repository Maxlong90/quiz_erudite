import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { loadCachedSnapshot, syncContent, type ContentSnapshot } from '@/lib/content-cache';
import { buildCountryQuestions, type FlagCountryQuestion } from '@/lib/flags-quiz/content';
import { useLocale } from '@/hooks/use-locale';

/** App slug the Coat of Arms quiz always syncs (its own namespaced cache). */
const COAT_SLUG = 'coat-of-arms';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

interface CoatContentValue {
  /** Full snapshot (backs the "All countries" mode + app config). */
  snapshot: ContentSnapshot | null;
  /** "All countries": coat-of-arms image + text options (all image_questions). */
  countryQuestions: FlagCountryQuestion[];
  status: Status;
  error: string | null;
}

const CoatContentContext = createContext<CoatContentValue | null>(null);

/**
 * Offline-first content provider for the Coat of Arms quiz. Identical mechanics
 * to the Flags Quiz provider — the backend content snapshot for the
 * `coat-of-arms` slug — only the artwork differs: each `image_questions` row is a
 * national COAT OF ARMS + four country text options (one correct). Re-syncs on
 * locale change so names, options and explanations follow the active language.
 */
export function CoatContentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  // Tracks the locale the running sync is for, so a fast locale flip supersedes
  // an in-flight sync.
  const inflightLocale = useRef<string | null>(null);

  const runSync = useCallback(async (forLocale: string, force: boolean) => {
    inflightLocale.current = forLocale;
    setStatus('syncing');
    setError(null);
    const isCurrent = () => inflightLocale.current === forLocale;
    try {
      const fresh = await syncContent({
        locale: forLocale,
        appSlug: COAT_SLUG,
        force,
        onSnapshot: (snap) => {
          if (isCurrent()) {
            setSnapshot(snap);
            setStatus('ready');
          }
        },
      });
      if (isCurrent()) {
        setSnapshot(fresh);
        setStatus('ready');
      }
    } catch (err) {
      if (isCurrent()) {
        // A snapshot may already be showing; only flip to error when we have
        // nothing usable at all.
        setStatus((prev) => (prev === 'ready' ? 'ready' : 'error'));
        setError(err instanceof Error ? err.message : 'Sync failed');
      }
    }
  }, []);

  // Hydrate from cache + kick off a sync whenever the locale changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedSnapshot(COAT_SLUG);
      if (cancelled) return;
      if (cached && cached.locale === locale) {
        setSnapshot(cached);
        setStatus('ready');
      }
      // Always attempt a sync — syncContent decides whether the cache is fresh.
      await runSync(locale, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, runSync]);

  const countryQuestions = useMemo(() => buildCountryQuestions(snapshot), [snapshot]);

  const value: CoatContentValue = { snapshot, countryQuestions, status, error };

  return (
    <CoatContentContext.Provider value={value}>{children}</CoatContentContext.Provider>
  );
}

export function useCoatContent(): CoatContentValue {
  const ctx = useContext(CoatContentContext);
  if (!ctx) {
    throw new Error('useCoatContent must be used inside <CoatContentProvider>');
  }
  return ctx;
}
