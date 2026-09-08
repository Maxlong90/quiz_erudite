import { apiClient } from '@/api/client';

import { parseThemeEnvelope, type RemoteTheme } from './contract';

/**
 * Tier 3 of the theme engine: the conditional GET.
 *
 * GET /api/v1/apps/{slug}/theme takes NO query parameters (colours are
 * locale-independent) and answers with a strong ETag over the emitted bytes.
 * The steady state is therefore a ~200-byte 304, not a payload.
 *
 * This function NEVER throws. Every path — including a malformed body, a DNS
 * failure and a timeout — resolves to a ThemeFetchResult the caller handles.
 */

/**
 * Deliberately far below apiClient's shared 15s: a theme is optional, a splash
 * budget is not. Kept under the splash's 3500ms cap so the timeout, not the cap,
 * is the normal exit path on a black-hole network.
 */
export const THEME_FETCH_TIMEOUT_MS = 2500;

export type ThemeFetchResult =
  | { status: 'updated'; etag: string | null; schemaVersion: number; theme: RemoteTheme }
  | { status: 'unchanged' }
  | { status: 'unsupported'; schemaVersion: number }
  | { status: 'failed'; error: unknown };

/**
 * Case-insensitively, and through either shape axios hands back: an AxiosHeaders
 * instance (which exposes `.get`) or a plain object.
 */
function readEtag(headers: unknown): string | null {
  if (typeof headers !== 'object' || headers === null) return null;
  const bag = headers as Record<string, unknown> & { get?: (name: string) => unknown };

  const candidates: unknown[] = [];
  if (typeof bag.get === 'function') candidates.push(bag.get('etag'));
  candidates.push(bag.etag, bag.ETag, bag.Etag);

  for (const value of candidates) {
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return null;
}

/**
 * @param etag The ETag held for this app, replayed VERBATIM (quotes included) as
 *   If-None-Match. Pass `null` to force an unconditional fetch — that is how the
 *   gallery's "Refetch now" makes a Nova edit visible in seconds.
 */
export async function fetchAppTheme(
  appSlug: string,
  etag: string | null,
): Promise<ThemeFetchResult> {
  try {
    const response = await apiClient.get(`/apps/${encodeURIComponent(appSlug)}/theme`, {
      timeout: THEME_FETCH_TIMEOUT_MS,
      // Symfony emits `ETag: "<sha256hex>"`. The quotes are part of the value:
      // stripping or re-adding them yields a validator the backend never matches,
      // which would turn every launch into a full download.
      headers: etag ? { 'If-None-Match': etag } : undefined,
      // Axios treats 304 as an ERROR by default (it is outside 2xx), so without
      // this the entire steady-state path lands in the catch block below and the
      // conditional request buys us nothing.
      validateStatus: (status) => status === 304 || (status >= 200 && status < 300),
    });

    // A 304 has NO BODY — Symfony's setNotModified() strips it along with
    // Content-Type. Never hand it to a JSON parser.
    if (response.status === 304) return { status: 'unchanged' };

    const receivedEtag = readEtag(response.headers);

    // React Native's HTTP layer caches on our behalf (Android installs a 10MB
    // OkHttp response cache; iOS has NSURLCache). With `Cache-Control:
    // public, no-cache` the platform may revalidate itself and hand us back a
    // 200 carrying the PREVIOUSLY CACHED body. So "changed" is decided by the
    // validator, not by the status code.
    if (etag !== null && receivedEtag !== null && receivedEtag === etag) {
      return { status: 'unchanged' };
    }

    const parsed = parseThemeEnvelope(response.data);
    if (!parsed.ok) {
      if (parsed.reason === 'unsupported-schema') {
        return { status: 'unsupported', schemaVersion: parsed.schemaVersion as number };
      }
      return {
        status: 'failed',
        error: new Error(`Malformed theme payload for "${appSlug}"`),
      };
    }

    return {
      status: 'updated',
      etag: receivedEtag,
      schemaVersion: parsed.schemaVersion,
      theme: parsed.theme,
    };
  } catch (error) {
    // Offline, DNS failure, 5xx, timeout — all the same to a caller whose only
    // recourse is to keep showing the theme it already has.
    return { status: 'failed', error };
  }
}
