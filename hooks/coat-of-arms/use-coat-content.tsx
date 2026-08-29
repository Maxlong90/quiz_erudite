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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { apiClient } from '@/api/client';
import {
  cacheImages,
  loadCachedSnapshot,
  syncContent,
  type ContentSnapshot,
} from '@/lib/content-cache';
import {
  buildCountryQuestions,
  continentCounts,
  groupByContinent,
  optionImageUrls,
  type FlagCountryQuestion,
  type FlagPictureQuestion,
  type ImageAnswerApiQuestion,
} from '@/lib/flags-quiz/content';
import { COAT_QUIZ_SLUG, buildCoatPictureQuestions } from '@/lib/coat-of-arms/content';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

/** Offline cache of the image-answer payload (kept out of the snapshot). */
interface ImageAnswerCache {
  locale: string;
  raw: ImageAnswerApiQuestion[];
  imageMap: Record<string, string>;
}

const IMAGE_ANSWER_KEY = 'coat.imageAnswer.v1';

interface CoatContentValue {
  /** Full snapshot (backs the "All countries" mode + app config). */
  snapshot: ContentSnapshot | null;
  /** "All countries": coat-of-arms image + text options (all image_questions). */
  countryQuestions: FlagCountryQuestion[];
  /** "By continent": country name + coat-image options, grouped by continent. */
  pictureByContinent: Partial<Record<ContinentKey, FlagPictureQuestion[]>>;
  /** Per-continent question counts (drives the continents list badges). */
  countsByContinent: Partial<Record<ContinentKey, number>>;
  status: Status;
  error: string | null;
}

const CoatContentContext = createContext<CoatContentValue | null>(null);

/** Unwrap a Laravel resource collection ({data:[...]}) or a bare array. */
function unwrapCollection(data: unknown): ImageAnswerApiQuestion[] {
  if (Array.isArray(data)) return data as ImageAnswerApiQuestion[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: ImageAnswerApiQuestion[] }).data;
  }
  return [];
}

/**
 * Offline-first content provider for the Coat of Arms quiz. Same mechanics as the
 * Flags Quiz provider — the `coat-of-arms` slug — for BOTH modes:
 *   1. The content snapshot — image_questions (coat → text) for "All countries".
 *   2. The image-answer endpoint — image_answer_questions (country name → 4 coat
 *      images) for "By continent"; its option images are downloaded into the same
 *      namespaced cache and the payload is persisted for offline play.
 * Both re-sync on locale change so names, options and explanations follow the
 * active language.
 */
export function CoatContentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [imageAnswer, setImageAnswer] = useState<ImageAnswerCache | null>(null);
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
      // 1. Snapshot (coat → text). Surface JSON early, then refresh with images.
      const fresh = await syncContent({
        locale: forLocale,
        appSlug: COAT_QUIZ_SLUG,
        force,
        onSnapshot: (snap) => {
          if (isCurrent()) {
            setSnapshot(snap);
            setStatus('ready');
          }
        },
      });
      if (isCurrent()) setSnapshot(fresh);

      // 2. Image-answer questions (country name → 4 coat images). Own endpoint +
      //    own image download into the shared namespaced cache.
      const res = await apiClient.get(`/apps/${COAT_QUIZ_SLUG}/image-answer-questions`, {
        params: { locale: forLocale },
      });
      const raw = unwrapCollection(res.data);
      const imageMap = await cacheImages(optionImageUrls(raw), COAT_QUIZ_SLUG);
      const cache: ImageAnswerCache = { locale: forLocale, raw, imageMap };
      await AsyncStorage.setItem(IMAGE_ANSWER_KEY, JSON.stringify(cache));

      if (isCurrent()) {
        setImageAnswer(cache);
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
      const [cachedSnap, cachedIaRaw] = await Promise.all([
        loadCachedSnapshot(COAT_QUIZ_SLUG),
        AsyncStorage.getItem(IMAGE_ANSWER_KEY),
      ]);
      if (cancelled) return;
      if (cachedSnap && cachedSnap.locale === locale) {
        setSnapshot(cachedSnap);
        setStatus('ready');
      }
      if (cachedIaRaw) {
        try {
          const parsed = JSON.parse(cachedIaRaw) as ImageAnswerCache;
          if (parsed.locale === locale) setImageAnswer(parsed);
        } catch {
          // ignore malformed cache
        }
      }
      // Always attempt a sync — syncContent decides whether the cache is fresh.
      await runSync(locale, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, runSync]);

  const countryQuestions = useMemo(() => buildCountryQuestions(snapshot), [snapshot]);
  const pictureQuestions = useMemo(
    () => (imageAnswer ? buildCoatPictureQuestions(imageAnswer.raw, imageAnswer.imageMap) : []),
    [imageAnswer],
  );
  const pictureByContinent = useMemo(() => groupByContinent(pictureQuestions), [pictureQuestions]);
  const countsByContinent = useMemo(() => continentCounts(pictureQuestions), [pictureQuestions]);

  const value: CoatContentValue = {
    snapshot,
    countryQuestions,
    pictureByContinent,
    countsByContinent,
    status,
    error,
  };

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
