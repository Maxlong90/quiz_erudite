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
  correctOptionOriginalUrls,
  groupByContinent,
  optionImageUrls,
  type FlagCountryQuestion,
  type FlagPictureQuestion,
  type ImageAnswerApiQuestion,
} from '@/lib/flags-quiz/content';
import { COAT_QUIZ_SLUG, PRIORITY_COUNT, buildCoatPictureQuestions } from '@/lib/coat-of-arms/content';
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
  /**
   * One-way latch: `true` once the first `PRIORITY_COUNT` "All countries" coats
   * are on disk (fresh install), or immediately for a returning player whose
   * snapshot is already cached. The splash gates on it; only ever set `true`, so
   * a re-sync / locale flip can never re-trap the player behind the splash.
   */
  priorityReady: boolean;
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
  // One-way latch — see CoatContentValue.priorityReady. Never reset to false.
  const [priorityReady, setPriorityReady] = useState(false);
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
      //    The first PRIORITY_COUNT coats download FIRST, in play order, as their
      //    own batch — the splash gates on that batch finishing (priorityReady),
      //    while the rest of the catalogue trails as a background batch.
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
        // Reads the RAW remote urls (this snapshot has no imageMap yet), so key
        // off `image_url`, not a resolved `imageUri`.
        imageBatches: (data) => [
          data.questions
            .slice(0, PRIORITY_COUNT)
            .map((q) => q.image_url)
            .filter((u): u is string => !!u),
        ],
        onBatchImages: (_map, batchIndex) => {
          if (isCurrent() && batchIndex === 0) setPriorityReady(true);
        },
      });
      if (isCurrent()) setSnapshot(fresh);
      // Belt-and-suspenders: the full sync is done, so the priority coats are
      // definitely on disk. Covers the dropped-empty-batch-0 edge and web, where
      // the batch "download" is a no-op that still needs to open the gate.
      if (isCurrent()) setPriorityReady(true);

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
      // swap in the local map so subsequent plays are offline-ready. The CORRECT
      // options' originals ride along (~64 distinct files) so the post-answer
      // reveal works offline too; cacheImages de-duplicates, and the other three
      // options' originals are deliberately left out — they are never shown.
      const imageMap = await cacheImages(
        [...optionImageUrls(raw), ...correctOptionOriginalUrls(raw)],
        COAT_QUIZ_SLUG,
      );
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
        // Returning player: the priority coats are already on disk, so open the
        // splash gate at the 3s floor rather than making them wait out a re-sync.
        setPriorityReady(true);
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

  // NOTE: there is deliberately NO bulk `Image.prefetch` of the whole catalogue
  // here any more. Firing ~844 unordered downloads at once contended with the
  // ordered `syncContent` downloader on a fresh install and had no readiness
  // signal. Bytes now arrive in play order (batch 0 = the priority coats), the
  // splash warms the first porción on the way out, and the game screens warm the
  // next few questions as the player advances (useWarmAheadImages). The spoiler
  // guard is unchanged — only the CORRECT option's original is ever fetched, at
  // the download layer (correctOptionOriginalUrls → cacheImages, above).

  const value: CoatContentValue = {
    snapshot,
    countryQuestions,
    pictureByContinent,
    countsByContinent,
    status,
    error,
    priorityReady,
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
