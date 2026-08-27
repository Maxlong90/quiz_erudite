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
  FLAGS_QUIZ_SLUG,
  buildCountryQuestions,
  buildPictureQuestions,
  continentCounts,
  groupByContinent,
  optionImageUrls,
  type FlagCountryQuestion,
  type FlagPictureQuestion,
  type ImageAnswerApiQuestion,
} from '@/lib/flags-quiz/content';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';

type Status = 'idle' | 'syncing' | 'ready' | 'error';

/** Offline cache of the image-answer payload (kept out of the snapshot). */
interface ImageAnswerCache {
  locale: string;
  raw: ImageAnswerApiQuestion[];
  imageMap: Record<string, string>;
}

const IMAGE_ANSWER_KEY = 'flags.imageAnswer.v1';

interface FlagsQuizContentValue {
  /** Full snapshot (backs the "All countries" mode + app config). */
  snapshot: ContentSnapshot | null;
  /** "All countries": flag image + text options (all image_questions). */
  countryQuestions: FlagCountryQuestion[];
  /** "By continent": country name + flag-image options, grouped by continent. */
  pictureByContinent: Partial<Record<ContinentKey, FlagPictureQuestion[]>>;
  /** Per-continent question counts (drives the continents list badges). */
  countsByContinent: Partial<Record<ContinentKey, number>>;
  status: Status;
  progress: number; // 0..1
  error: string | null;
  /** Force a fresh sync now, ignoring the TTL. */
  resync: () => Promise<void>;
}

const FlagsQuizContentContext = createContext<FlagsQuizContentValue | null>(null);

/** Unwrap a Laravel resource collection ({data:[...]}) or a bare array. */
function unwrapCollection(data: unknown): ImageAnswerApiQuestion[] {
  if (Array.isArray(data)) return data as ImageAnswerApiQuestion[];
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: ImageAnswerApiQuestion[] }).data;
  }
  return [];
}

/**
 * Offline-first content provider for the Flags Quiz. Targets the `flags-quiz`
 * slug (its own namespaced cache). Two sources are fetched and shared across the
 * whole flow:
 *   1. The content snapshot — image_questions (flag → text) for "All countries".
 *   2. The image-answer endpoint — image_answer_questions (text → 4 flag images)
 *      for "By continent"; its option images are downloaded into the same
 *      namespaced image cache and the payload is persisted for offline play.
 * Both re-sync whenever the locale changes so names, options and explanations
 * follow the active language.
 */
export function FlagsQuizContentProvider({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const [snapshot, setSnapshot] = useState<ContentSnapshot | null>(null);
  const [imageAnswer, setImageAnswer] = useState<ImageAnswerCache | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Tracks the locale the running sync is for, so a fast locale flip
  // supersedes an in-flight sync.
  const inflightLocale = useRef<string | null>(null);

  const runSync = useCallback(async (forLocale: string, force: boolean) => {
    inflightLocale.current = forLocale;
    setStatus('syncing');
    setProgress(0);
    setError(null);
    const isCurrent = () => inflightLocale.current === forLocale;
    try {
      // 1. Snapshot (flag → text). Surface JSON early, then refresh with images.
      const fresh = await syncContent({
        locale: forLocale,
        appSlug: FLAGS_QUIZ_SLUG,
        force,
        onSnapshot: (snap) => {
          if (isCurrent()) {
            setSnapshot(snap);
            setStatus('ready');
          }
        },
        onProgress: (p) => {
          if (isCurrent()) setProgress(p * 0.5);
        },
      });
      if (isCurrent()) setSnapshot(fresh);

      // 2. Image-answer questions (text → 4 flag images). Own endpoint + own
      //    image download into the shared namespaced cache.
      const res = await apiClient.get(`/apps/${FLAGS_QUIZ_SLUG}/image-answer-questions`, {
        params: { locale: forLocale },
      });
      const raw = unwrapCollection(res.data);
      const imageMap = await cacheImages(optionImageUrls(raw), FLAGS_QUIZ_SLUG, (p) => {
        if (isCurrent()) setProgress(0.5 + p * 0.5);
      });
      const cache: ImageAnswerCache = { locale: forLocale, raw, imageMap };
      await AsyncStorage.setItem(IMAGE_ANSWER_KEY, JSON.stringify(cache));

      if (isCurrent()) {
        setImageAnswer(cache);
        setStatus('ready');
        setProgress(1);
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
        loadCachedSnapshot(FLAGS_QUIZ_SLUG),
        AsyncStorage.getItem(IMAGE_ANSWER_KEY),
      ]);
      if (cancelled) return;
      if (cachedSnap && cachedSnap.locale === locale) {
        setSnapshot(cachedSnap);
        setStatus('ready');
        setProgress(1);
      }
      if (cachedIaRaw) {
        try {
          const parsed = JSON.parse(cachedIaRaw) as ImageAnswerCache;
          if (parsed.locale === locale) setImageAnswer(parsed);
        } catch {
          // ignore malformed cache
        }
      }
      // Always attempt a sync — syncContent itself decides whether the snapshot
      // cache is fresh enough to skip the network call.
      await runSync(locale, false);
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, runSync]);

  const resync = useCallback(async () => {
    await runSync(locale, true);
  }, [locale, runSync]);

  const countryQuestions = useMemo(() => buildCountryQuestions(snapshot), [snapshot]);
  const pictureQuestions = useMemo(
    () => (imageAnswer ? buildPictureQuestions(imageAnswer.raw, imageAnswer.imageMap) : []),
    [imageAnswer],
  );
  const pictureByContinent = useMemo(() => groupByContinent(pictureQuestions), [pictureQuestions]);
  const countsByContinent = useMemo(() => continentCounts(pictureQuestions), [pictureQuestions]);

  const value: FlagsQuizContentValue = {
    snapshot,
    countryQuestions,
    pictureByContinent,
    countsByContinent,
    status,
    progress,
    error,
    resync,
  };

  return (
    <FlagsQuizContentContext.Provider value={value}>{children}</FlagsQuizContentContext.Provider>
  );
}

export function useFlagsQuizContent(): FlagsQuizContentValue {
  const ctx = useContext(FlagsQuizContentContext);
  if (!ctx) {
    throw new Error('useFlagsQuizContent must be used inside <FlagsQuizContentProvider>');
  }
  return ctx;
}
