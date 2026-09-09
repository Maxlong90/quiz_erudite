/**
 * THE LIVE CONTRACT CHECK — deliberately OUTSIDE the default suite.
 *
 * The default `npm test` is offline by documented design (docs/development.md):
 * no backend dependency, ~13s, no network flakes. This file does not match the
 * default testMatch (`*.test.ts`), so `npm test` never runs it. Run it
 * explicitly:
 *
 *     npm run check:theme-contract
 *
 * It re-checks, against the REAL backend, exactly the three facts that would
 * have caught the v1-vs-v2 breakage before it shipped:
 *
 *   1. the schema version the backend serves equals the one this client
 *      declares — a HIGHER one fails, because that is the drift class this
 *      project already suffered (every installed client silently rejecting the
 *      envelope, preset edits not arriving, nothing logged);
 *   2. the live body of both the erudite and the template slug parses cleanly
 *      through this build's own parser — a non-hex value, a missing key or a
 *      malformed gradient would fail here first;
 *   3. the erudite slug's defaults equal the fixture transcription
 *      (__tests__/fixtures/remote-theme-v2.ts), so the offline parity pin and
 *      the live backend cannot drift apart.
 *
 * Two findings are deliberately WARNED rather than failed: served keys this
 * client does not know (forward-compatible by design — parseTokens drops them)
 * and an unknown onboarding_type (degrades to the default by design). The
 * reporters below log those warnings; a healthy backend warns about nothing and
 * the check stays green either way.
 *
 * The transport is a small GET over Node's https module rather than the app's
 * apiClient: the client module carries build-time env constants and a shared
 * timeout, and this probe wants the raw endpoint with its own budget. (axios
 * would be the obvious choice but its adapter dispatch cannot resolve under
 * jest-expo's module registry — node core `https` is the real transport either
 * way.)
 */
import https from 'https';

import { CLIENT_THEME_SCHEMA_VERSION, REMOTE_TOKEN_KEYS, parseThemeEnvelope } from '@/lib/theme/contract';
import { T_ONBOARDING_TYPES } from '@/lib/onboarding/onboarding-type';
import {
  BACKEND_DARK_DEFAULTS_V2,
  BACKEND_LIGHT_DEFAULTS_V2,
  SCHEMA_VERSION_V2,
} from '@/__tests__/fixtures/remote-theme-v2';

const API_HOST = 'quiz-erudit-backend.turbosuslik.online';
const API_PATH = '/api/v1';

// The erudite slug is the transcription source: its preset stores NULL tokens,
// so its payload IS the default set. test-quiz may carry operator overrides at
// any time — its parse must still succeed, but its values are not pinned.
const SLUGS = ['erudite-quiz', 'test-quiz'] as const;

jest.setTimeout(15_000);

interface LiveBody {
  schema_version: number;
  onboarding_type?: unknown;
  theme: {
    name: string | null;
    supports_dark: boolean;
    light: Record<string, unknown>;
    dark: Record<string, unknown>;
  };
}

/**
 * A plain HTTPS GET with a hard deadline. Throws on transport failure, on any
 * non-2xx status and on a non-JSON body — a failing check must fail loudly,
 * never skip.
 */
function fetchJson(url: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { timeout: 5000 }, (response) => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        raw += chunk;
      });
      response.on('end', () => {
        if (response.statusCode === undefined || response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(`GET ${url} -> HTTP ${response.statusCode}`));
          return;
        }
        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          reject(new Error(`GET ${url} returned non-JSON: ${(error as Error).message}`));
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error(`GET ${url} timed out after 5000ms`)));
    request.on('error', reject);
  });
}

async function fetchBody(slug: string): Promise<LiveBody> {
  const body = await fetchJson(
    `https://${API_HOST}${API_PATH}/apps/${encodeURIComponent(slug)}/theme`,
  );
  if (typeof body !== 'object' || body === null) {
    throw new Error(`/apps/${slug}/theme returned a non-object body`);
  }
  return body as LiveBody;
}

async function fetchBoth(): Promise<Record<(typeof SLUGS)[number], LiveBody>> {
  const [erudite, test] = await Promise.all(SLUGS.map(fetchBody));
  return { 'erudite-quiz': erudite, 'test-quiz': test };
}

/** Warn about keys the client does not know — the tripwire for a future widening. */
export function reportUnknownKeys(slug: string, appearance: string, keys: Iterable<string>): void {
  for (const key of keys) {
    console.warn(
      `[theme-contract-live] ${slug} serves unknown token "${key}" in ${appearance} — ` +
        'dropped by the client today; a future widening must bump schema_version and the fixtures.',
    );
  }
}

/** Warn about an onboarding_type this client does not know — a future variant. */
export function reportUnknownOnboardingType(slug: string, type: unknown): void {
  console.warn(
    `[theme-contract-live] ${slug} serves unknown onboarding_type ${String(type)} — ` +
      'degrades to the default today.',
  );
}

describe('the live backend vs this client contract', () => {
  it('serves exactly the schema version this build declares', async () => {
    const bodies = await fetchBoth();
    for (const slug of SLUGS) {
      expect({ slug, schemaVersion: bodies[slug].schema_version }).toEqual({
        slug,
        schemaVersion: CLIENT_THEME_SCHEMA_VERSION,
      });
      expect({ slug, schemaVersion: bodies[slug].schema_version }).toEqual({
        slug,
        schemaVersion: SCHEMA_VERSION_V2,
      });
    }
  });

  it('parses the live envelope of both slugs through this build\'s own parser', async () => {
    const bodies = await fetchBoth();
    for (const slug of SLUGS) {
      const parsed = parseThemeEnvelope(bodies[slug]);
      expect({ slug, ok: parsed.ok }).toEqual({ slug, ok: true });
    }
  });

  it('carries every remote token, in both appearances of both apps', async () => {
    const bodies = await fetchBoth();
    for (const slug of SLUGS) {
      for (const appearance of ['light', 'dark'] as const) {
        const keys = Object.keys(bodies[slug].theme[appearance]);
        for (const key of REMOTE_TOKEN_KEYS) {
          expect({ slug, appearance, key, present: keys.includes(key) }).toEqual({
            slug,
            appearance,
            key,
            present: true,
          });
        }
      }
    }
  });

  it('serves the erudite slug\'s defaults byte-for-byte as transcribed', async () => {
    // The parity pin that makes the offline fixture meaningful: a preset-less
    // app must receive exactly the palette the client bundles, or "switching
    // the engine on changes nothing until an operator edits something" breaks.
    const erudite = await fetchBody('erudite-quiz');
    for (const key of Object.keys(BACKEND_LIGHT_DEFAULTS_V2)) {
      expect({ key, value: erudite.theme.light[key] }).toEqual({
        key,
        value: BACKEND_LIGHT_DEFAULTS_V2[key as keyof typeof BACKEND_LIGHT_DEFAULTS_V2],
      });
      expect({ key, value: erudite.theme.dark[key] }).toEqual({
        key,
        value: BACKEND_DARK_DEFAULTS_V2[key as keyof typeof BACKEND_DARK_DEFAULTS_V2],
      });
    }
  });

  it('runs the unknown-key and unknown-variant reporters over the live payloads', async () => {
    // The reporters WARN without failing: forward compatibility is by design.
    // A healthy backend warns about nothing; the mechanism is pinned against
    // synthetic input below so it cannot quietly stop working.
    const bodies = await fetchBoth();
    for (const slug of SLUGS) {
      for (const appearance of ['light', 'dark'] as const) {
        reportUnknownKeys(
          slug,
          appearance,
          Object.keys(bodies[slug].theme[appearance]).filter(
            (key) => !(REMOTE_TOKEN_KEYS as readonly string[]).includes(key),
          ),
        );
      }
      const type = bodies[slug].onboarding_type;
      if (type !== undefined && !(T_ONBOARDING_TYPES as readonly unknown[]).includes(type)) {
        reportUnknownOnboardingType(slug, type);
      }
    }
  });
});

describe('the drift reporters themselves', () => {
  it('warns per unknown token', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      reportUnknownKeys('test-quiz', 'dark', ['someFutureToken', 'another']);
      expect(warn).toHaveBeenCalledTimes(2);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('test-quiz serves unknown token "someFutureToken" in dark'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('warns about an unknown onboarding variant', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      reportUnknownOnboardingType('test-quiz', 'martian');
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('test-quiz serves unknown onboarding_type martian'),
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('stays silent when nothing is unknown', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      reportUnknownKeys('test-quiz', 'dark', []);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
