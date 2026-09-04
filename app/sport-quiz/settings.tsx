import { useState, type ReactNode } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { AppBackground } from '@/components/sport-quiz/app-background';
import { GlassIconButton, neonGlow } from '@/components/sport-quiz/ui';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';

// Each language shown in its own name (+ a flag emoji), so the list reads the
// same regardless of the currently active locale.
const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
};
/** The running build's version (app.json `version`), shown at the bottom of Settings. */
const APP_VERSION = Constants.expoConfig?.version ?? '—';

const LANGUAGE_FLAGS: Record<SupportedLocale, string> = {
  en: '🇬🇧',
  ru: '🇷🇺',
  es: '🇪🇸',
  fr: '🇫🇷',
};

// External URLs — mirrors the main app's settings so a real Privacy page is a
// one-line change. Store links come from the snapshot via getStoreLinks(), but
// Sport Quiz has no content hook wired here yet, so we fall back to defaults.
const PRIVACY_URL = 'https://quizzzes.com/privacy';
const TERMS_URL = 'https://quizzzes.com/terms';
const SUPPORT_EMAIL = 'support@quizzzes.com';

export default function SportQuizSettings() {
  const t = useSQLabels();
  const { resetLevels } = useSportQuiz();
  const { locale, changeLocale, supportedLocales } = useLocale();
  const [langOpen, setLangOpen] = useState(false);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const onSelectLanguage = (l: SupportedLocale) => {
    Haptics.selectionAsync().catch(() => {});
    changeLocale(l);
    setLangOpen(false);
  };

  // Sport Quiz has no subscription — nothing to restore. Keep the flow truthful
  // (and functional) by always showing the "nothing to restore" alert.
  const onRestorePurchases = () => {
    Alert.alert(t.restoreNoneTitle, t.restoreNoneMessage, [{ text: t.ok }]);
  };

  const onPrivacy = () => openUrl(PRIVACY_URL);
  const onTerms = () => openUrl(TERMS_URL);

  const onRate = () => {
    // No content snapshot wired for Sport Quiz yet — pass undefined so we use the
    // default store deep link / fallback.
    const { rateDeepLink, rateFallbackUrl } = getStoreLinks(undefined, Platform.OS);
    Linking.openURL(rateDeepLink).catch(() => openUrl(rateFallbackUrl));
  };

  const onSupport = () => {
    const subject = 'Sport Quiz — support';
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});
  };

  // DEV-only: reset every quiz level back to its first question.
  const onResetLevels = () => {
    Haptics.selectionAsync().catch(() => {});
    resetLevels();
    Alert.alert('DEV', 'All levels reset to the first question.', [{ text: t.ok }]);
  };

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      {/* Header: back · title */}
      <View style={styles.header}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        <Text style={styles.title} numberOfLines={1}>
          {t.settings}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.actions}>
        {/* Cancel subscription — Sport Quiz has NO subscription, so this row is
            inactive (dimmed, non-pressable). It preserves Logo Quiz's layout. */}
        <SettingsRow label={t.cancelSubscription} inactive />
        {/* Restore Purchases — always "nothing to restore" here. */}
        <SettingsRow label={t.restorePurchases} onPress={onRestorePurchases} />
        {/* Language picker — a pick switches the whole app instantly. */}
        <SettingsRow
          label={t.selectLanguage}
          onPress={() => setLangOpen(true)}
          icon={<Text style={styles.flag}>{LANGUAGE_FLAGS[locale]}</Text>}
        />
        {/* Rate the app — opens the store listing (no reward attached). */}
        <SettingsRow label={t.rateApp} onPress={onRate} />
        <SettingsRow label={t.contactSupport} onPress={onSupport} />
        <SettingsRow label={t.privacyPolicy} onPress={onPrivacy} />
        <SettingsRow label={t.termsOfUse} onPress={onTerms} />
      </View>

      {/* DEV tools pinned to the bottom — only in development builds. */}
      <View style={{ flex: 1 }} />
      {__DEV__ && (
        <Pressable
          onPress={onResetLevels}
          style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="build" size={18} color="#FFB65C" />
          <Text style={styles.devBtnText}>DEV: reset levels</Text>
        </Pressable>
      )}

      {/* App version — the live build's version, in the same framed glass style as
          the settings rows. Read from the Expo config, so it tracks every release
          automatically (no hardcoded string to forget). */}
      <View style={[styles.versionBox, neonGlow(SQColors.neon, 8)]}>
        <LinearGradient
          colors={[SQColors.glassStrong, SQColors.glass]}
          style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.pill }]}
        />
        <Text style={styles.versionText}>{t.appVersion.replace('{v}', APP_VERSION)}</Text>
      </View>

      {/* Language picker — tapping a language changes the app locale instantly. */}
      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={[styles.modalCard, neonGlow(SQColors.neon, 14)]} onPress={() => {}}>
            <LinearGradient
              colors={[SQColors.glassStrong, SQColors.glass]}
              style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.lg }]}
            />
            <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
            {supportedLocales.map((l) => {
              const active = l === locale;
              return (
                <Pressable
                  key={l}
                  onPress={() => onSelectLanguage(l)}
                  style={({ pressed }) => [styles.langRow, active && styles.langRowActive, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.flag}>{LANGUAGE_FLAGS[l]}</Text>
                  <Text style={[styles.langText, active && styles.langTextActive]}>{LANGUAGE_NAMES[l]}</Text>
                  <View style={{ flex: 1 }} />
                  {active && <Ionicons name="checkmark-circle" size={20} color={SQColors.neon} />}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/**
 * A glass pill settings row. `inactive` dims it and makes it non-pressable — used
 * for the Cancel Subscription row that has nothing to do in Sport Quiz.
 */
function SettingsRow({
  label,
  onPress,
  inactive,
  icon,
}: {
  label: string;
  onPress?: () => void;
  inactive?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.row,
        neonGlow(SQColors.neon, 10),
        inactive && styles.rowInactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      <LinearGradient
        colors={[SQColors.glassStrong, SQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.pill }]}
      />
      {icon}
      <Text style={styles.rowText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '900', color: SQColors.text },
  headerSpacer: { width: 44 },

  actions: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SQRadius.pill,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    overflow: 'hidden',
    gap: 10,
  },
  rowInactive: { opacity: 0.45 },
  rowText: { color: SQColors.text, fontWeight: '900', fontSize: 20 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  flag: { fontSize: 22 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,12,20,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: SQRadius.lg,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
    padding: 20,
    gap: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: SQColors.text, textAlign: 'center', marginBottom: 4 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: SQRadius.md,
    backgroundColor: 'rgba(46,208,255,0.10)',
  },
  langRowActive: { backgroundColor: 'rgba(43,255,179,0.16)' },
  langText: { fontSize: 17, fontWeight: '800', color: SQColors.text },
  langTextActive: { color: SQColors.neon },

  // DEV button — deliberately off-brand (dashed amber) so it reads as a tool.
  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: SQRadius.pill,
    borderWidth: 1.5,
    borderColor: '#FFB65C',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(6,16,26,0.6)',
  },
  devBtnText: { color: '#FFB65C', fontWeight: '800', fontSize: 14 },

  // Version pill — same glass + neon frame as the settings rows, just quieter.
  versionBox: {
    alignSelf: 'center',
    marginTop: 6,
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: SQRadius.pill,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    overflow: 'hidden',
  },
  versionText: { color: SQColors.text, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
});
