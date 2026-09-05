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
import { Image } from 'expo-image';

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
      // Make the questions playable IMMEDIATELY — the option images resolve from
      // their remote URLs until the local cache warms, so the user never waits
      // for ~780 downloads before "By continent" opens.
      if (isCurrent()) {
        setImageAnswer({ locale: forLocale, raw, imageMap: {} });
        setStatus('ready');
      }
      // Download the option images into the offline cache in the background, then
      // swap in the local map so subsequent plays are offline-ready.
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
      // Stale-while-revalidate: the cache above shows instantly; force a fresh
      // fetch so a grown catalogue (e.g. 50 → 195 coats) is picked up right away
      // instead of waiting out the 24h snapshot TTL.
      await runSync(locale, true);
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

  // Preload EVERY gameplay image up-front (both modes) into the memory+disk
  // cache, so nothing streams in mid-game and a fast run of answer taps never
  // flashes empty white tiles. Fire-and-forget and fail-open; re-runs as the
  // question sets — or their warmed local URIs — change.
  useEffect(() => {
    const urls = [
      ...countryQuestions.map((q) => q.imageUri),
      // The reward originals too: the reveal starts the instant a correct answer
      // lands, so the bytes must already be DECODED in the memory cache — a warm
      // disk file alone still costs a decode frame. On web (no local cache) this
      // is what makes the reveal work at all, pre-pulling the remote original
      // into the browser cache (served immutable, so it sticks).
      ...countryQuestions.map((q) => q.originalImageUri),
      ...pictureQuestions.flatMap((q) => q.optionImageUris),
    ].filter((u): u is string => !!u);
    if (urls.length === 0) return;
    Image.prefetch(urls, { cachePolicy: 'memory-disk' }).catch(() => {});
  }, [countryQuestions, pictureQuestions]);

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
