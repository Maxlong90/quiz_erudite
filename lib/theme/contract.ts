import type { ErudGradient, EruditePalette } from '@/constants/theme';
import { resolveOnboardingType, type TOnboardingType } from '@/lib/onboarding/onboarding-type';

/**
 * The wire contract for the remote colour theme
 * (GET /api/v1/apps/{slug}/theme, and the identical `theme` object that rides
 * along on /snapshot once that transport is wired).
 *
 * The backend mirror of this file is app/Support/ColorTokenRegistry.php. The two
 * agree on three things and nothing else: the token NAMES, their declaration
 * ORDER, and the schema version. Everything the backend does with them
 * (derive rules, Nova form, pruning) stays behind the endpoint.
 *
 * Nothing here throws and nothing here logs. Parsing hostile input is the whole
 * job of this module, so every failure is a value the caller must handle.
 *
 * WHEN schema_version BUMPS — AND WHY IT ALMOST NEVER SHOULD
 * ----------------------------------------------------------
 * It bumps ONLY for a change that would make a v1 client render something WRONG:
 * a renamed or removed token, or a changed value domain. Purely ADDITIVE optional
 * keys — `onboarding_type` is the first — never bump it.
 *
 * The asymmetry is brutal and one-directional. If the backend served
 * `schema_version: 2`, every already-installed client would take the
 * `unsupported-schema` branch below, the provider would persist NOTHING
 * (hooks/app-theme-provider.ts), and every device in the field would lose the
 * operator's palette. Store-review latency means the client cannot be rolled
 * first. An unknown key, by contrast, costs a v1 client nothing: parseTokens
 * already iterates REMOTE_TOKEN_KEYS rather than the payload's own keys, so
 * anything it does not recognise is simply dropped.
 *
 * REJECT A SET YOU CANNOT HALF-APPLY; DEGRADE A SCALAR YOU CAN
 * -----------------------------------------------------------
 * parseRemoteTheme is all-or-nothing (see its docblock) while `onboarding_type`
 * degrades to a default. That reads as an inconsistency and is not. Colours are a
 * contrast SET — optIdleBg and optIdleText are a pair — so half-applying can
 * render white-on-white, and every one of those strings is handed to a native
 * style prop that throws on garbage. A single scalar switch discriminant has no
 * partner and never reaches a style prop, so isColorValue's strictness has no
 * analogue. Rejecting the envelope over one bad non-colour string would discard
 * the operator's entire palette to fix nothing.
 */

/** The payload shape this build understands. A higher one is not applied. */
export const CLIENT_THEME_SCHEMA_VERSION = 1;

/** bgGradient is a 3-stop gradient — exactly 3, see `asGradient`. */
export const GRADIENT_STOPS = 3;

/**
 * The tokens the backend serves, in ColorTokenRegistry::TOKENS declaration
 * order. That order is part of the ETag contract (the backend hashes the encoded
 * bytes, so reordering changes the validator without changing a colour), and it
 * is the order the token gallery renders in.
 *
 * `satisfies readonly (keyof EruditePalette)[]` is the compile-time link to the
 * bundled palette: rename or drop one of these in constants/theme.ts and this
 * file stops building, instead of silently resolving to `undefined` at runtime.
 */
export const REMOTE_TOKEN_KEYS = [
  'bgGradient',
  'bgSolid',
  'accent',
  'accentSoft',
  'accentBg',
  'accentBgSoft',
  'accentBorderSoft',
  'optIdleBg',
  'optIdleBorder',
  'optIdleText',
] as const satisfies readonly (keyof EruditePalette)[];

export type RemoteTokenKey = (typeof REMOTE_TOKEN_KEYS)[number];

/**
 * Derived from EruditePalette rather than re-declared, so `bgGradient` keeps its
 * readonly-3-tuple type for free and no second copy of the token types can drift.
 */
export type RemoteTokens = Pick<EruditePalette, RemoteTokenKey>;

export interface RemoteTheme {
  /** Operator-facing preset name, e.g. 'test-quiz 1'. Cosmetic. */
  name: string | null;
  /**
   * False means the operator did not author a dark variant. The backend then
   * MIRRORS light into dark rather than omitting it, so clients may always index
   * `theme[appearance]` unconditionally — there is no missing-map case.
   */
  supports_dark: boolean;
  light: RemoteTokens;
  dark: RemoteTokens;
}

export type ParseResult =
  | {
      ok: true;
      schemaVersion: number;
      theme: RemoteTheme;
      /**
       * Always resolved, never absent: an omitted or unusable `onboarding_type`
       * degrades to T_ONBOARDING_DEFAULT rather than failing the envelope.
       */
      onboardingType: TOnboardingType;
    }
  | {
      ok: false;
      reason: 'malformed' | 'unsupported-schema';
      /** The version we read, when we got far enough to read one. */
      schemaVersion: number | null;
    };

/** #rgb | #rgba | #rrggbb | #rrggbbaa. */
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Strict on purpose, and not for tidiness: these strings go straight into React
 * Native style props, where an unparseable colour THROWS IN NATIVE CODE on
 * Android ("Unable to parse color"). A theme engine that can hard-crash the app
 * it themes is not fail-open. Every value the backend serves is 6- or 8-digit
 * hex, so nothing legitimate is rejected here.
 */
export function isColorValue(value: unknown): value is string {
  return typeof value === 'string' && HEX_COLOR.test(value);
}

/**
 * Exactly GRADIENT_STOPS valid colours, or null.
 *
 * Length must be EXACT, not "at least 3": a 4-stop array is a schema change, and
 * silently truncating it would render a palette the operator never previewed.
 * The single `as` assertion below sits immediately behind the length-and-element
 * check that makes it sound.
 */
export function asGradient(value: unknown): ErudGradient | null {
  if (!Array.isArray(value) || value.length !== GRADIENT_STOPS) return null;
  if (!value.every(isColorValue)) return null;
  const [first, second, third] = value as string[];
  return [first, second, third] as ErudGradient;
}

/**
 * One appearance map. Iterates REMOTE_TOKEN_KEYS rather than the payload's own
 * keys, so an unknown eleventh token from a forward-compatible backend is
 * dropped here and can never reach a style prop.
 */
function parseTokens(raw: unknown): RemoteTokens | null {
  if (!isRecord(raw)) return null;

  const tokens: Record<string, unknown> = {};
  for (const key of REMOTE_TOKEN_KEYS) {
    const value = raw[key];
    if (key === 'bgGradient') {
      const gradient = asGradient(value);
      if (gradient === null) return null;
      tokens[key] = gradient;
      continue;
    }
    if (!isColorValue(value)) return null;
    tokens[key] = value;
  }
  return tokens as RemoteTokens;
}

/**
 * The `theme` object, from either transport. Rejects the WHOLE envelope on any
 * bad token rather than falling back per token.
 *
 * Colours are a set, not a bag: optIdleBg and optIdleText are a contrast pair,
 * bgGradient and bgSolid must agree. Half-applying an operator's palette over
 * half the bundled one can produce white-on-white text, which is strictly worse
 * than not applying it at all. And since the backend guarantees all ten keys in
 * both maps, a missing key means the contract is already broken — the right
 * response is to keep the last-known-good theme, not to improvise a hybrid.
 */
export function parseRemoteTheme(raw: unknown): RemoteTheme | null {
  if (!isRecord(raw)) return null;

  const { name, supports_dark: supportsDark } = raw;
  if (name !== undefined && name !== null && typeof name !== 'string') return null;
  if (typeof supportsDark !== 'boolean') return null;

  const light = parseTokens(raw.light);
  const dark = parseTokens(raw.dark);
  if (light === null || dark === null) return null;

  return { name: typeof name === 'string' ? name : null, supports_dark: supportsDark, light, dark };
}

/**
 * The full response body: `{ schema_version, onboarding_type?, theme }`.
 *
 * The version is checked FIRST. If it is one we do not understand we report
 * `unsupported-schema` without judging the shape — by definition we cannot know
 * what a v2 body is supposed to look like.
 *
 * `onboarding_type` is a SIBLING of `theme`, not a key inside it: `theme`'s keys
 * mirror the backend's ColorTokenRegistry one for one, and a screen-selection
 * discriminant is not a colour token. It is read only AFTER the theme parses, so
 * a malformed theme still reports `malformed` and carries no resolved type.
 */
export function parseThemeEnvelope(raw: unknown): ParseResult {
  if (!isRecord(raw)) return { ok: false, reason: 'malformed', schemaVersion: null };

  const version = raw.schema_version;
  // A string "1", a 0, a float or an absent key are all malformed, not
  // "unsupported": they mean we are not talking to the endpoint we think we are.
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'malformed', schemaVersion: null };
  }
  if (version > CLIENT_THEME_SCHEMA_VERSION) {
    return { ok: false, reason: 'unsupported-schema', schemaVersion: version };
  }

  const theme = parseRemoteTheme(raw.theme);
  if (theme === null) return { ok: false, reason: 'malformed', schemaVersion: version };

  return {
    ok: true,
    schemaVersion: version,
    theme,
    onboardingType: resolveOnboardingType(raw.onboarding_type),
  };
}
