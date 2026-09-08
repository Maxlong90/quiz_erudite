import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

import { AppBackground } from '@/components/football-quiz/app-background';
import { FQIconButton, FQModalCard, FQPillRow, goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius } from '@/constants/football-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';

/**
 * Football Quiz settings — same behaviour as app/sport-quiz/settings.tsx, only
 * restyled: back/title header, five glass pill rows in the same order, the build
 * version pinned to the bottom, and the language picker as a modal that switches
 * the whole app instantly.
 *
 * Labels come from Sport Quiz for now (identical strings, already translated
 * into 4 locales); they move to constants/football-quiz/ when this app gets its
 * own copy.
 */
const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
  fr: 'Français',
};
const LANGUAGE_FLAGS: Record<SupportedLocale, string> = { en: '🇬🇧', ru: '🇷🇺', es: '🇪🇸', fr: '🇫🇷' };

const PRIVACY_URL = 'https://quizzzes.com/privacy';
const TERMS_URL = 'https://quizzzes.com/terms';
const SUPPORT_EMAIL = 'support@quizzzes.com';
const APP_VERSION = Constants.expoConfig?.version ?? '—';

export default function FootballQuizSettings() {
  const t = useSQLabels();
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

  // Store links come from the backend snapshot in Sport Quiz; this app has no
  // snapshot yet, so getStoreLinks falls back to the shared defaults.
  const onRate = () => {
    const { rateDeepLink, rateFallbackUrl } = getStoreLinks(undefined, Platform.OS);
    Linking.openURL(rateDeepLink).catch(() => openUrl(rateFallbackUrl));
  };

  const onSupport = () => {
    const subject = 'Football Quiz — support';
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});
  };

  return (
    <View style={styles.fill}>
      <AppBackground variant="haze" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <FQIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
          <Text style={styles.title} numberOfLines={1}>
            {t.settings}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.actions}>
          <FQPillRow
            label={t.selectLanguage}
            icon={<Text style={styles.flag}>{LANGUAGE_FLAGS[locale] ?? '🌐'}</Text>}
            onPress={() => setLangOpen(true)}
          />
          <FQPillRow label={t.rateApp} onPress={onRate} />
          <FQPillRow label={t.contactSupport} onPress={onSupport} />
          <FQPillRow label={t.privacyPolicy} onPress={() => openUrl(PRIVACY_URL)} />
          <FQPillRow label={t.termsOfUse} onPress={() => openUrl(TERMS_URL)} />
        </View>

        <View style={{ flex: 1 }} />

        <View style={[styles.versionBox, goldGlow(8, 0.35)]}>
          <Text style={styles.versionText}>{t.appVersion.replace('{v}', APP_VERSION)}</Text>
        </View>
      </SafeAreaView>

      <Modal visible={langOpen} transparent animationType="fade" onRequestClose={() => setLangOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.modalHit} onPress={() => {}}>
            <FQModalCard>
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
                    {active && <Ionicons name="checkmark-circle" size={20} color={FQColors.gold} />}
                  </Pressable>
                );
              })}
            </FQModalCard>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: FQColors.bgBase },
  safe: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '900', color: FQColors.text },
  headerSpacer: { width: 44 },

  actions: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  flag: { fontSize: 22 },

  versionBox: {
    alignSelf: 'center',
    marginBottom: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: FQRadius.pill,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    backgroundColor: FQColors.glassStrong,
  },
  versionText: { color: FQColors.text, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,6,8,0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalHit: { width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '900', color: FQColors.text, textAlign: 'center', marginBottom: 4 },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: FQRadius.md,
    backgroundColor: 'rgba(255,201,60,0.08)',
  },
  langRowActive: { backgroundColor: 'rgba(255,201,60,0.18)' },
  langText: { fontSize: 17, fontWeight: '800', color: FQColors.text },
  langTextActive: { color: FQColors.goldLight },
});
