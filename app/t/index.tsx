import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { APP_SLUG } from '@/api/client';
import { ScreenBackground } from '@/components/screen-background';
import { Fonts, type EruditePalette } from '@/constants/theme';
import { INERT_THEME_VALUE, useAppTheme, type AppThemeValue } from '@/hooks/use-app-theme';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemePref } from '@/hooks/use-theme-pref';
import { REMOTE_TOKEN_KEYS, type RemoteTokenKey } from '@/lib/theme/contract';
import { clearCachedTheme } from '@/lib/theme/theme-cache';

/**
 * The configurable template's placeholder home: a live token gallery.
 *
 * It is the instrument for the whole engine — which tier is applied, which
 * validator is held, which tokens the operator has actually overridden — and it
 * doubles as the end-to-end proof, because it renders inside the UNMODIFIED
 * <ScreenBackground>. That component is the app's only consumer of
 * `bgGradient` and feeds it straight to a native LinearGradient, so a themed
 * backdrop here means the remote token flowed through real production code with
 * zero changes to it.
 *
 * Real template screens replace this in a later stage; the gallery is what makes
 * this stage verifiable on a device.
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

export default function TTemplateHome() {
  const colors = useThemeColors();
  const { theme, setTheme } = useThemePref();
  // Falls back to the inert value so the screen still renders standalone (and
  // under a test harness) without an AppThemeProvider above it.
  const appTheme = useAppTheme() ?? INERT_THEME_VALUE;
  const [busy, setBusy] = useState(false);

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

function Meta({ label, value, colors }: { label: string; value: string; colors: EruditePalette }) {
  return (
    <View style={styles.metaRow}>
      <Text style={[styles.metaLabel, { color: colors.textFaint }]}>{label}</Text>
      <Text style={[styles.metaValue, { color: colors.text }]}>{value}</Text>
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
