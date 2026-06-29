import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ReviewerUnlockModal } from '@/components/paywall/reviewer-unlock-modal';
import { useContentCache } from '@/hooks/use-content-cache';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import type { StringKey } from '@/i18n/strings';
import {
  fetchPremiumPackages,
  purchasePremiumPackage,
  restorePremium,
  revenueCatEnabled,
  type PremiumPackages,
} from '@/lib/revenuecat';
import { Sentry } from '@/lib/sentry';

// Comparison rows. `free`/`premium` are either an i18n key (resolved
// via t()) or the literal check / cross marks rendered as-is.
const CHECK = '✓';
const CROSS = '✕';

interface CompareRow {
  labelKey: StringKey;
  // Either an i18n key (t() resolves it), a literal number string, or
  // the CHECK / CROSS marks.
  free: string;
  premium: string;
}

const COMPARE_ROWS: CompareRow[] = [
  { labelKey: 'paywall.row.lives', free: 'paywall.row.lives.free', premium: 'paywall.row.lives.premium' },
  { labelKey: 'paywall.row.ad', free: 'paywall.row.ad.free', premium: 'paywall.row.ad.premium' },
  { labelKey: 'paywall.row.modes', free: '3', premium: '9' },
  { labelKey: 'paywall.row.flashcards', free: CROSS, premium: CHECK },
  { labelKey: 'paywall.row.stats', free: 'paywall.row.stats.free', premium: 'paywall.row.stats.premium' },
];

// The three NO-TRIAL subscription tiers offered on the paywall. Keys match the
// PremiumPackages shape from lib/revenuecat. Visual order is yearly-first so the
// featured "best value" option leads; yearly is also the default selection.
// Hardcoded fallbacks mirror the live catalog and are used whenever RevenueCat
// is disabled (Expo Go / web / iOS) or a package is missing, so the card and the
// "save %" badge always render with correct numbers — never NaN.
type Tier = 'annual' | 'monthly' | 'weekly';

interface TierConfig {
  tier: Tier;
  labelKey: StringKey;
  suffixKey: StringKey;
  fallbackPriceString: string;
  fallbackPrice: number;
  featured: boolean;
}

const TIERS: TierConfig[] = [
  {
    tier: 'annual',
    labelKey: 'paywall.tier.yearly',
    suffixKey: 'paywall.price.perYear',
    fallbackPriceString: '$49.99',
    fallbackPrice: 49.99,
    featured: true,
  },
  {
    tier: 'monthly',
    labelKey: 'paywall.tier.monthly',
    suffixKey: 'paywall.price.perMonth',
    fallbackPriceString: '$12.99',
    fallbackPrice: 12.99,
    featured: false,
  },
  {
    tier: 'weekly',
    labelKey: 'paywall.tier.weekly',
    suffixKey: 'paywall.price.perWeek',
    fallbackPriceString: '$4.99',
    fallbackPrice: 4.99,
    featured: false,
  },
];

// Fallback monthly/yearly prices used to keep the "save %" badge correct when
// the live numeric prices aren't available.
const FALLBACK_MONTHLY_PRICE = 12.99;
const FALLBACK_ANNUAL_PRICE = 49.99;

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { setPremium } = usePremium();
  const { snapshot } = useContentCache();

  // Backend-controlled, per-app flag (Nova: "Show Paywall Review Button").
  // Turned on only while a build is under Google Play review.
  const showReviewButton =
    Platform.OS === 'android' && snapshot?.app.show_paywall_review_button === true;

  // Backend-controlled, per-app (Nova: "Seconds Before Quit Button Shown").
  // Both paywall exits — the close ✕ and the "continue free" link — stay
  // hidden for this many seconds, forcing the offer to be seen first.
  // 0 / absent = exits shown immediately. Applies on all platforms.
  const quitDelaySec = snapshot?.app.seconds_before_quit_button_shown ?? 0;
  const [canQuit, setCanQuit] = useState(quitDelaySec <= 0);

  useEffect(() => {
    if (quitDelaySec <= 0) {
      setCanQuit(true);
      return;
    }
    // Re-arm whenever the configured delay changes (e.g. snapshot resync).
    setCanQuit(false);
    const timer = setTimeout(() => setCanQuit(true), quitDelaySec * 1000);
    return () => clearTimeout(timer);
  }, [quitDelaySec]);

  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Live store packages for the three tiers. Stay null when RevenueCat is
  // disabled — cards then fall back to the hardcoded prices in TIERS.
  const [packages, setPackages] = useState<PremiumPackages>({
    weekly: null,
    monthly: null,
    annual: null,
  });
  // Yearly is the featured, default-selected option.
  const [selected, setSelected] = useState<Tier>('annual');

  // Live-offering load status. Only meaningful when RevenueCat is enabled; a
  // disabled store has nothing to load, so it starts 'ready'. While 'loading'
  // the Subscribe CTA is disabled so a misconfigured offering can never be
  // tapped into a free unlock; 'unavailable' means the offering resolved empty
  // or failed (the CTA then surfaces an error instead of granting premium).
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
          // Offering resolved empty/misconfigured. Never silently degrade into a
          // free unlock — track it so a broken offering is visible in Sentry.
          Sentry.captureException(
            new Error('paywall: premium offering loaded with no packages'),
          );
        }
      })
      .catch((err) => {
        // Don't swallow the failure: keep the hardcoded fallback prices for
        // display, but mark the offering unavailable and report the error.
        if (!active) return;
        setOfferingStatus('unavailable');
        Sentry.captureException(err);
      });
    return () => {
      active = false;
    };
  }, []);

  // "Save %" of yearly vs 12 months of the monthly plan. Uses live numeric
  // prices when present, hardcoded fallbacks otherwise, so it's never NaN.
  const savePercent = useMemo(() => {
    const monthly = packages.monthly?.product.price ?? FALLBACK_MONTHLY_PRICE;
    const annual = packages.annual?.product.price ?? FALLBACK_ANNUAL_PRICE;
    if (monthly <= 0) return 0;
    return Math.max(0, Math.round((1 - annual / (12 * monthly)) * 100));
  }, [packages]);

  async function handleSubscribe() {
    if (purchasing) return;

    // Expo Go / web / iOS — no real store exists. Keep the MVP local unlock so
    // subscribing never crashes or dead-ends on platforms without RevenueCat.
    if (!revenueCatEnabled) {
      await setPremium(true);
      router.replace('/');
      return;
    }

    // RevenueCat is enabled but the selected package failed to load. NEVER grant
    // premium locally here — that was the production free-unlock bug (commit
    // fba9061): a misconfigured offering would otherwise unlock everything for
    // free. Surface an error and bail; the store is the only path to premium.
    const pkg = packages[selected];
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
        router.replace('/');
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
        router.replace('/');
      } else {
        Alert.alert(t('paywall.restore.none.title'), t('paywall.restore.none.body'));
      }
    } catch {
      Alert.alert(t('paywall.error.title'), t('paywall.error.body'));
    } finally {
      setRestoring(false);
    }
  }

  function handleDismiss() {
    router.replace('/');
  }

  // Android-only review-access flow. Google Play reviewers cannot run a real
  // purchase during review, so the app would otherwise fail the "verify the
  // paid functionality" check. Tapping the button opens a login/password
  // dialog; the backend validates the credentials (set per-app in Nova and
  // shared via the store review instructions) and only then is premium
  // unlocked locally — without payment, and without shipping the password to
  // the client. Kept out of iOS, where App Store review uses sandbox
  // purchases. NOTE: intentionally NOT gated by __DEV__ — reviewers test a
  // release build where __DEV__ is false.
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  async function handleReviewUnlocked() {
    setReviewModalVisible(false);
    await setPremium(true);
    router.replace('/');
  }

  // Block the CTA only while the live offering is still loading, so a tap can
  // never race ahead of the packages. Once loaded it's enabled: an empty/failed
  // offering then surfaces an error on tap (handleSubscribe) rather than a free
  // grant. Disabled stores have nothing to load and stay enabled.
  const ctaLoading = purchasing || (revenueCatEnabled && offeringStatus === 'loading');

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <View style={styles.spacer} />
          {canQuit && (
            <Pressable
              onPress={handleDismiss}
              hitSlop={12}
              style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
              accessibilityLabel="Close paywall"
              testID="paywall-close"
            >
              <IconSymbol name="xmark" size={22} color="#ffffffcc" />
            </Pressable>
          )}
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.hero}>
          <Image
            source={require('@/assets/onboarding/trophy.png')}
            style={styles.trophy}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        </View>

        <View style={styles.table}>
          {/* Column headers */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.featureCol} />
            <View style={styles.valueCol}>
              <Text style={styles.colHeaderFree}>{t('paywall.col.free')}</Text>
            </View>
            <View style={[styles.valueCol, styles.premiumCol]}>
              <Text style={styles.colHeaderPremium}>{t('paywall.col.premium')}</Text>
            </View>
          </View>

          {COMPARE_ROWS.map((row, idx) => (
            <View
              key={row.labelKey}
              style={[styles.tableRow, idx < COMPARE_ROWS.length - 1 && styles.rowDivider]}
            >
              <Text style={styles.featureLabel}>{t(row.labelKey)}</Text>
              <View style={styles.valueCol}>
                <CompareCell value={row.free} />
              </View>
              <View style={[styles.valueCol, styles.premiumCol]}>
                <CompareCell value={row.premium} premium />
              </View>
            </View>
          ))}
        </View>
        </ScrollView>

        <View style={styles.actions}>
        <View style={styles.tiers}>
          {TIERS.map((cfg) => {
            const pkg = packages[cfg.tier];
            const priceString = pkg?.product.priceString ?? cfg.fallbackPriceString;
            const isSelected = selected === cfg.tier;
            return (
              <Pressable
                key={cfg.tier}
                onPress={() => setSelected(cfg.tier)}
                style={[
                  styles.tierCard,
                  cfg.featured && styles.tierCardFeatured,
                  isSelected && styles.tierCardSelected,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                testID={`paywall-tier-${cfg.tier}`}
              >
                {cfg.featured && (
                  <View style={styles.badgeRow}>
                    <Text style={styles.bestValueBadge}>{t('paywall.badge.bestValue')}</Text>
                    {savePercent > 0 && (
                      <Text style={styles.saveBadge}>
                        {t('paywall.badge.save', { percent: savePercent })}
                      </Text>
                    )}
                  </View>
                )}
                <View style={styles.tierRow}>
                  <View style={styles.tierRadioWrap}>
                    <View style={[styles.tierRadio, isSelected && styles.tierRadioSelected]}>
                      {isSelected && <View style={styles.tierRadioDot} />}
                    </View>
                    <Text style={[styles.tierLabel, isSelected && styles.tierLabelSelected]}>
                      {t(cfg.labelKey)}
                    </Text>
                  </View>
                  <View style={styles.tierPriceRow}>
                    <Text style={[styles.tierPrice, isSelected && styles.tierPriceSelected]}>
                      {priceString}
                    </Text>
                    <Text style={styles.tierSuffix}>{t(cfg.suffixKey)}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

          <Pressable
            onPress={handleSubscribe}
            disabled={ctaLoading}
            style={({ pressed }) => [
              styles.cta,
              pressed && styles.ctaPressed,
              ctaLoading && styles.ctaDisabled,
            ]}
            testID="paywall-subscribe"
          >
            <Text style={styles.ctaText}>{ctaLoading ? '…' : t('paywall.cta')}</Text>
          </Pressable>

          {/* Restore is only meaningful with a real store account. */}
          {revenueCatEnabled && (
            <Pressable
              onPress={handleRestore}
              disabled={restoring}
              hitSlop={10}
              testID="paywall-restore"
            >
              <Text style={styles.restoreText}>
                {restoring ? '…' : t('paywall.restore')}
              </Text>
            </Pressable>
          )}

          {canQuit && (
            <Pressable onPress={handleDismiss} hitSlop={10} testID="paywall-dismiss">
              <Text style={styles.dismissText}>{t('paywall.continueFree')}</Text>
            </Pressable>
          )}

          <Text style={styles.disclaimer}>{t('paywall.disclaimer')}</Text>

          {showReviewButton && (
            <Pressable
              onPress={() => setReviewModalVisible(true)}
              hitSlop={10}
              style={({ pressed }) => [styles.reviewAccess, pressed && styles.reviewAccessPressed]}
              testID="paywall-review-access"
            >
              <Text style={styles.reviewAccessText}>{t('paywall.reviewAccess')}</Text>
            </Pressable>
          )}
        </View>

        {showReviewButton && (
          <ReviewerUnlockModal
            visible={reviewModalVisible}
            onClose={() => setReviewModalVisible(false)}
            onUnlocked={handleReviewUnlocked}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function CompareCell({ value, premium }: { value: string; premium?: boolean }) {
  const { t } = useTranslation();
  if (value === CHECK) {
    return <Text style={[styles.cellCheck, premium && styles.cellCheckPremium]}>{CHECK}</Text>;
  }
  if (value === CROSS) {
    return <Text style={styles.cellCross}>{CROSS}</Text>;
  }
  // Numeric literals ('3', '9') pass through t() unchanged; real keys
  // resolve to localized strings.
  return (
    <Text style={[styles.cellText, premium && styles.cellTextPremium]}>{t(value as StringKey)}</Text>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  spacer: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.5,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 0,
    gap: 10,
  },
  trophy: {
    width: 96,
    height: 96,
    marginBottom: 2,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(124, 92, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffffcc',
    textAlign: 'center',
  },
  table: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 18,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    borderColor: '#ffffff14',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff22',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff14',
  },
  featureCol: {
    flex: 1.4,
  },
  featureLabel: {
    flex: 1.4,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
  },
  // Gold wash down the Premium column to set it apart as the paid tier.
  premiumCol: {
    backgroundColor: '#ffd23a14',
  },
  colHeaderFree: {
    color: '#ffffff99',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  colHeaderPremium: {
    color: '#ffd23a',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cellText: {
    color: '#ffffffcc',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cellTextPremium: {
    color: '#ffd23a',
    fontWeight: '800',
  },
  cellCheck: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '900',
  },
  cellCheckPremium: {
    color: '#ffd23a',
  },
  cellCross: {
    color: '#ffffff44',
    fontSize: 16,
    fontWeight: '800',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  tiers: {
    width: '100%',
    marginBottom: 4,
    gap: 10,
  },
  tierCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#ffffff22',
    backgroundColor: '#ffffff0d',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  tierCardFeatured: {
    borderColor: '#ffd23a55',
  },
  tierCardSelected: {
    borderColor: '#7c5cff',
    backgroundColor: '#7c5cff26',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  bestValueBadge: {
    color: '#1a1a47',
    backgroundColor: '#ffd23a',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  saveBadge: {
    color: '#fff',
    backgroundColor: '#22c55e',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierRadioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexShrink: 1,
  },
  tierRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ffffff55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRadioSelected: {
    borderColor: '#7c5cff',
  },
  tierRadioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#7c5cff',
  },
  tierLabel: {
    color: '#ffffffcc',
    fontSize: 17,
    fontWeight: '700',
  },
  tierLabelSelected: {
    color: '#fff',
  },
  tierPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  tierPrice: {
    color: '#ffffffdd',
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tierPriceSelected: {
    color: '#fff',
  },
  tierSuffix: {
    color: '#ffffff88',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: 'center',
    gap: 14,
  },
  cta: {
    width: '100%',
    backgroundColor: '#7c5cff',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  restoreText: {
    color: '#ffffffcc',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 6,
  },
  dismissText: {
    color: '#ffffff99',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 6,
  },
  disclaimer: {
    color: '#ffffff66',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  // Discreet review-access affordance (Android only). Bordered pill so a
  // reviewer can find it, but visually subordinate to the real CTA.
  reviewAccess: {
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ffffff33',
  },
  reviewAccessPressed: {
    opacity: 0.6,
  },
  reviewAccessText: {
    color: '#ffffff88',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
