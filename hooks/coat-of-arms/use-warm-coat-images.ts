/**
 * Keeps the next few Coat of Arms questions' images warm in expo-image's decode
 * cache while the player is busy with the current one.
 *
 * The content sync already downloads the priority coats' BYTES in play order
 * (see the `imageBatches` option in lib/content-cache.ts + use-coat-content),
 * so by the time a player reaches a question the file is usually on disk. A file
 * on disk still costs a decode on first render though, which is the difference
 * between a picture that is simply THERE and one that fades in. This hook pays
 * that decode cost early, off the interaction thread.
 *
 * Deliberately LOCAL-ONLY: a uri that is still remote means the sync has not
 * fetched it yet, and prefetching it here would (a) steal bandwidth from the
 * ordered downloader, (b) write a second copy into expo-image's own disk cache,
 * and (c) warm a cache key the app will never render — once the file lands the
 * uri flips to file://, a different key. Downloading is the sync's job; decoding
 * is ours. (A coat-owned copy of the Sport Quiz mechanics — the sibling apps
 * stay independent, so nothing is imported across them.)
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { Image } from 'expo-image';

/** How many questions PAST the current one to warm by default. */
const DEFAULT_AHEAD = 3;

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
 * Warm the CURRENT play-order question's images first, then each of the next
 * `ahead` questions, strictly one at a time. `perQuestion[i]` holds the image
 * uris for the question at play-order position i (built from the screen's
 * shuffled `order`), so the front of the load always runs ahead of the player.
 * Deferred off the mount tick so grouping the pool never competes with the very
 * render it exists to smooth, and cancels cleanly on unmount or a dep change.
 */
export function useWarmAheadImages(
  perQuestion: (string | null)[][],
  pos: number,
  ahead: number = DEFAULT_AHEAD,
) {
  useEffect(() => {
    if (pos < 0 || perQuestion.length === 0) return;

    let cancelled = false;
    const task = setTimeout(() => {
      const warmFrom = (offset: number) => {
        if (cancelled || offset > ahead) return;
        const uris = perQuestion[pos + offset] ?? [];
        // Fail-open: a question with nothing local still advances to the next.
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
  }, [perQuestion, pos, ahead]);
}
