import type { EruditePalette } from '@/constants/theme';

import { BUNDLED_THEME } from './bundled';
import { REMOTE_TOKEN_KEYS, type RemoteTheme, type RemoteTokenKey, type RemoteTokens } from './contract';

/**
 * Overlays the ten remote tokens onto a full bundled palette.
 *
 * The backend serves ten of EruditePalette's ~thirty tokens; the other twenty
 * (surface, text, scrim, success, explanationBg, …) stay bundled. That is why
 * this is an overlay onto a base palette and not a construction from the payload.
 */

/** bgGradient is an array; everything else is a plain string. */
function tokenEquals(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
  }
  return a === b;
}

/**
 * REFERENCE IDENTITY IS THE POINT OF THIS FUNCTION.
 *
 * Sixty-nine call sites do `useMemo(() => makeStyles(colors), [colors])`. A new
 * palette object that merely EQUALS the old one would invalidate every one of
 * those memos and rebuild every stylesheet in the app — a diffuse flicker/perf
 * regression no visual diff would ever catch. So a resolve that changes nothing
 * returns the base object itself, not a copy of it.
 *
 * This is also what makes it safe to switch the engine on for an existing app
 * later: an operator preset that has not been edited resolves to the IDENTICAL
 * EruditeColors object, and nothing re-renders.
 */
export function resolvePalette(base: EruditePalette, tokens: RemoteTokens | null): EruditePalette {
  if (tokens === null) return base;
  // Case-sensitive on purpose: '#FFF' and '#fff' render identically but differ
  // as data, and treating that as a change is harmless (one extra re-render).
  if (REMOTE_TOKEN_KEYS.every((key) => tokenEquals(base[key], tokens[key]))) return base;

  // Iterating REMOTE_TOKEN_KEYS rather than spreading `tokens` wholesale keeps an
  // unknown key that survived parsing from ever reaching a style prop.
  const resolved: EruditePalette = { ...base };
  for (const key of REMOTE_TOKEN_KEYS) {
    // `as never` narrows the union of per-key value types to the one this key
    // actually holds; the parser already guaranteed the pairing.
    resolved[key] = tokens[key] as never;
  }
  return resolved;
}

export function resolvePalettes(
  base: { dark: EruditePalette; light: EruditePalette },
  theme: RemoteTheme | null,
): { dark: EruditePalette; light: EruditePalette } {
  return {
    dark: resolvePalette(base.dark, theme?.dark ?? null),
    light: resolvePalette(base.light, theme?.light ?? null),
  };
}

/**
 * Which tokens the applied theme actually changes versus the bundled palette —
 * i.e. what the operator has authored. Drives the gallery's "overridden" markers.
 *
 * A token counts as overridden when it differs in EITHER appearance. The marker
 * therefore answers "did the operator touch this token", and stays put when you
 * flip the light/dark toggle instead of flickering per appearance.
 */
export function overriddenKeys(theme: RemoteTheme | null): Record<RemoteTokenKey, boolean> {
  const flags = {} as Record<RemoteTokenKey, boolean>;
  for (const key of REMOTE_TOKEN_KEYS) {
    flags[key] =
      theme !== null &&
      (!tokenEquals(theme.light[key], BUNDLED_THEME.light[key]) ||
        !tokenEquals(theme.dark[key], BUNDLED_THEME.dark[key]));
  }
  return flags;
}
