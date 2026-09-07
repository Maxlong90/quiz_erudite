/**
 * Keeps a couple of Classic levels' question images warm in expo-image's decode
 * cache while the player is busy with the current one.
 *
 * The content sync already downloads BYTES in play order (see the `imageBatches`
 * option in lib/content-cache.ts), so by the time a player reaches level N the
 * files are on disk. A file on disk still costs a decode on first render though,
 * which is the difference between a picture that is simply THERE and one that
 * fades in. This hook pays that decode cost early, off the interaction thread.
 *
 * Deliberately LOCAL-ONLY: a uri that is still remote means the sync has not
 * fetched it yet, and prefetching it here would (a) steal bandwidth from the
 * ordered downloader that is already prioritising exactly these images, (b) write
 * a second copy into expo-image's own disk cache, and (c) warm a cache key the
 * app will never render anyway — once the file lands the uri flips to file://,
 * which is a different key. Downloading is the sync's job; decoding is ours.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Image } from 'expo-image';

import { buildLevels } from '@/lib/sport-quiz/content';
import type { ContentSnapshot } from '@/lib/content-cache';

/** How many levels PAST the current one to warm by default. */
const DEFAULT_LEVELS_AHEAD = 2;

// On web the content cache writes nothing (no writable filesystem) and every uri
// stays remote, so the browser cache is the only cache there is — the file://
// gate would disable warming entirely.
const IS_WEB = Platform.OS === 'web';

/** Whether this uri points at a file the content sync has already downloaded. */
function isLocal(uri: string): boolean {
  return IS_WEB || uri.startsWith('file://');
}

/**
 * Hand a set of already-downloaded question images to expo-image's decode cache.
 * Remote uris are skipped (see the module note). Resolves once the prefetch
 * settles; never rejects, so a failed decode can't break a warm chain.
 */
export function prefetchLocalImages(uris: (string | null)[]): Promise<unknown> {
  const local = uris.filter((u): u is string => !!u && isLocal(u));
  if (local.length === 0) return Promise.resolve(undefined);
  return Image.prefetch(local, { cachePolicy: 'memory-disk' }).catch(() => undefined);
}

/**
 * Warm the CURRENT level's images first, then each of the next `ahead` levels,
 * strictly one level at a time. Current-level-first is deliberate: a cold
 * question 12 in the level being played right now outranks anything in level
 * N+1. Deferred off the mount tick so grouping the pool never competes with the
 * very render it exists to smooth, and cancels cleanly on unmount or a level
 * change.
 */
export function useWarmLevelImages(
  snapshot: ContentSnapshot | null,
  level: number,
  ahead: number = DEFAULT_LEVELS_AHEAD,
) {
  useEffect(() => {
    if (!snapshot || level <= 0) return;

    let cancelled = false;
    const task = setTimeout(() => {
      // buildLevels ONCE — questionsForLevel re-sorts the entire question pool on
      // every call, so calling it per level would redo that work three times.
      const levels = buildLevels(snapshot);

      const warmFrom = (offset: number) => {
        if (cancelled || offset > ahead) return;
        const target = levels.find((l) => l.level === level + offset);
        const uris = target ? target.questions.map((q) => q.imageUri) : [];
        // Fail-open: a level with nothing local still advances to the next one.
        prefetchLocalImages(uris).then(() => {
          if (!cancelled) warmFrom(offset + 1);
        });
      };
      warmFrom(0);
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(task);
    };
  }, [snapshot, level, ahead]);
}
