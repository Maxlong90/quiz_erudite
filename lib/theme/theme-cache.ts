import AsyncStorage from '@react-native-async-storage/async-storage';

import { APP_SLUG } from '@/api/client';

import { CLIENT_THEME_SCHEMA_VERSION, parseRemoteTheme, type RemoteTheme } from './contract';

/**
 * Tier 2 of the theme engine: the last theme this device successfully fetched.
 *
 * Every read is fail-open — a corrupt, foreign or future record resolves to
 * `null`, which simply means "no cache" and drops the caller back to the bundled
 * tier. A theme is decoration; it may never be the reason the app fails to start.
 */

/**
 * The CLIENT RECORD format, deliberately not the payload's `schema_version`:
 * bumping this invalidates every device's stored blob without implying anything
 * about the wire contract.
 *
 * The `theme.remote.` prefix stays clear of 'app.theme.v1', which
 * hooks/use-theme-pref.ts owns for the dark/light preference — a collision there
 * would silently corrupt the user's appearance choice.
 */
const KEY_PREFIX = 'theme.remote.v1';
const RECORD_FORMAT = 1;

/**
 * Namespaced per app slug exactly like lib/content-cache.ts: the build's own slug
 * keeps the bare key, any secondary slug gets a suffix, so one build can hold
 * several apps' themes without clobbering.
 */
export function themeKey(appSlug: string = APP_SLUG): string {
  return `${KEY_PREFIX}${appSlug === APP_SLUG ? '' : `:${appSlug}`}`;
}

export interface CachedThemeRecord {
  /** Client record format. Anything else: treat as no cache and drop the key. */
  record: number;
  /** The backend ETag VERBATIM, quotes included. Replayed as If-None-Match. */
  etag: string | null;
  schemaVersion: number;
  theme: RemoteTheme;
  /** Paranoia against key reuse — a record for another app is not ours. */
  appSlug: string;
  /** ms epoch of the last successful revalidation (200 or 304). */
  syncedAt: number;
}

function isUsable(record: unknown, appSlug: string): record is CachedThemeRecord {
  if (typeof record !== 'object' || record === null) return false;
  const candidate = record as Partial<CachedThemeRecord>;
  if (candidate.record !== RECORD_FORMAT) return false;
  if (candidate.appSlug !== appSlug) return false;
  if (typeof candidate.schemaVersion !== 'number') return false;
  // A record written by a build that understood a shape this one does not.
  if (candidate.schemaVersion > CLIENT_THEME_SCHEMA_VERSION) return false;
  if (typeof candidate.syncedAt !== 'number') return false;
  if (candidate.etag !== null && typeof candidate.etag !== 'string') return false;
  // Re-validate the stored payload through the same parser the network uses: a
  // blob edited or truncated on disk must not reach a style prop either.
  return parseRemoteTheme(candidate.theme) !== null;
}

export async function loadCachedTheme(
  appSlug: string = APP_SLUG,
): Promise<CachedThemeRecord | null> {
  const key = themeKey(appSlug);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isUsable(parsed, appSlug)) {
      // Unreadable to this build and it never will be — reclaim the key so we
      // do not re-parse the same garbage on every launch.
      await AsyncStorage.removeItem(key).catch(() => {});
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export async function saveCachedTheme(record: CachedThemeRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(themeKey(record.appSlug), JSON.stringify(record));
  } catch {
    // Persisting is best-effort: the theme is already applied in memory, and the
    // next launch simply refetches it.
  }
}

/**
 * A 304 says the cached theme is still current. Nothing about the palette
 * changes — only the freshness stamp, which is what the gallery reports.
 */
export async function touchCachedTheme(
  appSlug: string = APP_SLUG,
  syncedAt: number = Date.now(),
): Promise<void> {
  const existing = await loadCachedTheme(appSlug);
  if (!existing) return;
  await saveCachedTheme({ ...existing, syncedAt });
}

export async function clearCachedTheme(appSlug: string = APP_SLUG): Promise<void> {
  try {
    await AsyncStorage.removeItem(themeKey(appSlug));
  } catch {
    // ignore
  }
}
