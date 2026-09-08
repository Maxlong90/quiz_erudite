/**
 * The configurable template's paywall — a deliberate COPY of app/paywall.tsx,
 * for the reason app/t/quiz.tsx's docblock sets out: a screen owns a route, so
 * each app gets its own; the leaf components it renders (ScreenBackground,
 * IconSymbol, ReviewerUnlockModal) are shared, not duplicated.
 *
 * The diff against app/paywall.tsx is six things:
 *  1. the palette arrives through hooks/t/use-template-theme.ts — at BOTH call
 *     sites, the screen and CompareCell;
 *  2. all five exits are `router.replace('/t')` rather than `router.replace('/')`.
 *     This is the whole point of the port. On a template build app/index.tsx
 *     redirects '/' to '/t/splash', so an un-ported exit does not crash — it
 *     silently bounces the player back through the SPLASH on the way home. This
 *     screen carried five of them, more than any other in the tree;
 *  3. the nineteen colour literals are gone. Fifteen map straight onto palette
 *     tokens (six directly, nine as inline `withAlpha` tints of `accent`,
 *     `onAccent` and `gold` — all byte-exact against the bundled palette, so the
 *     port is zero-pixel there). The remaining four are the chip redesign below;
 *  4. THE TWO FEATURED-CARD CHIPS ARE REDESIGNED, and this is an intentional
 *     pixel change. The originals were solid fills with hardcoded ink —
 *     `#1a1a47` on `#ffd23a`, and `#fff` on `#22c55e`. Neither ink has a token:
 *     `#1a1a47` happens to equal the bundled dark `bgSolid`, but `bgSolid` IS
 *     operator-settable, so a pale preset would give white-on-gold. The obvious
 *     alternative — a gold wash with `color: c.gold`, the treatment the premium
 *     column header uses — fails harder: the chips sit on `c.surfaceSoft`, which
 *     in the SHIPPED light appearance composites to roughly #f1eefb, and gold on
 *     that is about 1.3:1. So the fill and the border carry the hue and the INK
 *     moves to `c.text`.
 *
 *     THE RULE, worth stating once: `gold` / `success` / `danger` are fixed
 *     hexes with no guaranteed foreground partner. They may be chip DECORATION
 *     (fill wash, border) but never chip INK on a card surface. The only two
 *     pairings the wire contract guarantees are (accent, onAccent) — which this
 *     screen's CTA already leans on — and (any card surface, text/textMuted).
 *
 *     Each chip is now a <View> wrapping its <Text>. `borderWidth` type-checks
 *     on a <Text> (TextStyle extends ViewStyle) but does not RENDER portably:
 *     Android's ReactTextView draws borders, iOS's text node does not. A <View>
 *     also clips its own background to `borderRadius` natively, which is why the
 *     original's `overflow: 'hidden'` workaround is gone. Accepted layout delta:
 *     Yoga lays the border outside the content box, so each chip grows 2px and
 *     the featured card (with the two cards below it) shifts down about 2px;
 *  5. the hero is the asset-pack slot `paywall/hero.png` rather than Erudite's
 *     `assets/onboarding/trophy.png`. The slot ships in every pack and until now
 *     was drawn by nothing but the onboarding's last slide. It is authored 4:3,
 *     not square, so it gets its own box the way app/t/onboarding.tsx's does —
 *     at the original 80x80 it would have drawn 80x60 and read as a small white
 *     rectangle rather than as artwork;
 *  6. `table.marginTop` drops from 84 to 24. That 84 existed only to push the
 *     benefits block lower on the yearly-default paywall — a job the 70px-taller
 *     hero now does. Net the table lands within ~10px of where it did.
 *
 * TWO THINGS THAT LOOK LIKE PORT DAMAGE AND ARE NOT:
 *  - THE FREE-UNLOCK GUARD in handleSubscribe is copied VERBATIM, both halves.
 *    A disabled store grants premium locally ONLY in Expo Go / on web; an
 *    enabled store with a missing package NEVER grants it. The second half is
 *    the fix for a production free-unlock bug (commit fba9061) and must not be
 *    "simplified" into a single branch.
 *  - COMPARE_ROWS is still shaped by `adsEnabled` at MODULE LOAD, not by state.
 *    Rewarded ads are a build capability, not a runtime one.
 *
 * KNOWN BOUNDARY, not an oversight: app/t/index.tsx renders the SHARED
 * components/bottom-bar.tsx, whose gold crown still pushes the ERUDITE
 * '/paywall' — along with its five other absolute routes (/account, /shop, /,
 * /stats, /settings). The escape check in __tests__/app/t-routes.test.ts only
 * scans app/t/**, so it cannot see any of them. Re-pointing just the crown would
 * leave the bar half-ported; a t-scoped bar belongs with the subtask that ports
 * stats / shop / account / settings, which needs one anyway.
 *
 * makeStyles keeps its EruditePalette signature: a TemplateTheme IS an
 * EruditePalette, and this screen uses none of the tier roles, so widening the
 * type would falsely signal that it needs the superset.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/screen-background';
import { ReviewerUnlockModal } from '@/components/paywall/reviewer-unlock-modal';
import { adsEnabled } from '@/lib/ads';
import { useContentCache } from '@/hooks/use-content-cache';
import { usePremium } from '@/hooks/use-premium';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { useTranslation } from '@/hooks/use-translation';
import { withAlpha } from '@/lib/theme/color';
import { T_ASSET_SLOTS } from '@/constants/t/asset-slots';
import type { EruditePalette } from '@/constants/theme';
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

// Comparison rows. `free`/`premium` are either an i18n key (resolved
// via t()) or the literal check / cross marks rendered as-is.
const CHECK = '✓';
const CROSS = '✕';
// Premium lives are unlimited (see the economy overhaul), rendered as ∞.
const INFINITY = '∞';

interface CompareRow {
  labelKey: StringKey;
  // Either an i18n key (t() resolves it), a literal number string, or
  // the CHECK / CROSS marks.
  free: string;
  premium: string;
}

const COMPARE_ROWS: CompareRow[] = [
  // Premium = unlimited lives per day, so the premium cell is ∞ (not a number).
  { labelKey: 'paywall.row.lives', free: 'paywall.row.lives.free', premium: INFINITY },
  // "Watch ad -> +life" only exists where rewarded ads are actually wired
  // (Android). iOS has no rewarded-ad feature, so the row is omitted there
  // rather than promising a capability the platform can't deliver.
  ...(adsEnabled
    ? [{ labelKey: 'paywall.row.ad', free: 'paywall.row.ad.free', premium: 'paywall.row.ad.premium' } as CompareRow]
    : []),
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

export default function TPaywallScreen() {
  const { t } = useTranslation();
  const { setPremium } = usePremium();
  const { snapshot } = useContentCache();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Backend-controlled, per-app flag (Nova: "Show Paywall Review Button").
  // Turned on only while a build is under store review. Capability-gated on
  // revenueCatEnabled so it only appears where real purchases exist (works on
  // iOS once its key is supplied); never on a store-less platform.
  const showReviewButton =
    revenueCatEnabled && snapshot?.app.show_paywall_review_button === true;

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

    // Store billing disabled. The MVP local unlock is permitted ONLY in genuine
    // dev environments (Expo Go / web), mirroring lib/iap.ts' fail-closed
    // policy. On a real store device where billing is unavailable (e.g. iOS
    // before its RevenueCat key is supplied) we must NOT hand out premium for
    // free — surface an error and bail so no broken paywall grants incorrectly.
    if (!revenueCatEnabled) {
      if (isExpoGo || Platform.OS === 'web') {
        await setPremium(true);
        router.replace('/t');
        return;
      }
      Alert.alert(t('paywall.error.title'), t('paywall.error.body'));
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
        router.replace('/t');
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
        router.replace('/t');
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
    router.replace('/t');
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
    router.replace('/t');
  }

  // Block the CTA only while the live offering is still loading, so a tap can
  // never race ahead of the packages. Once loaded it's enabled: an empty/failed
  // offering then surfaces an error on tap (handleSubscribe) rather than a free
  // grant. Disabled stores have nothing to load and stay enabled.
  const ctaLoading = purchasing || (revenueCatEnabled && offeringStatus === 'loading');

  return (
    <ScreenBackground>
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
              <IconSymbol name="xmark" size={22} color={colors.textMuted} />
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
            source={T_ASSET_SLOTS['paywall/hero.png']}
            style={styles.heroArt}
            resizeMode="contain"
            testID="t-paywall-hero"
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
                    {/* Each chip is a View wrapping its Text — see item 4 of the
                        docblock: a bordered <Text> renders on Android and not on
                        iOS, and a View clips its own background to the radius. */}
                    <View style={styles.bestValueBadge}>
                      <Text style={styles.bestValueBadgeText}>{t('paywall.badge.bestValue')}</Text>
                    </View>
                    {savePercent > 0 && (
                      <View style={styles.saveBadge}>
                        <Text style={styles.saveBadgeText}>
                          {t('paywall.badge.save', { percent: savePercent })}
                        </Text>
                      </View>
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
    </ScreenBackground>
  );
}

function CompareCell({ value, premium }: { value: string; premium?: boolean }) {
  const { t } = useTranslation();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (value === CHECK) {
    return <Text style={[styles.cellCheck, premium && styles.cellCheckPremium]}>{CHECK}</Text>;
  }
  if (value === CROSS) {
    return <Text style={styles.cellCross}>{CROSS}</Text>;
  }
  if (value === INFINITY) {
    return (
      <Text style={[styles.cellText, styles.cellInfinity, premium && styles.cellTextPremium]}>
        {INFINITY}
      </Text>
    );
  }
  // Numeric literals ('3', '9') pass through t() unchanged; real keys
  // resolve to localized strings.
  return (
    <Text style={[styles.cellText, premium && styles.cellTextPremium]}>{t(value as StringKey)}</Text>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
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
    gap: 8,
  },
  // The asset-pack hero is authored 4:3, not square, so it gets its own box —
  // the same reason app/t/onboarding.tsx:229 gives its copy one. Smaller than
  // onboarding's 280x210 because here the artwork shares the fold with a title,
  // a subtitle and the top of the comparison table.
  heroArt: {
    width: 200,
    height: 150,
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: c.text,
    letterSpacing: 0.4,
    textAlign: 'center',
    // The accent glow, matching the template home's wordmark shadow
    // (app/t/index.tsx:672). Stays an inline tint rather than a named role in
    // hooks/t/use-template-theme.ts: it is a SHADOW, not an ink or surface, and
    // naming it would make it that hook's first non-tier entry — a precedent for
    // every shadow in the template. Promoting it later moves no call site.
    textShadowColor: withAlpha(c.accent, 0.5),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 15,
    color: c.textMuted,
    textAlign: 'center',
  },
  table: {
    marginHorizontal: 20,
    // The Erudite original sets 84 here, purely to push the benefits block lower
    // on the (yearly-default) paywall. The 4:3 hero above is ~70px taller than
    // the square trophy it replaced and does that job now, so this drops to 24
    // and the table lands within ~10px of where it did.
    marginTop: 24,
    marginBottom: 14,
    borderRadius: 18,
    // The panel reads as "premium" by being a near-opaque wash of the CTA's own
    // accent, so it repaints with the operator's preset instead of staying the
    // bundled purple the original hardcoded.
    backgroundColor: withAlpha(c.accent, 0.8),
    borderWidth: 1,
    borderColor: c.accent,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // Everything inside the table sits ON the accent panel, so its ink and its
    // rules are tints of `onAccent` — the one foreground the wire contract
    // guarantees against `accent`.
    borderBottomColor: withAlpha(c.onAccent, 0.133),
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: withAlpha(c.onAccent, 0.08),
  },
  featureCol: {
    flex: 1.4,
  },
  featureLabel: {
    flex: 1.4,
    color: c.onAccent,
    fontSize: 15,
    fontWeight: '600',
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
  },
  // Gold wash down the Premium column to set it apart as the paid tier.
  premiumCol: {
    backgroundColor: withAlpha(c.gold, 0.08),
  },
  colHeaderFree: {
    color: withAlpha(c.onAccent, 0.6),
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  colHeaderPremium: {
    color: c.gold,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cellText: {
    color: withAlpha(c.onAccent, 0.8),
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cellTextPremium: {
    color: c.gold,
    fontWeight: '800',
  },
  // UNREACHABLE TODAY: every CHECK in COMPARE_ROWS sits in the PREMIUM column,
  // where cellCheckPremium's gold overrides this green — so `success` never
  // actually paints and the mapping is zero-pixel. If a row ever puts a CHECK in
  // the FREE column, do not ship this as-is: the light `success` (#16a34a) on
  // the accent panel is about 1.02:1, i.e. invisible. Use c.onAccent there.
  cellCheck: {
    color: c.success,
    fontSize: 18,
    fontWeight: '900',
  },
  cellCheckPremium: {
    color: c.gold,
  },
  cellCross: {
    color: withAlpha(c.onAccent, 0.267),
    fontSize: 16,
    fontWeight: '800',
  },
  // ∞ reads better a touch larger than the numeric cells.
  cellInfinity: {
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  tiers: {
    width: '100%',
    marginBottom: 0,
    gap: 8,
  },
  tierCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.surfaceSoft,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  tierCardFeatured: {
    borderColor: withAlpha(c.gold, 0.333),
  },
  tierCardSelected: {
    borderColor: c.accent,
    backgroundColor: c.accentBg,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  // Both chips: a tinted wash plus a stronger border of the SAME hue, with the
  // ink on `c.text`. See item 4 of the docblock for why the hue cannot be the
  // ink here — these sit on a card surface, not on the accent panel, and the
  // wire contract guarantees no partner for `gold` or `success`. The border is
  // deliberately the stronger of the two tints: with the ink no longer coloured,
  // it is what tells the two chips apart.
  bestValueBadge: {
    backgroundColor: withAlpha(c.gold, 0.2),
    borderColor: withAlpha(c.gold, 0.55),
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  bestValueBadgeText: {
    color: c.text,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveBadge: {
    backgroundColor: withAlpha(c.success, 0.2),
    borderColor: withAlpha(c.success, 0.55),
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  saveBadgeText: {
    color: c.text,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
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
    borderColor: c.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierRadioSelected: {
    borderColor: c.accent,
  },
  tierRadioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: c.accent,
  },
  tierLabel: {
    color: c.textMuted,
    fontSize: 16,
    fontWeight: '700',
  },
  tierLabelSelected: {
    color: c.text,
  },
  tierPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  tierPrice: {
    color: c.textMuted,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  tierPriceSelected: {
    color: c.text,
  },
  tierSuffix: {
    color: c.textFaint,
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 0,
    alignItems: 'center',
    gap: 9,
  },
  cta: {
    width: '100%',
    backgroundColor: c.accent,
    paddingVertical: 15,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: c.accent,
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
    color: c.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  restoreText: {
    color: c.textMuted,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 3,
  },
  disclaimer: {
    color: c.textDisabled,
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
    borderColor: c.borderStrong,
  },
  reviewAccessPressed: {
    opacity: 0.6,
  },
  reviewAccessText: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
