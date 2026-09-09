/**
 * The configurable template's shop — a deliberate COPY of app/shop.tsx, for the
 * reasons app/t/quiz.tsx's docblock sets out: a screen owns a route, so each app
 * gets its own; the leaf components it renders (ScreenBackground, LivesInfoModal,
 * HintsInfoModal, BottomBar) are shared, not duplicated.
 *
 * The diff against app/shop.tsx is ONE thing: the palette arrives through
 * hooks/t/use-template-theme.ts, at all FOUR call sites — the screen, SectionLabel,
 * BalanceTile and BundleCard.
 *
 * That makes this the cleanest lift in Э7: the original holds ZERO colour
 * literals and ZERO route literals, so nothing else needed to move. The only
 * reason it must be copied at all is route closure — a screen left at the root
 * route re-enters the Erudite graph through its own bar, and redirecting a shared
 * parent into a /t child would mean editing shipped code. The rule is written
 * down under "What the Slice Covers" in docs/configurable-template.md (cited by
 * section rather than by line, because the line number this comment used to
 * carry had already drifted): what decides a copy is whether the file ENCODES
 * ROUTES. Screens do, so they are copied; a leaf component normally does not, so
 * it is reused — with components/t/bottom-bar.tsx the one leaf that does, and
 * therefore the one that was copied too.
 *
 * TWO THINGS THAT LOOK LIKE PORT DAMAGE AND ARE NOT:
 *  - `showWatchAd` reads `adsEnabled && isPremium !== true`, NOT `&& !isPremium`.
 *    `isPremium` is null while the premium provider loads, and only a resolved
 *    `true` may hide the card — `!isPremium` would hide it during every cold
 *    start. Copied verbatim.
 *  - `adsEnabled` is a build capability evaluated at MODULE LOAD in @/lib/ads and
 *    read here in a render expression. That is correct: rewarded ads are a
 *    property of the binary, not runtime state, so it must not become one. Same
 *    rule app/t/paywall.tsx's COMPARE_ROWS records.
 *
 * THE BOTTOM-BAR BOUNDARY IS CLOSED: the <BottomBar current="shop" /> below is
 * components/t/bottom-bar.tsx, and all six of its destinations are /t routes.
 *
 * It was the SHARED components/bottom-bar.tsx until the template got its own,
 * pointing at the ERUDITE /account, /paywall, /shop, / and /settings. That never
 * crashed — on a template build app/index.tsx redirects / to /t/splash — it just
 * walked the player into another brand. All five screens that mount a bar were
 * switched in one commit, because re-pointing one would have left the subtree
 * half-ported. The escape check in __tests__/app/t-routes.test.ts now scans
 * components/t/ as well as app/t/, so the bar's own routes are guarded rather
 * than merely out of view.
 *
 * makeStyles keeps its EruditePalette signature: a TemplateTheme already
 * satisfies it, and this screen uses no derived tier role at all, so nothing here
 * needs the wider type.
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/t/bottom-bar';
import { ScreenBackground } from '@/components/screen-background';
import { LivesInfoModal } from '@/components/lives/lives-info-modal';
import { HintsInfoModal } from '@/components/shop/hints-info-modal';
import { useHintsState } from '@/hooks/use-hints';
import { useLives } from '@/hooks/use-lives';
import { usePremium } from '@/hooks/use-premium';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { useTranslation } from '@/hooks/use-translation';
import { adsEnabled, watchAdForLife } from '@/lib/ads';
import { BUNDLES, getBundleStorePrices, purchaseBundle, type ShopBundle } from '@/lib/iap';
import type { EruditePalette } from '@/constants/theme';

export default function ShopScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { count: livesCount, reload: reloadLives } = useLives();
  const { state: hints, reload: reloadHints } = useHintsState();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [livesInfoOpen, setLivesInfoOpen] = useState(false);
  const [hintsInfoOpen, setHintsInfoOpen] = useState(false);
  // Live store prices keyed by bundle id; empty when RevenueCat is disabled,
  // in which case the hardcoded bundle.price is used as the fallback.
  const [storePrices, setStorePrices] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getBundleStorePrices()
      .then((prices) => {
        if (!cancelled) setStorePrices(prices);
      })
      .catch(() => {
        // Keep hardcoded fallback prices.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuy(bundle: ShopBundle) {
    if (pendingId) return;
    setPendingId(bundle.id);
    try {
      const outcome = await purchaseBundle(bundle);
      // A user cancellation (dismissing the native purchase sheet) grants
      // nothing — stay silent instead of falsely confirming a purchase.
      if (outcome === 'cancelled') return;
      await Promise.all([reloadLives(), reloadHints()]);
      Alert.alert(t('shop.thanks.title'), t('shop.thanks.body'));
    } catch {
      Alert.alert(t('shop.error.title'), t('shop.error.body'));
    } finally {
      setPendingId(null);
    }
  }

  async function handleWatchAd() {
    if (watching) return;
    setWatching(true);
    try {
      // Grants +1 life ONLY when the user watches the rewarded ad to the
      // reward point. Dismiss / failure / no-fill grant nothing.
      const result = await watchAdForLife();
      if (result === 'granted') {
        await reloadLives();
      } else if (result === 'no-reward') {
        Alert.alert(t('ads.failed.title'), t('ads.failed.body'));
      }
      // 'unavailable' can't happen here — the card is hidden when !adsEnabled.
    } finally {
      setWatching(false);
    }
  }

  // Hide the free-lives (watch-ad) card where a real ad can't be served (Expo
  // Go / web / iOS / no native module) or for Premium — they have unlimited
  // lives, so the reward is irrelevant. `isPremium` is null while loading;
  // only a resolved `true` hides it.
  const showWatchAd = adsEnabled && isPremium !== true;

  const livesBundles = BUNDLES.filter((b) => b.category === 'lives');
  const hintsBundles = BUNDLES.filter((b) => b.category === 'hints');
  const comboBundles = BUNDLES.filter((b) => b.category === 'combo');

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('shop.title')}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.balancesRow}>
            <BalanceTile
              emoji="❤️"
              label={t('shop.balance.lives')}
              value={String(livesCount)}
              onPress={() => setLivesInfoOpen(true)}
            />
            <BalanceTile
              emoji="💡"
              label={t('shop.balance.hints')}
              value={String(
                (hints.fiftyFifty ?? 0) + (hints.statistics ?? 0) + (hints.replaceQuestion ?? 0),
              )}
              onPress={() => setHintsInfoOpen(true)}
            />
          </View>

          {showWatchAd && (
            <>
              <SectionLabel labelKey="shop.section.freeLives" />
              <View style={styles.card}>
                <Pressable
                  onPress={handleWatchAd}
                  disabled={watching}
                  style={({ pressed }) => [styles.adRow, pressed && { opacity: 0.85 }]}
                >
                  <Text style={styles.adEmoji}>🎬</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.adTitle}>{t('shop.freeLives.title')}</Text>
                    <Text style={styles.adSubtitle}>{t('shop.freeLives.subtitle')}</Text>
                  </View>
                  <View style={styles.adCta}>
                    <Text style={styles.adCtaText}>
                      {watching ? t('shop.freeLives.watching') : t('shop.freeLives.cta')}
                    </Text>
                  </View>
                </Pressable>
              </View>
            </>
          )}

          <SectionLabel labelKey="shop.section.lives" />
          <View style={styles.gridList}>
            {livesBundles.map((b) => (
              <BundleCard
                key={b.id}
                bundle={b}
                price={storePrices[b.id] ?? b.price}
                pending={pendingId === b.id}
                onBuy={() => handleBuy(b)}
              />
            ))}
          </View>

          <SectionLabel labelKey="shop.section.hints" />
          <View style={styles.gridList}>
            {hintsBundles.map((b) => (
              <BundleCard
                key={b.id}
                bundle={b}
                price={storePrices[b.id] ?? b.price}
                pending={pendingId === b.id}
                onBuy={() => handleBuy(b)}
              />
            ))}
          </View>

          <SectionLabel labelKey="shop.section.combo" />
          <View style={styles.gridList}>
            {comboBundles.map((b) => (
              <BundleCard
                key={b.id}
                bundle={b}
                price={storePrices[b.id] ?? b.price}
                pending={pendingId === b.id}
                onBuy={() => handleBuy(b)}
              />
            ))}
          </View>

        </ScrollView>

        <BottomBar current="shop" />
      </SafeAreaView>

      <LivesInfoModal
        visible={livesInfoOpen}
        onClose={() => setLivesInfoOpen(false)}
      />
      <HintsInfoModal
        visible={hintsInfoOpen}
        hints={hints}
        onClose={() => setHintsInfoOpen(false)}
      />
    </ScreenBackground>
  );
}

function SectionLabel({ labelKey }: { labelKey: Parameters<ReturnType<typeof useTranslation>['t']>[0] }) {
  const { t } = useTranslation();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return <Text style={styles.sectionLabel}>{t(labelKey)}</Text>;
}

interface BalanceProps { emoji: string; label: string; value: string; onPress?: () => void; }
function BalanceTile({ emoji, label, value, onPress }: BalanceProps) {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const content = (
    <>
      <Text style={styles.balanceEmoji}>{emoji}</Text>
      <Text style={styles.balanceValue}>{value}</Text>
      <Text style={styles.balanceLabel}>{label}</Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.balance, pressed && { opacity: 0.85 }]}
      >
        {content}
      </Pressable>
    );
  }
  return <View style={styles.balance}>{content}</View>;
}

interface CardProps { bundle: ShopBundle; price: string; pending: boolean; onBuy: () => void; }
function BundleCard({ bundle, price, pending, onBuy }: CardProps) {
  const { t } = useTranslation();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onBuy}
      disabled={pending}
      style={({ pressed }) => [styles.bundle, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      <View style={styles.bundleHeader}>
        <Text style={styles.bundleEmoji}>{bundle.emoji}</Text>
      </View>
      <Text style={styles.bundleTitle} numberOfLines={1}>{t(bundle.titleKey)}</Text>
      <Text style={styles.bundleSubtitle} numberOfLines={2}>{t(bundle.subtitleKey)}</Text>
      <View style={styles.buy}>
        <Text style={styles.buyText}>{pending ? '…' : price}</Text>
      </View>
    </Pressable>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  balancesRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  balance: {
    flex: 1,
    padding: 16,
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderSoft,
    alignItems: 'center',
    gap: 4,
  },
  balanceEmoji: {
    fontSize: 24,
  },
  balanceValue: {
    color: c.text,
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  balanceLabel: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderSoft,
    overflow: 'hidden',
  },
  adRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
  },
  adEmoji: {
    fontSize: 30,
  },
  adTitle: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },
  adSubtitle: {
    color: c.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
  adCta: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: c.accent,
    borderRadius: 999,
  },
  adCtaText: {
    color: c.onAccent,
    fontSize: 13,
    fontWeight: '800',
  },
  gridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  bundle: {
    width: '48%',
    backgroundColor: c.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: c.borderSoft,
    padding: 14,
    gap: 4,
    alignItems: 'flex-start',
  },
  bundleHeader: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: c.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  bundleEmoji: {
    fontSize: 24,
  },
  bundleTitle: {
    color: c.text,
    fontSize: 14,
    fontWeight: '800',
  },
  bundleSubtitle: {
    color: c.textFaint,
    fontSize: 12,
    minHeight: 32,
  },
  buy: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: c.accent,
    alignItems: 'center',
  },
  buyText: {
    color: c.onAccent,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
