import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { apiClient, APP_SLUG } from '@/api/client';

const SNAPSHOT_KEY = 'content.snapshot.v1';
const VERSION_KEY = 'content.snapshot.version.v1';
const SNAPSHOT_TTL_MS = 24 * 60 * 60 * 1000;
const IMAGE_DIR = FileSystem.documentDirectory + 'snapshot-images/';
const IMAGE_DOWNLOAD_CONCURRENCY = 6;

export interface SnapshotCategory {
  slug: string;
  name: string;
  sort_order: number;
  subcategories: SnapshotSubcategory[];
}

export interface SnapshotSubcategory {
  slug: string;
  name: string;
  sort_order: number;
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
}

/**
 * Pull the full content snapshot for the configured app, write it to
 * AsyncStorage, and download every referenced image into the local
 * filesystem. Reports progress as 0..1 — first 20% covers the JSON
 * fetch, the remaining 80% covers image downloads.
 */
export async function syncContent({
  locale,
  force = false,
  onProgress,
}: SyncOptions): Promise<ContentSnapshot> {
  const report = (p: number) => onProgress?.(Math.max(0, Math.min(1, p)));

  // Skip work if cache is fresh enough and locale matches.
  if (!force) {
    const cached = await loadCachedSnapshot();
    if (cached
      && cached.locale === locale
      && cached.syncedAt
      && Date.now() - cached.syncedAt < SNAPSHOT_TTL_MS) {
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

  const urls = Array.from(new Set(
    data.questions.map((q) => q.image_url).filter((u): u is string => !!u),
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
