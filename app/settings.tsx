import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LanguageModal } from '@/components/settings/language-modal';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import { clearCache as clearContentCache } from '@/lib/content-cache';
import { getAndroidPackage, getStoreLinks } from '@/lib/store-links';
import { useContentCache } from '@/hooks/use-content-cache';
import { Sentry, sentryEnabled } from '@/lib/sentry';
import type { StringKey } from '@/i18n/strings';

const ONBOARDING_KEY = 'onboarding.seen.v1';
// All gameplay state lives under the "quiz." namespace: seen-sets,
// stats, achievements, mistakes, lives, hints, today's question.
const QUIZ_PREFIX = 'quiz.';

// External URLs — kept in one place so a future real Privacy/Terms page is a
// one-line change. Store links are no longer hardcoded here: they come from
// the snapshot's app config via getStoreLinks() (with safe fallbacks).
const PRIVACY_URL = 'https://quizzzes.com/privacy';
const TERMS_URL = 'https://quizzzes.com/terms';
const SUPPORT_EMAIL = 'support@quizzzes.com';

const LANGUAGE_LABEL: Record<SupportedLocale, string> = {
  en: 'English',
  es: 'Español',
  ru: 'Русский',
};

export default function SettingsScreen() {
  const { locale, changeLocale, resetLocale } = useLocale();
  const { resetPremium } = usePremium();
  const { t } = useTranslation();
  const { snapshot } = useContentCache();
  const [languageOpen, setLanguageOpen] = useState(false);

  async function handleReset() {
    const allKeys = await AsyncStorage.getAllKeys();
    // Wipe every gameplay key (stats, achievements, mistakes, lives,
    // hints, seen-sets, today's question) plus the onboarding flag.
    const quizKeys = allKeys.filter((k) => k.startsWith(QUIZ_PREFIX));
    await Promise.all([
      AsyncStorage.removeItem(ONBOARDING_KEY),
      quizKeys.length ? AsyncStorage.multiRemove(quizKeys) : Promise.resolve(),
      clearContentCache(),
      resetLocale(),
      resetPremium(),
    ]);
    router.replace('/splash');
  }

  // Show the temporary Sentry test button whenever debug reporting is on,
  // regardless of __DEV__ — so a normal Preview APK can verify it too.
  const showSentryTest = process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1';

  // Temporary verification helper: forces an error to Sentry so we can
  // confirm the DSN/build pipeline works end-to-end. Remove once verified.
  function triggerTestCrash() {
    const err = new Error('Sentry test crash from Settings (manual verification)');
    Sentry.captureException(err);
    if (typeof Alert?.alert === 'function') {
      Alert.alert(
        'Sentry test',
        sentryEnabled
          ? 'Test error sent to Sentry. Check the Issues dashboard in a few seconds.'
          : 'Sentry is OFF (no DSN, or disabled in this build). Nothing was sent.',
      );
    }
  }

  function confirmReset() {
    if (typeof Alert?.alert === 'function') {
      Alert.alert(
        'Reset app?',
        'Wipe language, onboarding and premium flags and start from scratch.',
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: handleReset },
        ],
      );
    } else {
      handleReset();
    }
  }

  function openUrl(url: string) {
    Linking.openURL(url).catch(() => {});
  }

  function handleContactUs() {
    const subject = 'Quizzes — feedback';
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    Linking.openURL(mailto).catch(() => {
      Alert.alert('Email', SUPPORT_EMAIL);
    });
  }

  async function handleRecommend() {
    const { storeUrl } = getStoreLinks(snapshot?.app, Platform.OS);
    try {
      await Share.share({ message: `${t('settings.recommend.text')} ${storeUrl}` });
    } catch {
      // user cancelled
    }
  }

  function handleRateUs() {
    const { rateDeepLink, rateFallbackUrl } = getStoreLinks(snapshot?.app, Platform.OS);
    Linking.openURL(rateDeepLink).catch(() => {
      openUrl(rateFallbackUrl);
    });
  }

  function handleSubscriptionManagement() {
    const url = Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : `https://play.google.com/store/account/subscriptions?package=${getAndroidPackage(snapshot?.app)}`;
    openUrl(url);
  }

  function handleRestorePurchases() {
    Alert.alert(
      t('settings.restorePurchases.titleAlert'),
      t('settings.restorePurchases.messageAlert'),
      [{ text: t('settings.restorePurchases.dismiss') }],
    );
  }

  function handleSignIn() {
    // Optional account / cross-device sync — UI placeholder for now.
    Alert.alert(
      t('settings.signIn.titleAlert'),
      t('settings.signIn.messageAlert'),
      [{ text: t('settings.restorePurchases.dismiss') }],
    );
  }

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel labelKey="settings.section.share" />
          <View style={styles.card}>
            <Row
              icon="square.and.arrow.up"
              label={t('settings.recommend')}
              onPress={handleRecommend}
            />
            <Divider />
            <Row
              icon="star.fill"
              label={t('settings.rateUs')}
              onPress={handleRateUs}
            />
          </View>

          <SectionLabel labelKey="settings.section.preferences" />
          <View style={styles.card}>
            <Row
              icon="globe"
              label={t('settings.language')}
              value={LANGUAGE_LABEL[locale]}
              onPress={() => setLanguageOpen(true)}
            />
          </View>

          <SectionLabel labelKey="settings.section.account" />
          <View style={styles.card}>
            <Row
              icon="person.fill"
              label={t('settings.signIn')}
              onPress={handleSignIn}
            />
            <Divider />
            <Row
              icon="arrow.clockwise"
              label={t('settings.restorePurchases')}
              onPress={handleRestorePurchases}
            />
            <Divider />
            <Row
              icon="creditcard.fill"
              label={t('settings.subscriptionManagement')}
              onPress={handleSubscriptionManagement}
            />
          </View>

          <SectionLabel labelKey="settings.section.help" />
          <View style={styles.card}>
            <Row
              icon="envelope.fill"
              label={t('settings.contactUs')}
              onPress={handleContactUs}
            />
          </View>

          <SectionLabel labelKey="settings.section.about" />
          <View style={styles.card}>
            <Row
              icon="lock.fill"
              label={t('settings.privacyPolicy')}
              onPress={() => openUrl(PRIVACY_URL)}
            />
            <Divider />
            <Row
              icon="doc.text.fill"
              label={t('settings.termsOfUse')}
              onPress={() => openUrl(TERMS_URL)}
            />
          </View>

          {__DEV__ && (
            <View style={styles.devSection}>
              <Text style={styles.devSectionLabel}>Developer</Text>
              <Pressable
                onPress={confirmReset}
                style={({ pressed }) => [styles.devButton, pressed && styles.devButtonPressed]}
                testID="dev-reset"
              >
                <Text style={styles.devButtonText}>Reset onboarding flags</Text>
              </Pressable>
              <Text style={styles.devHint}>
                Wipes language pick, onboarding seen, and premium flag, then sends you back to the splash screen.
              </Text>
            </View>
          )}

          {/* TEMPORARY Sentry verification block. Shown in ANY build (not just
              __DEV__) while EXPO_PUBLIC_SENTRY_DEBUG=1, so a normal Preview APK
              can be used to confirm crash reporting. Remove after verifying. */}
          {showSentryTest && (
            <View style={styles.devSection}>
              <Text style={styles.devSectionLabel}>Sentry check</Text>
              <Pressable
                onPress={triggerTestCrash}
                style={({ pressed }) => [styles.devButton, pressed && styles.devButtonPressed]}
                testID="dev-sentry-test"
              >
                <Text style={styles.devButtonText}>Send Sentry test error</Text>
              </Pressable>
              <Text style={styles.devHint}>
                Sentry: {sentryEnabled ? 'ON' : 'OFF (no DSN)'}. Temporary — remove after verifying.
              </Text>
            </View>
          )}
        </ScrollView>

        <BottomBar current="settings" />
      </SafeAreaView>

      <LanguageModal
        visible={languageOpen}
        selected={locale}
        onClose={() => setLanguageOpen(false)}
        onPick={(picked) => changeLocale(picked)}
      />
    </LinearGradient>
  );
}

function SectionLabel({ labelKey }: { labelKey: StringKey }) {
  const { t } = useTranslation();
  return <Text style={styles.sectionLabel}>{t(labelKey)}</Text>;
}

interface RowProps {
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  label: string;
  /** Optional right-aligned value (e.g. current language). */
  value?: string;
  onPress: () => void;
}

function Row({ icon, label, value, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIcon}>
        <IconSymbol name={icon} size={20} color="#a78bff" />
      </View>
      <Text style={styles.rowLabel} numberOfLines={1}>
        {label}
      </Text>
      {value && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
      <IconSymbol name="chevron.right" size={18} color="#ffffff66" />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff99',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#ffffff0f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ffffff14',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowPressed: {
    backgroundColor: '#ffffff0a',
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  rowValue: {
    color: '#ffffff99',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff1f',
    marginLeft: 58,
  },
  devSection: {
    marginTop: 28,
    gap: 10,
  },
  devSectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff66',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    paddingHorizontal: 4,
  },
  devButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  devButtonPressed: {
    opacity: 0.85,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  devHint: {
    color: '#ffffff77',
    fontSize: 12,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
});
