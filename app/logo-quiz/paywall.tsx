import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { LOGO_QUIZ_CTA_GRADIENT, LogoQuizColors, LogoQuizRadii } from '@/constants/logo-quiz-theme';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import type { StringKey } from '@/i18n/strings';
import {
  fetchPremiumPackages,
  isExpoGo,
  purchasePremiumPackage,
  restorePremium,
  revenueCatEnabled,
  type PremiumPackages,
} from '@/lib/revenuecat';
import { Sentry } from '@/lib/sentry';

interface Benefit {
  icon: Parameters<typeof IconSymbol>[0]['name'];
  accent: string;
  labelKey: StringKey;
}

const BENEFITS: Benefit[] = [
  { icon: 'lock.fill', accent: LogoQuizColors.cyan, labelKey: 'logoQuiz.paywall.benefit1' },
  { icon: 'sparkles', accent: LogoQuizColors.purple, labelKey: 'logoQuiz.paywall.benefit2' },
  { icon: 'bolt.fill', accent: LogoQuizColors.green, labelKey: 'logoQuiz.paywall.benefit3' },
];

export default function LogoQuizPaywallScreen() {
  const { t } = useTranslation();
  const { setPremium } = usePremium();

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [packages, setPackages] = useState<PremiumPackages>({ weekly: null, monthly: null, annual: null });
  const [offeringStatus, setOfferingStatus] = useState<'loading' | 'ready' | 'unavailable'>(
    revenueCatEnabled ? 'loading' : 'ready',
  );

  useEffect(() => {
    if (!revenueCatEnabled) return;
    let active = true;
    fetchPremiumPackages()
      .then((pkgs) => {
        if (!active) return;
        setPackages(pkgs);
        const hasAny = Boolean(pkgs.weekly || pkgs.monthly || pkgs.annual);
        setOfferingStatus(hasAny ? 'ready' : 'unavailable');
        if (!hasAny) {
          Sentry.captureException(new Error('logo-quiz paywall: premium offering loaded with no packages'));
        }
      })
      .catch((err) => {
        if (!active) return;
        setOfferingStatus('unavailable');
        Sentry.captureException(err);
      });
    return () => {
      active = false;
    };
  }, []);

  // Price shown on the CTA pill. Live store price wins; the $4.99/mo
  // placeholder is only a fallback for display when no live price loads.
  const priceString = packages.monthly?.product.priceString ?? t('logoQuiz.paywall.priceFallback');

  async function handleSubscribe() {
    if (purchasing) return;

    // Store billing disabled. The MVP local unlock is permitted ONLY in genuine
    // dev environments (Expo Go / web), mirroring the main paywall / lib/iap.ts
    // fail-closed policy. On a real store device where billing is unavailable we
    // must NOT hand out premium for free (past bug #568) — surface an error.
    if (!revenueCatEnabled) {
      if (isExpoGo || Platform.OS === 'web') {
        await setPremium(true);
        router.back();
        return;
      }
      Alert.alert(t('paywall.error.title'), t('paywall.error.body'));
      return;
    }

    // RevenueCat enabled but the monthly package failed to load. Never grant
    // premium locally here — the store is the only path to premium.
    const pkg = packages.monthly;
    if (!pkg) {
      Alert.alert(t('paywall.error.title'), t('paywall.error.body'));
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchasePremiumPackage(pkg);
      // Cancellation is a silent no-op; only unlock once the entitlement is live.
      if (result.outcome === 'purchased' && result.premiumActive) {
        await setPremium(true);
        router.back();
      }
    } catch {
      Alert.alert(t('paywall.error.title'), t('paywall.error.body'));
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (restoring) return;
    setRestoring(true);
    try {
      const active = await restorePremium();
      if (active) {
        await setPremium(true);
        router.back();
      } else {
        Alert.alert(t('paywall.restore.none.title'), t('paywall.restore.none.body'));
      }
    } catch {
      Alert.alert(t('paywall.error.title'), t('paywall.error.body'));
    } finally {
      setRestoring(false);
    }
  }

  const ctaLoading = purchasing || (revenueCatEnabled && offeringStatus === 'loading');

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.header}>
          <View style={styles.flex} />
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            testID="logo-paywall-close"
            accessibilityLabel="Close"
          >
            <IconSymbol name="xmark" size={20} color={LogoQuizColors.textSecondary} />
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <LinearGradient
              colors={[LogoQuizColors.magenta, LogoQuizColors.purple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.crest}
            >
              <IconSymbol name="star.fill" size={40} color={LogoQuizColors.text} />
            </LinearGradient>
            <Text style={styles.eyebrow}>{t('logoQuiz.paywall.eyebrow')}</Text>
            <Text style={styles.title}>{t('logoQuiz.paywall.title')}</Text>
            <Text style={styles.subtitle}>{t('logoQuiz.paywall.subtitle')}</Text>
          </View>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.labelKey} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { borderColor: b.accent, shadowColor: b.accent }]}>
                  <IconSymbol name={b.icon} size={20} color={b.accent} />
                </View>
                <Text style={styles.benefitText}>{t(b.labelKey)}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            onPress={handleSubscribe}
            disabled={ctaLoading}
            style={({ pressed }) => [styles.ctaWrap, pressed && !ctaLoading && styles.pressed, ctaLoading && styles.ctaInactive]}
            testID="logo-paywall-subscribe"
          >
            <LinearGradient
              colors={[...LOGO_QUIZ_CTA_GRADIENT]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              {ctaLoading ? (
                <ActivityIndicator color={LogoQuizColors.text} />
              ) : (
                <>
                  <Text style={styles.ctaLabel}>{t('logoQuiz.paywall.cta')}</Text>
                  <View style={styles.pricePill}>
                    <Text style={styles.priceText}>{priceString}</Text>
                  </View>
                </>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.finePrintRow}>
            <IconSymbol name="lock.fill" size={12} color={LogoQuizColors.textMuted} />
            <Text style={styles.disclaimer}>{t('logoQuiz.paywall.disclaimer')}</Text>
            {revenueCatEnabled && (
              <Pressable onPress={handleRestore} disabled={restoring} hitSlop={8} testID="logo-paywall-restore">
                <Text style={styles.restore}>{restoring ? '…' : t('logoQuiz.paywall.restore')}</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LogoQuizColors.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LogoQuizColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  hero: {
    alignItems: 'center',
    gap: 10,
    paddingTop: 8,
    paddingBottom: 24,
  },
  crest: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: LogoQuizColors.magenta,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 28,
    elevation: 12,
  },
  eyebrow: {
    color: LogoQuizColors.magenta,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  title: {
    color: LogoQuizColors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: LogoQuizColors.textSecondary,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
  },
  benefits: {
    gap: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: LogoQuizColors.surface,
    borderRadius: LogoQuizRadii.md,
    borderWidth: 1,
    borderColor: LogoQuizColors.border,
    padding: 14,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LogoQuizColors.surfaceElevated,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 4,
  },
  benefitText: {
    flex: 1,
    color: LogoQuizColors.text,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  ctaWrap: {
    borderRadius: LogoQuizRadii.xl,
    shadowColor: LogoQuizColors.magenta,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaInactive: {
    opacity: 0.6,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: LogoQuizRadii.xl,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  ctaLabel: {
    color: LogoQuizColors.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  pricePill: {
    backgroundColor: '#00000033',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  priceText: {
    color: LogoQuizColors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  finePrintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  disclaimer: {
    color: LogoQuizColors.textMuted,
    fontSize: 12,
  },
  restore: {
    color: LogoQuizColors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
