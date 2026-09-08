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
        });
      } else {
        apply({ hydrated: true });
      }

      // A forced refresh drops the validator, so the backend must answer with a
      // body — that is what makes a fresh Nova edit visible without a relaunch.
      const result = await fetchAppTheme(APP_SLUG, force ? null : (cached?.etag ?? null));
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
          });
          apply({
            theme: result.theme,
            source: 'network',
            schemaVersion: result.schemaVersion,
            etag: result.etag,
            syncedAt: now,
            unsupportedSchemaVersion: null,
          });
          break;
        }
        case 'unchanged': {
          // The cached palette is still current; only its freshness moves.
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

  // Resolve against the BUNDLED palettes, so the ~20 tokens the backend does not
  // serve (surface, text, scrim, success, …) always keep their compiled values.
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
