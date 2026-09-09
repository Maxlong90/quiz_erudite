import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { APP_SLUG } from '@/api/client';
import { isTTemplateBuild } from '@/constants/app-templates';
import { EruditeColors } from '@/constants/theme';
import { AppThemeContext, INERT_THEME_VALUE, type AppThemeValue, type ThemeSource } from '@/hooks/use-app-theme';
import { T_ONBOARDING_DEFAULT, type TOnboardingType } from '@/lib/onboarding/onboarding-type';
import { BUNDLED_THEME } from '@/lib/theme/bundled';
import { CLIENT_THEME_SCHEMA_VERSION, type RemoteTheme } from '@/lib/theme/contract';
import { overriddenKeys, resolvePalettes } from '@/lib/theme/resolve';
import { fetchAppTheme } from '@/lib/theme/theme-api';
import { loadCachedTheme, saveCachedTheme, touchCachedTheme } from '@/lib/theme/theme-cache';

/**
 * The remote theme engine, in three tiers: bundled → cache → network.
 *
 *   bundled  the palette compiled into the binary (EruditeColors). Always the
 *            starting point, so the first frame never waits on anything.
 *   cache    the last theme this device fetched. Applied as soon as AsyncStorage
 *            answers, which on a warm launch is before the splash floor elapses.
 *   network  a conditional GET. In the steady state it is a 304 and changes
 *            nothing; when the operator has edited the preset it is a 200 and the
 *            new palette lands before the first real screen renders.
 *
 * Switched on ONLY for the builds in T_TEMPLATE_SLUGS. Every other build gets
 * INERT_THEME_VALUE and performs no I/O whatsoever — see constants/app-templates.ts
 * for why the gate is a build-time list rather than runtime data parity.
 *
 * Kept OUT of hooks/use-app-theme.ts on purpose: this file pulls the api client
 * (and so axios) and AsyncStorage, while use-app-theme.ts is imported — via
 * useThemeColors — by essentially every screen in the app.
 */

interface EngineState {
  theme: RemoteTheme;
  source: ThemeSource;
  schemaVersion: number;
  etag: string | null;
  syncedAt: number | null;
  hydrated: boolean;
  networkSettled: boolean;
  unsupportedSchemaVersion: number | null;
  /**
   * Non-optional here, unlike on the cache record: state always holds a variant a
   * screen can draw. The cache's `undefined` is bridged on read.
   */
  onboardingType: TOnboardingType;
}

const INITIAL_STATE: EngineState = {
  theme: BUNDLED_THEME,
  source: 'bundled',
  schemaVersion: CLIENT_THEME_SCHEMA_VERSION,
  etag: null,
  syncedAt: null,
  hydrated: false,
  networkSettled: false,
  unsupportedSchemaVersion: null,
  onboardingType: T_ONBOARDING_DEFAULT,
};

/**
 * The live engine. Mounted only for a configurable build, so all of its hooks and
 * all of its I/O are unreachable in every other build.
 */
function RemoteThemeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<EngineState>(INITIAL_STATE);
  const mounted = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);

  const apply = useCallback((patch: Partial<EngineState>) => {
    if (!mounted.current) return;
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const runSync = useCallback(
    async (force: boolean) => {
      const cached = await loadCachedTheme();
      if (cached) {
        apply({
          theme: cached.theme,
          source: 'cache',
          schemaVersion: cached.schemaVersion,
          etag: cached.etag,
          syncedAt: cached.syncedAt,
          hydrated: true,
          // INITIAL_STATE already holds the default, so this bridge is a no-op in
          // the common case. It is written anyway so the field can never
          // desynchronise from the record after a cache clear and re-read.
          onboardingType: cached.onboardingType ?? T_ONBOARDING_DEFAULT,
        });
      } else {
        apply({ hydrated: true });
      }

      // A forced refresh drops the validator, so the backend must answer with a
      // body — that is what makes a fresh Nova edit visible without a relaunch.
      //
      // A record written before this build understood onboarding_type carries no
      // opinion about it, so drop the validator ONCE for that case too. This is
      // what buys the insurance a RECORD_FORMAT bump would have bought without
      // its cost, and it also rescues a backend whose ETag spans only the `theme`
      // sub-object and would otherwise answer 304 forever.
      //
      // Self-limiting by construction: an unconditional GET cannot come back 304,
      // and theme-api's platform-cache shortcut is skipped when the sent etag is
      // null, so the response is 'updated' (or 'failed' offline). The 200 writes a
      // resolved type and the very next launch is back to a normal 304 — the whole
      // upgrade costs exactly one ~600-byte body, once.
      const knowsType = cached !== null && cached.onboardingType !== undefined;
      const result = await fetchAppTheme(
        APP_SLUG,
        force || !knowsType ? null : (cached?.etag ?? null),
      );
      const now = Date.now();

      switch (result.status) {
        case 'updated': {
          await saveCachedTheme({
            record: 1,
            etag: result.etag,
            schemaVersion: result.schemaVersion,
            theme: result.theme,
            appSlug: APP_SLUG,
            syncedAt: now,
            onboardingType: result.onboardingType,
          });
          apply({
            theme: result.theme,
            source: 'network',
            schemaVersion: result.schemaVersion,
            etag: result.etag,
            syncedAt: now,
            unsupportedSchemaVersion: null,
            onboardingType: result.onboardingType,
          });
          break;
        }
        case 'unchanged': {
          // The cached palette is still current; only its freshness moves. Like
          // the palette, onboardingType is left alone here and on the two failure
          // branches below — last-known-good is the rule for both.
          await touchCachedTheme(APP_SLUG, now);
          apply({ syncedAt: now, unsupportedSchemaVersion: null });
          break;
        }
        case 'unsupported': {
          // Persist NOTHING — neither the payload (a shape this build cannot
          // read) nor the ETag alone (which would earn a 304 next launch with
          // nothing behind it). The cost is one unconditional ~600-byte GET per
          // launch until the app updates, and then it applies on first launch.
          apply({ unsupportedSchemaVersion: result.schemaVersion });
          // The one place the engine may log. contract.ts and theme-api.ts stay
          // silent by their own rule, but a SILENT fallback here is exactly why
          // the v1-vs-v2 breakage lived unnoticed: the app kept rendering the
          // cached palette while the backend served a shape nobody could read.
          // One warn per launch — the unconditional GET above fires on every
          // launch — is cheap, visible in logcat, and silent on healthy builds.
          console.warn(
            `[theme] Backend serves schema v${result.schemaVersion}; this build understands v${CLIENT_THEME_SCHEMA_VERSION}. Keeping the last supported theme — update the app.`,
          );
          break;
        }
        case 'failed': {
          // Offline, timeout or a malformed body: keep the last-known-good tier.
          break;
        }
      }

      apply({ networkSettled: true });
    },
    [apply],
  );

  const sync = useCallback(
    (force: boolean): Promise<void> => {
      // Coalesce the mount sync with any passive refresh, but never make a forced
      // refresh wait on (or resolve to) an in-flight conditional one.
      if (!force && inFlight.current) return inFlight.current;

      const run = runSync(force)
        .catch(() => {
          // runSync's callees are all fail-open; this is belt and braces so a
          // theme can never reject into the render tree.
        })
        .finally(() => {
          if (inFlight.current === run) inFlight.current = null;
        });
      inFlight.current = run;
      return run;
    },
    [runSync],
  );

  useEffect(() => {
    mounted.current = true;
    void sync(false);
    return () => {
      mounted.current = false;
    };
  }, [sync]);

  const refresh = useCallback((opts?: { force?: boolean }) => sync(opts?.force === true), [sync]);

  // Resolve against the BUNDLED palettes, so a v1 cache record's ten-token
  // theme keeps every key it lacks at its compiled value for the one session it
  // takes the engine to re-earn a full body.
  const palettes = useMemo(() => resolvePalettes(EruditeColors, state.theme), [state.theme]);
  const overridden = useMemo(() => overriddenKeys(state.theme), [state.theme]);

  const value = useMemo<AppThemeValue>(
    () => ({
      palettes,
      source: state.source,
      schemaVersion: state.schemaVersion,
      name: state.theme.name,
      supportsDark: state.theme.supports_dark,
      hydrated: state.hydrated,
      networkSettled: state.networkSettled,
      unsupportedSchemaVersion: state.unsupportedSchemaVersion,
      etag: state.etag,
      syncedAt: state.syncedAt,
      onboardingType: state.onboardingType,
      overridden,
      refresh,
    }),
    [palettes, overridden, refresh, state],
  );

  return createElement(AppThemeContext.Provider, { value }, children);
}

/**
 * Chooses between the live engine and the inert constant by BUILD SLUG. The slug
 * is fixed at build time, so the branch never flips during a session and the two
 * subtrees can never swap — hook order is stable either way.
 */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  if (!isTTemplateBuild()) {
    return createElement(AppThemeContext.Provider, { value: INERT_THEME_VALUE }, children);
  }
  return createElement(RemoteThemeProvider, null, children);
}
