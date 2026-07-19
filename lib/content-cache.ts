import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { apiClient, APP_SLUG } from '@/api/client';

// On web there's no writable filesystem (FileSystem.documentDirectory is
// null), so we skip the local image cache entirely — the browser caches
// images itself and resolveLocalImage falls back to the remote URL.
const IS_WEB = Platform.OS === 'web';

const SNAPSHOT_KEY = 'content.snapshot.v1';
const VERSION_KEY = 'content.snapshot.version.v1';
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const IMAGE_DIR = FileSystem.documentDirectory + 'snapshot-images/';
const IMAGE_DOWNLOAD_CONCURRENCY = 6;

export interface SnapshotCategory {
  slug: string;
  name: string;
  sort_order: number;
  icon_emoji?: string | null;
  icon_url?: string | null;
  subcategories: SnapshotSubcategory[];
}

export interface SnapshotSubcategory {
  slug: string;
  name: string;
  sort_order: number;
  icon_emoji?: string | null;
  icon_url?: string | null;
}

export interface SnapshotQuestion {
  id: number;
  category_slug: string | null;
  question: string;
  options: string[];
  correct_option: number;
  explanation: string | null;
  image_url: string | null;
}

export interface ContentSnapshot {
  app: {
    slug: string;
    name: string;
    supported_locales: string[];
    /**
     * When true, the paywall shows a discreet "reviewer access" button that
     * unlocks premium without a purchase, so a store reviewer (Google Play /
     * App Store) can verify the paid functionality. Toggled per-app in the
     * backend admin; absent on older snapshots (treat as false).
     */
    show_paywall_review_button?: boolean;
    /**
     * Per-app backend flag. Gates the forced post-onboarding paywall on
     * Android; absent/false = do not force the paywall (reviewer-safe default).
     */
    show_paywall_android?: boolean;
    /**
     * Per-app backend flag. Gates the forced post-onboarding paywall on iOS;
     * absent/false = do not force the paywall (reviewer-safe default). Only
     * takes effect once iOS billing is enabled (a RevenueCat iOS key exists),
     * so a paywall is never forced on a platform that cannot charge.
     */
    show_paywall_ios?: boolean;
    /**
     * Seconds the paywall hides BOTH exits (the close ✕ and the
     * "continue free" link) before revealing them, forcing the user to
     * view the offer first. 0 / absent = exits shown immediately.
     * Backend-controlled per-app; applies on all platforms.
     */
    seconds_before_quit_button_shown?: number;
  };
  locale: string;
  version: number;
  generated_at: string;
  categories: SnapshotCategory[];
  questions: SnapshotQuestion[];
  // Filled by the client after image download — maps remote URL to a
  // local file URI the UI can render directly.
  imageMap?: Record<string, string>;
  /** Wall-clock time (ms) the snapshot was last persisted. */
  syncedAt?: number;
}

interface SnapshotResponse extends Omit<ContentSnapshot, 'imageMap' | 'syncedAt'> {}

async function ensureImageDir() {
  if (IS_WEB) return;
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

function imageFilename(url: string): string {
  // Stable filename from the URL path; the backend already includes
  // a 6-char random suffix per question, so collisions are unlikely.
  const last = url.split('/').pop() ?? 'image';
  return last.replace(/[^a-z0-9._-]/gi, '_');
}

interface DownloadProgress {
  total: number;
  done: number;
}

async function downloadImagesWithLimit(
  urls: string[],
  onProgress: (p: DownloadProgress) => void,
): Promise<Record<string, string>> {
  // Web: no local download — report complete immediately and let the
  // UI render images straight from their remote URLs.
  if (IS_WEB) {
    onProgress({ total: urls.length, done: urls.length });
    return {};
  }

  const map: Record<string, string> = {};
  let done = 0;
  const total = urls.length;

  const queue = [...urls];
  async function worker() {
    while (queue.length) {
      const url = queue.shift();
      if (!url) break;
      const dest = IMAGE_DIR + imageFilename(url);
      try {
        const info = await FileSystem.getInfoAsync(dest);
        if (!info.exists) {
          await FileSystem.downloadAsync(url, dest);
        }
        map[url] = dest;
      } catch {
        // Failed downloads are skipped; quiz screen will fall back to
        // the remote URL if the local file isn't there.
      } finally {
        done++;
        onProgress({ total, done });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(IMAGE_DOWNLOAD_CONCURRENCY, total) }, worker),
  );

  return map;
}

export async function loadCachedSnapshot(): Promise<ContentSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ContentSnapshot;
  } catch {
    return null;
  }
}

export async function getCachedVersion(): Promise<number | null> {
  const v = await AsyncStorage.getItem(VERSION_KEY);
  return v ? Number(v) : null;
}

export async function clearCache() {
  await AsyncStorage.multiRemove([SNAPSHOT_KEY, VERSION_KEY]);
  if (IS_WEB) return;
  try {
    await FileSystem.deleteAsync(IMAGE_DIR, { idempotent: true });
  } catch {
    // ignore
  }
}

export interface SyncOptions {
  locale: string;
  /** Force a re-fetch even if the cached snapshot is fresh. */
  force?: boolean;
  onProgress?: (progress: number) => void;
  /**
   * Fires as soon as the snapshot JSON is fetched — categories, questions, and
   * the `app` config block that gates the paywall — BEFORE the (much slower)
   * image download runs. Lets the intro flow decide the post-onboarding
   * destination and the UI render immediately, while images keep downloading
   * in the background and refresh via the returned snapshot. Any previously
   * cached local images are carried over so nothing already visible flickers.
   */
  onSnapshot?: (snapshot: ContentSnapshot) => void;
}

/**
 * Pull the full content snapshot for the configured app, write it to
 * AsyncStorage, and download every referenced image into the local
 * filesystem. Reports progress as 0..1 — first 20% covers the JSON
 * fetch, the remaining 80% covers image downloads.
 *
 * The JSON (including the `app` config that gates the paywall) is surfaced via
 * `onSnapshot` the moment it arrives, so callers never have to wait for the
 * image download to read config/content.
 */
export async function syncContent({
  locale,
  force = false,
  onProgress,
  onSnapshot,
}: SyncOptions): Promise<ContentSnapshot> {
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(1, p)));

  // Skip work if cache is fresh enough and locale matches.
  if (!force) {
    const cached = await loadCachedSnapshot();
    if (cached
      && cached.locale === locale
      && cached.syncedAt
      && Date.now() - cached.syncedAt < SNAPSHOT_TTL_MS) {
      onSnapshot?.(cached);
      report(1);
      return cached;
    }
  }

  await ensureImageDir();

  report(0.05);
  const { data } = await apiClient.get<SnapshotResponse>(
    `/apps/${APP_SLUG}/snapshot`,
    { params: { locale } },
  );
  report(0.2);

  // Surface the JSON immediately — reusing any already-downloaded local images
  // so previously visible artwork doesn't disappear while the fresh set loads.
  // The paywall/onboarding gate reads app config from here and no longer blocks
  // on the image download below.
  const previousImageMap = force ? {} : ((await loadCachedSnapshot())?.imageMap ?? {});
  onSnapshot?.({ ...data, imageMap: previousImageMap, syncedAt: Date.now() });

  const categoryIconUrls = data.categories.flatMap((cat) => [
    cat.icon_url,
    ...cat.subcategories.map((sub) => sub.icon_url),
  ]);
  const urls = Array.from(new Set(
    [
      ...data.questions.map((q) => q.image_url),
      ...categoryIconUrls,
    ].filter((u): u is string => !!u),
  ));

  const imageMap = await downloadImagesWithLimit(urls, ({ total, done }) => {
    if (total === 0) {
      report(1);
      return;
    }
    report(0.2 + 0.8 * (done / total));
  });

  const snapshot: ContentSnapshot = {
    ...data,
    imageMap,
    syncedAt: Date.now(),
  };

  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  await AsyncStorage.setItem(VERSION_KEY, String(snapshot.version));

  report(1);
  return snapshot;
}

/** Resolve an image URL to a local file path if we have one cached. */
export function resolveLocalImage(snapshot: ContentSnapshot | null, url: string | null): string | null {
  if (!url) return null;
  return snapshot?.imageMap?.[url] ?? url;
}
