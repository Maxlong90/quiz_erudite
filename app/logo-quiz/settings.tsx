import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Linking, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { Flag } from '@/components/logo-quiz/flag';
import { GoldSurface } from '@/components/logo-quiz/gold-gradient';
import { RATE_APP_REWARD_COINS } from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow, GOLD_TEXT } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { restorePremium } from '@/lib/revenuecat';

// Each language shown in its own name, so the list reads the same regardless of
// the currently active locale.
const LANGUAGE_NAMES: Record<SupportedLocale, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
};

// External URLs / store identifiers — mirrors the main app's settings so a real
// Privacy page or store listing is a one-line change in both places.
const PRIVACY_URL = 'https://quizzzes.com/privacy';
const TERMS_URL = 'https://quizzzes.com/terms';
const SUPPORT_EMAIL = 'support@quizzzes.com';
const APP_BUNDLE_ID = 'com.quizzzes.erudite';
const IOS_APP_ID = '0000000000'; // placeholder until the App Store listing is live
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_BUNDLE_ID}`;
const APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_ID}`;

export default function LogoQuizSettings() {
  const t = useLQLabels();
  const { isPremium, buyPremium, cancelSubscription, resetProgress, rateRewarded, claimRateReward } =
    useLogoQuiz();
  const { locale, changeLocale, supportedLocales } = useLocale();
  const [langOpen, setLangOpen] = useState(false);

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  // Switching locale re-renders every localized surface instantly (labels,
  // category names, prompts, banners) via the shared LocaleProvider.
  const onSelectLanguage = (l: SupportedLocale) => {
    Haptics.selectionAsync().catch(() => {});
    changeLocale(l);
    setLangOpen(false);
  };

  // Cancel the subscription only when premium is active; a free account taps to
  // nothing (per spec). Guarded here and in the hook.
  const onCancelSubscription = () => {
    if (!isPremium) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    cancelSubscription();
  };

  // Restore a previously bought subscription via the real RevenueCat flow, then
  // reflect an active entitlement into the local premium state. Resolves false
  // (and shows the "nothing found" alert) in Expo Go / when nothing to restore.
  const onRestorePurchases = async () => {
    try {
      const restored = await restorePremium();
      if (restored) {
        buyPremium();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Alert.alert(t.restoreDoneTitle, t.restoreDoneMessage, [{ text: t.ok }]);
      } else {
        Alert.alert(t.restoreNoneTitle, t.restoreNoneMessage, [{ text: t.ok }]);
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert(t.restoreErrorTitle, t.restoreErrorMessage, [{ text: t.ok }]);
    }
  };

  const onPrivacy = () => openUrl(PRIVACY_URL);

  const onTerms = () => openUrl(TERMS_URL);

  const onRate = () => {
    // First tap grants the one-time coin reward (which also hides the badge).
    if (!rateRewarded) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      claimRateReward();
    }
    const target =
      Platform.OS === 'ios'
        ? `itms-apps://itunes.apple.com/app/id${IOS_APP_ID}?action=write-review`
        : `market://details?id=${APP_BUNDLE_ID}`;
    Linking.openURL(target).catch(() =>
      openUrl(Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL),
    );
  };

  const onSupport = () => {
    const subject = 'Logo Quiz — support';
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`).catch(() => {});
  };

  // Temporary DEV/QA tool: send every category back to level 1. Never rendered in
  // a production build (guarded by __DEV__ below).
  const onResetProgress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    resetProgress();
  };

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      {/* Header: back · title */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, LQShadow.card, pressed && { opacity: 0.85 }]}
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {t.settings}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.actions}>
        {/* Cancel subscription — active only while premium; disabled-looking otherwise. */}
        <SettingsButton
          label={t.cancelSubscription}
          onPress={onCancelSubscription}
          inactive={!isPremium}
        />
        {/* Restore Purchases — re-activates a previously bought subscription. */}
        <SettingsButton label={t.restorePurchases} onPress={onRestorePurchases} />
        {/* Language picker — opens the list; a pick switches the whole app instantly.
            The leading flag reflects the active locale and updates on every switch. */}
        <SettingsButton
          label={t.selectLanguage}
          onPress={() => setLangOpen(true)}
          icon={<Flag locale={locale} />}
        />
        {/* Rate the app — carries a shimmering, pulsing +100-coins reward badge that
            disappears once the one-time reward has been claimed. */}
        <View style={styles.rateWrap}>
          <SettingsButton label={t.rateApp} onPress={onRate} />
          {!rateRewarded && <CoinRewardBadge />}
        </View>
        <SettingsButton label={t.contactSupport} onPress={onSupport} />
        <SettingsButton label={t.privacyPolicy} onPress={onPrivacy} />
        {/* Terms of Use — mirrors Privacy Policy, opens the external page. */}
        <SettingsButton label={t.termsOfUse} onPress={onTerms} />

        {/* Temporary DEV tool — not shown in production builds. */}
        {__DEV__ && (
          <Pressable
            onPress={onResetProgress}
            style={({ pressed }) => [styles.devBtn, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="refresh" size={16} color="#7A1500" />
            <Text style={styles.devBtnText}>Сброс прогресса (DEV)</Text>
          </Pressable>
        )}
      </View>

      {/* Language picker — tapping a language changes the app locale instantly. */}
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
                  <Text style={[styles.langText, active && styles.langTextActive]}>
                    {LANGUAGE_NAMES[l]}
                  </Text>
                  {active && (
                    <Ionicons name="checkmark-circle" size={20} color={LQColors.primary} />
                  )}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// A Welcome-style pill button, ~40% shorter in height. `inactive` dims it and is
// used for actions that currently do nothing (cancel with no active subscription).
function SettingsButton({
  label,
  onPress,
  inactive,
  icon,
}: {
  label: string;
  onPress: () => void;
  inactive?: boolean;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        LQShadow.card,
        inactive && styles.btnInactive,
        pressed && !inactive && styles.pressed,
      ]}
    >
      {icon}
      <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

// A "+100 coins" reward badge pinned to the Rate button's corner. It reuses the
// premium banner's gold shimmer (GoldSurface) and gently pulses in and out.
// Decorative only (pointerEvents none) so taps fall through to the button.
function CoinRewardBadge() {
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Animated.View style={[styles.rewardBadge, LQShadow.gold, pulseStyle]} pointerEvents="none">
      <GoldSurface radius={LQRadius.pill} style={styles.rewardBadgeInner}>
        <CoinIcon size={13} />
        <Text style={styles.rewardBadgeText}>+{RATE_APP_REWARD_COINS}</Text>
      </GoldSurface>
    </Animated.View>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: LQRadius.pill,
    backgroundColor: LQColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: LQColors.text },
  headerSpacer: { width: 40 },

  actions: { paddingHorizontal: 24, paddingTop: 24, gap: 16 },
  // Welcome's play button is paddingVertical 20 / fontSize 36; this is ~40%
  // shorter (paddingVertical 12 / fontSize 22) while keeping the same pill look.
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  btnInactive: { opacity: 0.45 },
  btnText: { color: '#fff', fontWeight: '900', fontSize: 22 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },

  // Relative box so the reward badge can pin to the Rate button's corner.
  rateWrap: { position: 'relative' },
  rewardBadge: { position: 'absolute', top: -12, right: -6, zIndex: 10 },
  rewardBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rewardBadgeText: { color: GOLD_TEXT, fontWeight: '900', fontSize: 12 },

  devBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: LQRadius.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#7A1500',
    backgroundColor: '#ffffff55',
  },
  devBtnText: { color: '#7A1500', fontWeight: '800', fontSize: 13 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.lg,
    padding: 20,
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: LQColors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: LQRadius.md,
    backgroundColor: LQColors.bg,
  },
  langRowActive: { backgroundColor: LQColors.bgAlt },
  langText: { fontSize: 17, fontWeight: '800', color: LQColors.text },
  langTextActive: { color: LQColors.primary },
});
