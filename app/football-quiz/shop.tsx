import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { CoinIcon, CoinPill, FQCard, FQIconButton, GoldCta, SectionTitle } from '@/components/football-quiz/ui';
import { FQColors } from '@/constants/football-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { MOCK_COINS, MOCK_PACKS } from '@/lib/football-quiz/mock';

/**
 * Football Quiz shop — same structure as app/sport-quiz/shop.tsx: back + coins
 * header, the "Wheel of Fortune" section with a tappable tile, then "Coin Packs".
 *
 * The packs are Sport Quiz's exact catalogue: 100 / 500 / 1000 coins at
 * $0.99 / $3.99 / $6.99, with "Popular" on the 500 pack.
 */
export default function FootballQuizShop() {
  const t = useSQLabels();

  return (
    <View style={styles.fill}>
      <AppBackground variant="haze" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <FQIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
          <CoinPill coins={MOCK_COINS} size="lg" />
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <SectionTitle>{t.wheelTitle}</SectionTitle>
          <Pressable
            onPress={() => router.push('/football-quiz/wheel')}
            style={({ pressed }) => pressed && { opacity: 0.92 }}
          >
            <FQCard style={styles.wheelTile}>
              <Text style={styles.wheelSpinText}>{t.wheelSpinNow}</Text>
              <View style={styles.bang}>
                <Text style={styles.bangText}>!</Text>
              </View>
            </FQCard>
          </Pressable>

          <SectionTitle>{t.coinPacks}</SectionTitle>
          <View style={styles.packs}>
            {MOCK_PACKS.map((p) => (
              <FQCard key={p.id} style={[styles.pack, p.popular && styles.packPopular]}>
                {p.popular && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{t.popular}</Text>
                  </View>
                )}
                <CoinIcon size={46} />
                <View style={styles.packText}>
                  <Text style={styles.packAmount}>{p.coins.toLocaleString('ru-RU')}</Text>
                  <Text style={styles.packUnit}>{t.coins}</Text>
                </View>
                <GoldCta label={p.price} onPress={() => {}} />
              </FQCard>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
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
  },
  body: { paddingHorizontal: 16, paddingBottom: 28 },

  wheelTile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 22 },
  wheelSpinText: {
    color: FQColors.goldLight,
    fontWeight: '900',
    fontSize: 24,
    textShadowColor: FQColors.gold,
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  bang: { width: 26, height: 26, borderRadius: 13, backgroundColor: FQColors.gold, alignItems: 'center', justifyContent: 'center' },
  bangText: { color: FQColors.ink, fontWeight: '900', fontSize: 17 },

  packs: { gap: 12 },
  pack: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  packPopular: { borderColor: FQColors.gold },
  packText: { flex: 1 },
  packAmount: { color: FQColors.text, fontWeight: '900', fontSize: 22 },
  packUnit: { color: FQColors.textMuted, fontSize: 13 },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: FQColors.gold,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    zIndex: 2,
  },
  badgeText: { color: FQColors.ink, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
});
