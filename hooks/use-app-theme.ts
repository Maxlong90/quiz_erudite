import { createContext, useContext } from 'react';

import { EruditeColors, type EruditePalette } from '@/constants/theme';
import { T_ONBOARDING_DEFAULT, type TOnboardingType } from '@/lib/onboarding/onboarding-type';
import {
  CLIENT_THEME_SCHEMA_VERSION,
  REMOTE_TOKEN_KEYS,
  type RemoteTokenKey,
} from '@/lib/theme/contract';

/**
 * The applied colour theme, as every consumer sees it.
 *
 * This module is deliberately I/O-FREE: no api client, no AsyncStorage, no axios.
 * useThemeColors sits on it and is in turn imported by ScreenBackground and ~69
 * other components, so anything required here is pulled into essentially every
 * screen — and into every test that renders one. The engine that actually reads
 * the cache and talks to the backend lives in hooks/app-theme-provider.ts and is
 * imported only by app/_layout.tsx and the app/t screens.
 */

export type ThemeSource = 'bundled' | 'cache' | 'network';

export interface AppThemeValue {
  /** Full palettes, ready for useThemeColors to index by appearance. */
  palettes: { dark: EruditePalette; light: EruditePalette };
  /** Which tier the applied palette came from. */
  source: ThemeSource;
  schemaVersion: number;
  /** Operator-facing preset name, when one is applied. */
  name: string | null;
  supportsDark: boolean;
  /** The cache read has settled (or was skipped). */
  hydrated: boolean;
  /** The network attempt has settled: 200, 304, error, timeout or skipped. */
  networkSettled: boolean;
  /** Set when the backend served a schema this build is too old to apply. */
  unsupportedSchemaVersion: number | null;
  etag: string | null;
  syncedAt: number | null;
  /**
   * Which onboarding variant the operator selected. Rides this value because the
   * theme envelope is the only payload the template's splash already waits for —
   * read it through hooks/t/use-onboarding-type.ts, never from here directly.
   */
  onboardingType: TOnboardingType;
  /** Which tokens the applied theme changes versus bundled. */
  overridden: Record<RemoteTokenKey, boolean>;
  /** Re-run the sync. `force` skips If-None-Match, so an edit shows immediately. */
  refresh: (opts?: { force?: boolean }) => Promise<void>;
}

function noOverrides(): Record<RemoteTokenKey, boolean> {
  const flags = {} as Record<RemoteTokenKey, boolean>;
  for (const key of REMOTE_TOKEN_KEYS) flags[key] = false;
  return flags;
}

/**
 * The value EVERY non-configurable build gets.
 *
 * Frozen and created once at module scope, so it is referentially stable for the
 * process lifetime: no consumer can ever re-render because of this provider.
 * `palettes.dark` IS `EruditeColors.dark` — the same object, not a copy — which
 * is the whole visual-inertness proof: an identical object means identical
 * tokens, which means every `useMemo(() => makeStyles(colors), [colors])` in the
 * app keeps the stylesheet it already built.
 */
const INERT: AppThemeValue = {
  palettes: Object.freeze({ dark: EruditeColors.dark, light: EruditeColors.light }),
  source: 'bundled',
  schemaVersion: CLIENT_THEME_SCHEMA_VERSION,
  name: null,
  supportsDark: true,
  // Nothing to wait for: a build that never reads or fetches is settled at birth,
  // so a caller gating on these never hangs.
  hydrated: true,
  networkSettled: true,
  unsupportedSchemaVersion: null,
  etag: null,
  syncedAt: null,
  // A build that never fetches has no operator answer, so it renders the screen
  // it always rendered.
  onboardingType: T_ONBOARDING_DEFAULT,
  overridden: Object.freeze(noOverrides()),
  refresh: async () => {},
};

export const INERT_THEME_VALUE: AppThemeValue = Object.freeze(INERT);

export const AppThemeContext = createContext<AppThemeValue | null>(null);

/**
 * The applied theme, or null when there is no provider above.
 *
 * The context is OPTIONAL by design: useThemeColors falls back to the bundled
 * palette on null, which keeps every existing test that renders a component
 * without this provider working unchanged.
 */
export function useAppTheme(): AppThemeValue | null {
  return useContext(AppThemeContext);
}
