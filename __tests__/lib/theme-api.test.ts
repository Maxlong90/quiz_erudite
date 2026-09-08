/**
 * The conditional GET (lib/theme/theme-api.ts).
 *
 * Three non-obvious traps live in this one function, and each has a test below:
 *
 *   1. Axios treats 304 as an ERROR (it is outside 2xx). Without validateStatus
 *      the entire steady-state path lands in the catch block and the conditional
 *      request buys nothing.
 *   2. React Native's platform HTTP cache (OkHttp on Android, NSURLCache on iOS)
 *      may revalidate on our behalf and return a 200 carrying the PREVIOUSLY
 *      CACHED body. "Changed" must therefore be decided by the validator, not by
 *      the status code.
 *   3. The ETag's quotes are part of its value. Stripping or re-adding them
 *      yields a validator the backend never matches.
 */
const mockGet = jest.fn();
jest.mock('@/api/client', () => ({
  APP_SLUG: 'configurable-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));

import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { THEME_FETCH_TIMEOUT_MS, fetchAppTheme } from '@/lib/theme/theme-api';

const ETAG = '"11511dfaed2703fa7de40fbbfac96552721edf14905494dc86e00397889afb4a"';

function body(overrides: Record<string, unknown> = {}) {
  return { schema_version: 1, theme: BUNDLED_THEME, ...overrides };
}

function ok(data: unknown, etag: string | null = ETAG) {
  return { status: 200, data, headers: etag ? { etag } : {} };
}

/** The last request's config object. */
function lastConfig(): Record<string, any> {
  return mockGet.mock.calls[mockGet.mock.calls.length - 1][1];
}

beforeEach(() => jest.clearAllMocks());

describe('fetchAppTheme', () => {
  it('requests the theme endpoint with NO query parameters', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    await fetchAppTheme('configurable-quiz', null);

    const [url, config] = mockGet.mock.calls[0];
    // Colours are locale-independent; a query param would fork the ETag space.
    expect(url).toBe('/apps/configurable-quiz/theme');
    expect(config.params).toBeUndefined();
  });

  it('uses a short per-request timeout, not the shared 15s client one', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    await fetchAppTheme('configurable-quiz', null);

    // A theme is optional; a splash budget is not.
    expect(lastConfig().timeout).toBe(THEME_FETCH_TIMEOUT_MS);
    expect(THEME_FETCH_TIMEOUT_MS).toBe(2500);
  });

  it('accepts 304 as a valid status (trap 1)', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    await fetchAppTheme('configurable-quiz', null);

    const { validateStatus } = lastConfig();
    expect(validateStatus(304)).toBe(true);
    expect(validateStatus(200)).toBe(true);
    expect(validateStatus(404)).toBe(false);
    expect(validateStatus(500)).toBe(false);
  });

  it('returns the parsed theme on a 200', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    const result = await fetchAppTheme('configurable-quiz', null);

    expect(result).toEqual({
      status: 'updated',
      etag: ETAG,
      schemaVersion: 1,
      theme: BUNDLED_THEME,
    });
  });

  it('stores the ETag VERBATIM, quotes included (trap 3)', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    const result = await fetchAppTheme('configurable-quiz', null);

    expect(result.status).toBe('updated');
    if (result.status !== 'updated') return;
    expect(result.etag).toBe(ETAG);
    expect(result.etag?.startsWith('"')).toBe(true);
    expect(result.etag?.endsWith('"')).toBe(true);
  });

  it('reads the ETag from an AxiosHeaders-style bag', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      data: body(),
      headers: { get: (name: string) => (name === 'etag' ? ETAG : undefined) },
    });
    const result = await fetchAppTheme('configurable-quiz', null);
    expect(result.status === 'updated' && result.etag).toBe(ETAG);
  });

  it('replays a held ETag as If-None-Match, byte for byte', async () => {
    mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: ETAG } });
    await fetchAppTheme('configurable-quiz', ETAG);

    expect(lastConfig().headers).toEqual({ 'If-None-Match': ETAG });
  });

  it('omits If-None-Match entirely when forced (etag null)', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    await fetchAppTheme('configurable-quiz', null);

    // That unconditional GET is what makes a fresh Nova edit visible without a
    // relaunch or a cache-busting dance.
    expect(lastConfig().headers).toBeUndefined();
  });

  it('reports 304 as unchanged and NEVER parses its (empty) body', async () => {
    // Symfony's setNotModified() strips the body and the Content-Type.
    mockGet.mockResolvedValueOnce({ status: 304, data: '', headers: { etag: ETAG } });
    await expect(fetchAppTheme('configurable-quiz', ETAG)).resolves.toEqual({
      status: 'unchanged',
    });
  });

  it('reports a 200 whose ETag matches the held one as unchanged (trap 2)', async () => {
    // The RN platform cache revalidated for us and replayed the cached body.
    mockGet.mockResolvedValueOnce(ok(body(), ETAG));
    await expect(fetchAppTheme('configurable-quiz', ETAG)).resolves.toEqual({
      status: 'unchanged',
    });
  });

  it('reports a 200 with a DIFFERENT ETag as updated', async () => {
    mockGet.mockResolvedValueOnce(ok(body(), '"newvalidator"'));
    const result = await fetchAppTheme('configurable-quiz', ETAG);
    expect(result.status).toBe('updated');
    if (result.status === 'updated') expect(result.etag).toBe('"newvalidator"');
  });

  it('reports updated when the response carries no ETag at all', async () => {
    mockGet.mockResolvedValueOnce(ok(body(), null));
    const result = await fetchAppTheme('configurable-quiz', ETAG);
    expect(result.status).toBe('updated');
    if (result.status === 'updated') expect(result.etag).toBeNull();
  });

  it('reports a newer schema as unsupported', async () => {
    mockGet.mockResolvedValueOnce(ok(body({ schema_version: 2 })));
    await expect(fetchAppTheme('configurable-quiz', null)).resolves.toEqual({
      status: 'unsupported',
      schemaVersion: 2,
    });
  });

  it('reports a malformed body as failed, so the caller keeps its last-known-good', async () => {
    mockGet.mockResolvedValueOnce(ok({ schema_version: 1, theme: { name: 'broken' } }));
    const result = await fetchAppTheme('configurable-quiz', null);
    expect(result.status).toBe('failed');
  });

  it('reports an HTML error page as failed rather than crashing', async () => {
    mockGet.mockResolvedValueOnce(ok('<!doctype html><h1>502</h1>'));
    expect((await fetchAppTheme('configurable-quiz', null)).status).toBe('failed');
  });

  it('reports a network error as failed', async () => {
    mockGet.mockRejectedValueOnce(new Error('Network Error'));
    const result = await fetchAppTheme('configurable-quiz', ETAG);
    expect(result.status).toBe('failed');
    if (result.status === 'failed') expect((result.error as Error).message).toBe('Network Error');
  });

  it('reports a timeout as failed', async () => {
    mockGet.mockRejectedValueOnce(Object.assign(new Error('timeout of 2500ms'), {
      code: 'ECONNABORTED',
    }));
    expect((await fetchAppTheme('configurable-quiz', ETAG)).status).toBe('failed');
  });

  it('NEVER throws, whatever the transport does', async () => {
    for (const rejection of [new Error('boom'), 'a string', null, undefined]) {
      mockGet.mockRejectedValueOnce(rejection);
      await expect(fetchAppTheme('configurable-quiz', null)).resolves.toHaveProperty(
        'status',
        'failed',
      );
    }
  });

  it('url-encodes the slug', async () => {
    mockGet.mockResolvedValueOnce(ok(body()));
    await fetchAppTheme('weird slug/../x', null);
    expect(mockGet.mock.calls[0][0]).toBe('/apps/weird%20slug%2F..%2Fx/theme');
  });
});
