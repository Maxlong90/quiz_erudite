import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { LivesInfoModal } from '@/components/lives/lives-info-modal';
import { HintsInfoModal } from '@/components/shop/hints-info-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useHintsState } from '@/hooks/use-hints';
import { useLives } from '@/hooks/use-lives';
import { useTranslation } from '@/hooks/use-translation';
import { addLives } from '@/lib/lives';
import { BUNDLES, getBundleStorePrices, purchaseBundle, type ShopBundle } from '@/lib/iap';

const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

export default function ShopScreen() {
  const { t } = useTranslation();
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
      await purchaseBundle(bundle);
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
    // Stub for a rewarded ad — fake 1.5s "ad playing" then grant +1
    // life. Real SDK integration (AdMob / IronSource) lands later.
    await new Promise((r) => setTimeout(r, 1500));
    await addLives(1);
    await reloadLives();
    setWatching(false);
  }

  const livesBundles = BUNDLES.filter((b) => b.category === 'lives');
  const hintsBundles = BUNDLES.filter((b) => b.category === 'hints');

  return (
    <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
      <StatusBar style="light" />
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
                (hints.fiftyFifty ?? 0) + (hints.statistics ?? 0) + (hints.ai ?? 0) + (hints.letter ?? 0),
              )}
              onPress={() => setHintsInfoOpen(true)}
            />
          </View>

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

          <Text style={styles.disclaimer}>{t('shop.disclaimer')}</Text>
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
    </LinearGradient>
  );
}

function SectionLabel({ labelKey }: { labelKey: Parameters<ReturnType<typeof useTranslation>['t']>[0] }) {
  const { t } = useTranslation();
  return <Text style={styles.sectionLabel}>{t(labelKey)}</Text>;
}

interface BalanceProps { emoji: string; label: string; value: string; onPress?: () => void; }
function BalanceTile({ emoji, label, value, onPress }: BalanceProps) {
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

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
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
    backgroundColor: '#ffffff0f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ffffff14',
    alignItems: 'center',
    gap: 4,
  },
  balanceEmoji: {
    fontSize: 24,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  balanceLabel: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionLabel: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
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
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  adSubtitle: {
    color: '#ffffff99',
    fontSize: 12,
    marginTop: 2,
  },
  adCta: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#7c5cff',
    borderRadius: 999,
  },
  adCtaText: {
    color: '#fff',
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
    backgroundColor: '#ffffff0f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ffffff14',
    padding: 14,
    gap: 4,
    alignItems: 'flex-start',
  },
  bundleHeader: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#7c5cff33',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  bundleEmoji: {
    fontSize: 24,
  },
  bundleTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  bundleSubtitle: {
    color: '#ffffff99',
    fontSize: 12,
    minHeight: 32,
  },
  buy: {
    marginTop: 8,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#7c5cff',
    alignItems: 'center',
  },
  buyText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  disclaimer: {
    color: '#ffffff66',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 16,
    lineHeight: 16,
  },
});
