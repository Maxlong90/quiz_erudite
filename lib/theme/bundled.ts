import { EruditeColors, type EruditePalette } from '@/constants/theme';
import type { ThemePref } from '@/hooks/use-theme-pref';

import { REMOTE_TOKEN_KEYS, type RemoteTheme, type RemoteTokens } from './contract';

/**
 * Tier 1 of the theme engine: what the build renders with no data at all —
 * no cache, no network, first launch, airplane mode.
 *
 * DERIVED from EruditeColors, deliberately NOT a checked-in second literal map.
 * A copy here would be the THIRD transcription of the same palette literals
 * (constants/theme.ts, ColorTokenRegistry::TOKENS, and it), and any drift would
 * destroy the inertness argument at its root: the same binary would render
 * differently depending on whether the engine happened to be switched on for it.
 * "Bundled" means "what this app renders with no data", which IS EruditeColors —
 * deriving makes that a tautology instead of an invariant someone must police.
 *
 * Independent pinning is not lost: __tests__/lib/theme-bundled-parity.test.ts
 * asserts these values against hardcoded literals copied from the backend
 * registry, so the two repos are still checked against each other.
 */
function tokensOf(palette: EruditePalette): RemoteTokens {
  // Built by iterating REMOTE_TOKEN_KEYS so the key ORDER matches the backend's
  // declaration order — the gallery renders in this order, and the parity test
  // asserts it.
  const tokens: Record<string, unknown> = {};
  for (const key of REMOTE_TOKEN_KEYS) {
    tokens[key] = palette[key];
  }
  return Object.freeze(tokens) as RemoteTokens;
}

/**
 * Shaped exactly like a parsed remote payload so every tier downstream — cache,
 * network, resolver, gallery — handles one type. `name: null` and
 * `supports_dark: true` mirror what the backend serves for an app with no preset.
 */
export const BUNDLED_THEME: RemoteTheme = Object.freeze({
  name: null,
  supports_dark: true,
  light: tokensOf(EruditeColors.light),
  dark: tokensOf(EruditeColors.dark),
});

export function bundledTokens(theme: ThemePref): RemoteTokens {
  return BUNDLED_THEME[theme];
}
