import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { APP_SLUG } from '@/api/client';
import { ScreenBackground } from '@/components/screen-background';
import { Fonts, type EruditePalette } from '@/constants/theme';
import { INERT_THEME_VALUE, useAppTheme, type AppThemeValue } from '@/hooks/use-app-theme';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import {
  forcedOnboardingType,
  setForcedOnboardingType,
} from '@/hooks/t/use-onboarding-type';
import { useThemePref } from '@/hooks/use-theme-pref';
import { T_ONBOARDING_TYPES, type TOnboardingType } from '@/lib/onboarding/onboarding-type';
import { REMOTE_TOKEN_KEYS, type RemoteTokenKey } from '@/lib/theme/contract';
import { clearCachedTheme } from '@/lib/theme/theme-cache';

/**
 * Which asset pack this binary was built from.
 *
 * A deliberately BOUNDED exception to "the manifest is a build-time contract,
 * never a runtime one": it is read here for a debug label and nowhere for slot
 * resolution — constants/t/asset-slots.ts owns that, and a test pins it. Since
 * the staging copy drops manifest.json beside the artwork, the gallery can
 * answer "which pack is in this APK?" without anyone unzipping it.
 *
 * Requiring JSON is safe in both environments: unlike images, `.json` is not
 * rewritten by jest-expo's asset transformer, so this is real parsed data under
 * Metro and under the test runner alike.
 */
const STAGED_PACK: { pack: string; title: string } = require('@/assets/t/manifest.json');

/**
 * The configurable template's live token gallery.
 *
 * It is the instrument for the whole engine — which tier is applied, which
 * validator is held, which tokens the operator has actually overridden — and it
 * doubles as the end-to-end proof, because it renders inside the UNMODIFIED
 * <ScreenBackground>. That component is the app's only consumer of
 * `bgGradient` and feeds it straight to a native LinearGradient, so a themed
 * backdrop here means the remote token flowed through real production code with
 * zero changes to it.
 *
 * It used to sit at app/t/index.tsx as the template's placeholder home. The real
 * home took that route, so the gallery moved here and is now reached by
 * LONG-PRESSING THE WORDMARK on /t. That affordance is deliberately not
 * __DEV__-gated: the gallery exists to be read on a real device against a real
 * operator preset — an EAS preview or release build, where __DEV__ is false.
 * Gating it would delete it exactly where it is needed. It is already
 * build-gated by living under app/t/, and it exposes nothing but colours and a
 * refetch button.
 *
 * THE ONE THING HERE THAT *IS* __DEV__-GATED, AND WHY IT SITS IN ITS OWN ROW
 * -------------------------------------------------------------------------
 * The forced-variant control writes developer-only state that has no business
 * existing in a build handed to an operator, so it is gated where the rest of
 * this screen is not. That gate is exactly why it could not simply become a
 * fourth child of the existing action row: `styles.actions` is a flex row of
 * `flex: 1` children, so the same row would lay out as four quarters in a debug
 * build and three thirds in the release build this screen is written for. A
 * second row keeps the always-present chrome pixel-identical in both. `flex: 1`
 * in a one-child row also gives a full-width button with no new style.
 *
 * The onboarding_type ROW, by contrast, is always present — it reports what the
 * BACKEND sent, which is data an operator needs to read on a release build like
 * every other line in that card.
 */

const SOURCE_LABELS: Record<AppThemeValue['source'], string> = {
  bundled: 'BUNDLED',
  cache: 'CACHE',
  network: 'NETWORK',
};

function sourceColor(source: AppThemeValue['source'], colors: EruditePalette): string {
  if (source === 'network') return colors.success;
  if (source === 'cache') return colors.accent;
  return colors.textFaint;
}

/**
 * auto -> classic -> universal -> none -> auto, derived from the shipped union so
 * a further type needs no edit here. `null` IS a member: releasing the pin has to
 * be one more press rather than a second control.
 *
 * `none` joined this cycle for FREE when the union grew — which is the property
 * this comment claimed before it had ever been exercised, now demonstrated.
 */
const FORCE_CYCLE: readonly (TOnboardingType | null)[] = [...T_ONBOARDING_TYPES, null];

function nextForced(current: TOnboardingType | null): TOnboardingType | null {
  return FORCE_CYCLE[(FORCE_CYCLE.indexOf(current) + 1) % FORCE_CYCLE.length];
}

function relativeTime(syncedAt: number | null): string {
  if (syncedAt === null) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - syncedAt) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

/** '"11511dfa…"' — enough to eyeball a change, short enough to fit one line. */
function shortEtag(etag: string | null): string {
  if (!etag) return 'none';
  const bare = etag.replace(/^"|"$/g, '');
  return bare.length <= 12 ? bare : `${bare.slice(0, 12)}…`;
}

function TokenRow({ tokenKey, value, overridden, colors }: {
  tokenKey: RemoteTokenKey;
  value: string | readonly string[];
  overridden: boolean;
  colors: EruditePalette;
}) {
  // Narrowed to a real tuple rather than cast: bgGradient is the only array-valued
  // token, and LinearGradient needs at least two stops at the type level.
  const gradient: readonly string[] | null = Array.isArray(value) ? value : null;
  const isGradient = gradient !== null;
  return (
    <View testID={`theme-token-${tokenKey}`} style={[styles.row, { borderColor: colors.borderSoft }]}>
      {gradient ? (
        <LinearGradient
          colors={[gradient[0], gradient[1], gradient[2]]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.swatch, { borderColor: colors.border }]}
        />
      ) : (
        <View
          style={[styles.swatch, { backgroundColor: value as string, borderColor: colors.border }]}
        />
      )}
      <View style={styles.rowText}>
        <View style={styles.rowHeader}>
          <Text style={[styles.tokenKey, { color: colors.text }]}>{tokenKey}</Text>
          {overridden ? (
            <Text
              testID={`theme-token-${tokenKey}-overridden`}
              style={[styles.badge, { color: colors.accent, borderColor: colors.accentBorderSoft, backgroundColor: colors.accentBgSoft }]}
            >
              overridden
            </Text>
          ) : null}
        </View>
        <Text style={[styles.tokenValue, { color: colors.textFaint }]}>
          {gradient ? gradient.join('  ') : (value as string)}
        </Text>
      </View>
    </View>
  );
}

export default function TThemeTokensScreen() {
  const colors = useTemplateTheme();
  const { theme, setTheme } = useThemePref();
  // Falls back to the inert value so the screen still renders standalone (and
  // under a test harness) without an AppThemeProvider above it.
  const appTheme = useAppTheme() ?? INERT_THEME_VALUE;
  const [busy, setBusy] = useState(false);
  /**
   * A render trigger, NOT the source of truth — the module variable behind
   * forcedOnboardingType() is, because useOnboardingType() reads it from a screen
   * this one never renders. Seeded and declared unconditionally even where
   * __DEV__ is false, so the hook order does not depend on the build type.
   */
  const [forced, setForced] = useState<TOnboardingType | null>(forcedOnboardingType());

  const cycleForced = useCallback(() => {
    const next = nextForced(forcedOnboardingType());
    setForcedOnboardingType(next);
    setForced(next);
  }, []);

  const palette = appTheme.palettes[theme];

  const refetch = useCallback(async () => {
    setBusy(true);
    try {
      await appTheme.refresh({ force: true });
    } finally {
      setBusy(false);
    }
  }, [appTheme]);

  const clearAndRefetch = useCallback(async () => {
    setBusy(true);
    try {
      // The only way to exercise the empty-cache branch by hand on a device.
      await clearCachedTheme();
      await appTheme.refresh();
    } finally {
      setBusy(false);
    }
  }, [appTheme]);

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={[styles.title, { color: colors.text }]}>Theme tokens</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{APP_SLUG}</Text>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.metaRow}>
            <Text
              testID="theme-source-badge"
              style={[styles.sourceBadge, { color: sourceColor(appTheme.source, colors), borderColor: sourceColor(appTheme.source, colors) }]}
            >
              {SOURCE_LABELS[appTheme.source]}
            </Text>
            <Text style={[styles.metaValue, { color: colors.textMuted }]}>
              {appTheme.name ?? '(default preset)'}
            </Text>
          </View>

          <Meta label="schema_version" value={String(appTheme.schemaVersion)} colors={colors} />
          <Meta label="supports_dark" value={String(appTheme.supportsDark)} colors={colors} />
          <Meta label="etag" value={shortEtag(appTheme.etag)} colors={colors} />
          <Meta label="synced" value={relativeTime(appTheme.syncedAt)} colors={colors} />
          <Meta
            label="network"
            value={appTheme.networkSettled ? 'settled' : 'in flight'}
            colors={colors}
          />
          <Meta
            label="asset_pack"
            value={`${STAGED_PACK.pack} (${STAGED_PACK.title})`}
            colors={colors}
          />
          {/**
           * THE VALUE IS THE ONE ON THE WIRE, NEVER THE ONE BEING DRAWN.
           *
           * Every other line in this card — schema_version, etag, synced,
           * asset_pack — states what the build was GIVEN. Reporting the resolved
           * variant here would be a lie in both directions: with a pin active the
           * app renders `universal` while the backend said `classic`, and with no
           * pin it would still read like a wire value. So the row keeps reporting
           * the engine and the badge declares the local mask over it.
           *
           * It sits directly ABOVE the unsupported-schema warning on purpose:
           * when those two disagree the explanation is the very next line. Since
           * this build accepts schema v2, the row reads the wire value
           * (`universal` for test-quiz) — the pre-Э1 mismatch that made this row
           * read `classic` against the wire's `universal` is closed.
           */}
          <Meta
            label="onboarding_type"
            value={appTheme.onboardingType}
            colors={colors}
            testID="theme-onboarding-type"
            badge={forced ? { label: `forced: ${forced}`, testID: 'theme-onboarding-type-forced' } : null}
          />

          {appTheme.unsupportedSchemaVersion !== null ? (
            <Text testID="theme-unsupported" style={[styles.warning, { color: colors.danger }]}>
              Backend serves schema v{appTheme.unsupportedSchemaVersion}; this build understands
              v{appTheme.schemaVersion}. Showing the last supported theme — update the app.
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Action label="Refetch now" onPress={refetch} disabled={busy} colors={colors} testID="theme-refetch" />
          <Action label="Clear cache" onPress={clearAndRefetch} disabled={busy} colors={colors} testID="theme-clear-cache" />
          <Action
            label={theme === 'dark' ? 'Light' : 'Dark'}
            onPress={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            disabled={busy}
            colors={colors}
            testID="theme-toggle-appearance"
          />
        </View>

        {/**
         * The developer's manual pin. The wire path works on hardware — this
         * build accepts the schema-v2 envelope and reads `onboarding_type` off
         * it — so the pin's job is to exercise a variant the backend did NOT
         * choose (or the `none` skip), not to stand in for a broken transport.
         *
         * It deliberately does NOT navigate. The splash only routes to
         * /t/onboarding when `hasSeen === false`, so a jump from here without
         * wiping `onboarding.seen.v1` would land the developer on /t seeing
         * nothing and reading it as a broken override. The destructive wipe is
         * already owned and tested at /t/settings; the walk is: pin here, back,
         * /t/settings -> dev reset, splash, onboarding.
         *
         * PINNING `none` IS ALSO HOW THE SKIP IS SEEN ON HARDWARE, and it reads
         * as the opposite of the trap above: walk it and the splash lands on /t
         * with NO intro, which is the CORRECT result rather than a dead override.
         * Because the two outcomes look identical from /t, a `none` run only
         * means something next to a `classic` control run that DID show the
         * intro — the meta row below is the value actually worth reading.
         *
         * `disabled={false}` rather than `busy`: this is local state with nothing
         * to do with an in-flight refetch.
         */}
        {__DEV__ && (
          <View style={styles.actions}>
            <Action
              label={`force onboarding: ${forced ?? 'auto'}`}
              onPress={cycleForced}
              disabled={false}
              colors={colors}
              testID="theme-force-onboarding"
            />
          </View>
        )}

        {REMOTE_TOKEN_KEYS.map((key) => (
          <TokenRow
            key={key}
            tokenKey={key}
            value={palette[key]}
            overridden={appTheme.overridden[key]}
            colors={colors}
          />
        ))}
      </ScrollView>
    </ScreenBackground>
  );
}

function Meta({ label, value, colors, testID, badge }: {
  label: string;
  value: string;
  colors: EruditePalette;
  testID?: string;
  /** A local mask over the reported value, drawn in the `overridden` shape. */
  badge?: { label: string; testID: string } | null;
}) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textFaint }]}>{label}</Text>
      <View style={styles.rowHeader}>
        {badge ? (
          <Text
            testID={badge.testID}
            style={[styles.badge, { color: colors.accent, borderColor: colors.accentBorderSoft, backgroundColor: colors.accentBgSoft }]}
          >
            {badge.label}
          </Text>
        ) : null}
        <Text testID={testID} style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}

function Action({ label, onPress, disabled, colors, testID }: {
  label: string;
  onPress: () => void;
  disabled: boolean;
  colors: EruditePalette;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.action,
        { backgroundColor: colors.accentBg, borderColor: colors.accentBorderSoft },
        disabled && styles.actionDisabled,
      ]}
    >
      <Text style={[styles.actionLabel, { color: colors.accent }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingTop: 64, paddingBottom: 48, gap: 10 },
  title: { fontSize: 28, fontWeight: '800' },
  subtitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 6, marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  metaLabel: { fontSize: 13, fontFamily: Fonts?.mono },
  metaValue: { fontSize: 13, fontWeight: '700' },
  sourceBadge: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  warning: { fontSize: 12, fontWeight: '700', marginTop: 4, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  action: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  actionDisabled: { opacity: 0.5 },
  actionLabel: { fontSize: 13, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 10 },
  swatch: { width: 44, height: 44, borderRadius: 8, borderWidth: 1 },
  rowText: { flex: 1, gap: 2 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tokenKey: { fontSize: 14, fontWeight: '800' },
  tokenValue: { fontSize: 12, fontFamily: Fonts?.mono },
  badge: {
    fontSize: 10,
    fontWeight: '800',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
});
