import { useState } from 'react';
import { Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { Flag } from '@/components/flags-quiz/flag';
import { ItalyColors } from '@/constants/italy-quiz/theme';
import { useItalyLabels } from '@/constants/italy-quiz/labels';
import { FQ_LANGUAGE_NAMES } from '@/constants/flags-quiz/labels';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';

// External URLs / support — mirror the main app + Flags Quiz so a real page is a
// one-line change everywhere.
const PRIVACY_URL = 'https://quizzzes.com/privacy';
const TERMS_URL = 'https://quizzzes.com/terms';
const SUPPORT_EMAIL = 'support@quizzzes.com';

const APP_VERSION = Constants.expoConfig?.version ?? '';

/**
 * Italy Quiz settings (App Template: World). Same layout as the Flags Quiz
 * settings screen — glossy action buttons on the app background, Back (top-left),
 * a flag-per-language picker, and the version pinned to the bottom — but recoloured
 * to Italy Quiz's deep navy language, matching the home screen buttons.
 */
export default function ItalyQuizSettings() {
  const t = useItalyLabels();
  const { locale, changeLocale, supportedLocales } = useLocale();
  const [langOpen, setLangOpen] = useState(false);
  const bgReady = useItalyBgReady();

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  const onSelectLanguage = (l: SupportedLocale) => {
    Haptics.selectionAsync().catch(() => {});
    changeLocale(l);
    setLangOpen(false);
  };

  const onRate = () => {
    const { rateDeepLink, rateFallbackUrl } = getStoreLinks(null, Platform.OS);
    Linking.openURL(rateDeepLink).catch(() => openUrl(rateFallbackUrl));
  };

  const onSupport = () => {
    const subject = 'Italy Quiz — support';
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});
  };

  // Match the home screen: hold on a plain base until the artwork is cached, then
  // reveal background + content together.
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header: back button only (no title), like Flags Quiz. */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
        </View>

        <View style={styles.actions}>
          <GlossyButton
            label={t.selectLanguage}
            onPress={() => setLangOpen(true)}
            icon={<Flag locale={locale} />}
          />
          <GlossyButton label={t.rateApp} onPress={onRate} />
          <GlossyButton label={t.contactSupport} onPress={onSupport} />
          <GlossyButton label={t.privacyPolicy} onPress={() => openUrl(PRIVACY_URL)} />
          <GlossyButton label={t.termsOfUse} onPress={() => openUrl(TERMS_URL)} />
        </View>

        {APP_VERSION ? (
          <View style={styles.versionWrap}>
            <Text style={styles.version}>{`${t.version} ${APP_VERSION}`}</Text>
          </View>
        ) : null}
      </SafeAreaView>

      {/* Language picker — each row shows the language's flag; a tap switches the
          whole app locale instantly via the shared LocaleProvider. */}
      <Modal
        visible={langOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setLangOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{t.selectLanguage}</Text>
            {supportedLocales.map((l) => {
              const active = l === locale;
              return (
                <Pressable
                  key={l}
                  onPress={() => onSelectLanguage(l)}
                  style={({ pressed }) => [
                    styles.langRow,
                    active && styles.langRowActive,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Flag locale={l} height={22} />
                  <Text style={[styles.langText, active && styles.langTextActive]}>
                    {FQ_LANGUAGE_NAMES[l]}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={ItalyColors.tileDark} />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  actions: { paddingHorizontal: 24, paddingTop: 12, gap: 14 },

  versionWrap: {
    marginTop: 'auto',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 10,
  },
  version: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    // Deep navy plate (matches the app's button colour), not near-black.
    backgroundColor: ItalyColors.tileDark,
    borderWidth: 1,
    borderColor: ItalyColors.tileLight,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: ItalyColors.tileDark,
    textAlign: 'center',
    marginBottom: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
  },
  langRowActive: { backgroundColor: '#D9E1FF' },
  langText: { flex: 1, fontSize: 17, fontWeight: '800', color: ItalyColors.tileDark },
  langTextActive: { color: ItalyColors.tileDark },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
