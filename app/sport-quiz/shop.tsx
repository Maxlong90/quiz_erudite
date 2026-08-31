import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

import { AppBackground } from '@/components/sport-quiz/app-background';
import { CoinIcon, CoinPill, GlassCard, GlassIconButton, NeonCta, SectionTitle } from '@/components/sport-quiz/ui';
import {
  COIN_PACKS,
  formatCountdownHMS,
  wheelCooldownRemaining,
  type CoinPack,
} from '@/lib/sport-quiz/economy';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useNow, useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';

export default function SportQuizShop() {
  const t = useSQLabels();
  const { coins, wheelLastSpinAt, addCoins } = useSportQuiz();
  const [boughtPack, setBoughtPack] = useState<string | null>(null);

  const now = useNow(1000);
  const wheelRemaining = wheelCooldownRemaining(wheelLastSpinAt, now);
  const wheelAvailable = wheelRemaining <= 0;

  // TODO: wire real IAP via RevenueCat once App 2/Sport keys exist. For now a tap
  // grants coins locally so the shop is fully functional in dev/preview.
  const onBuyPack = (pack: CoinPack) => {
    Haptics.selectionAsync().catch(() => {});
    addCoins(pack.coins);
    setBoughtPack(pack.id);
    setTimeout(() => setBoughtPack((p) => (p === pack.id ? null : p)), 1400);
  };

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="navy" />
      <StatusBar style="light" />

      <View style={styles.header}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        <CoinPill coins={coins} size="lg" />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* Wheel of Fortune — labelled section + tappable tile. Shows a pulsing "!"
            when the free spin is ready, otherwise a HH:MM:SS countdown. */}
        <SectionTitle>{t.wheelTitle}</SectionTitle>
        <Pressable onPress={() => router.push('/sport-quiz/wheel')} style={({ pressed }) => pressed && { opacity: 0.92 }}>
          <GlassCard glow={wheelAvailable ? SQColors.neon : undefined} style={styles.wheelTile}>
            {wheelAvailable ? (
              <>
                <PulsingSpinText text={t.wheelSpinNow} />
                <PulsingBang />
              </>
            ) : (
              <View style={styles.wheelTileTimer}>
                <Ionicons name="time-outline" size={34} color={SQColors.neonBlue} />
                <Text style={styles.wheelTileTimerText}>{formatCountdownHMS(wheelRemaining)}</Text>
              </View>
            )}
          </GlassCard>
        </Pressable>

        {/* Coin packs */}
        <SectionTitle>{t.coinPacks}</SectionTitle>
        {COIN_PACKS.map((pack) => (
          <GlassCard key={pack.id} style={styles.packCard} glow={undefined}>
            <View style={styles.packLeft}>
              <CoinIcon size={30} />
              <View>
                <Text style={styles.packCoins}>
                  {pack.coins} {t.coins}
                </Text>
                {pack.popular && (
                  <View style={styles.popularTag}>
                    <Text style={styles.popularText}>{t.popular}</Text>
                  </View>
                )}
              </View>
            </View>
            {boughtPack === pack.id ? (
              <View style={styles.boughtPill}>
                <Ionicons name="checkmark" size={22} color={SQColors.textOnNeon} />
              </View>
            ) : (
              <NeonCta label={pack.price} onPress={() => onBuyPack(pack)} color={SQColors.neon} />
            )}
          </GlassCard>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Big green "Spin now" that gently pulses to fill the wheel tile. */
function PulsingSpinText({ text }: { text: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.06, { duration: 800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [scale]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[styles.spinNowText, st]}>{text}</Animated.Text>;
}

/** Pink pulsing "!" on the right of the wheel tile. */
function PulsingBang() {
  const scale = useSharedValue(1);
  useEffect(() => {
    scale.value = withRepeat(withTiming(1.28, { duration: 650, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [scale]);
  const st = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.Text style={[styles.bangText, st]}>!</Animated.Text>;
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  body: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 6 },

  wheelTile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
    marginBottom: 18,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  spinNowText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 34,
    fontWeight: '900',
    color: SQColors.neon,
    textShadowColor: SQColors.neon,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  bangText: {
    fontSize: 44,
    fontWeight: '900',
    color: SQColors.neonPink,
    marginLeft: 6,
    textShadowColor: SQColors.neonPink,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  wheelTileTimer: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  wheelTileTimerText: { fontSize: 34, fontWeight: '900', color: SQColors.text, letterSpacing: 1 },

  packCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  packLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  packCoins: { fontSize: 20, fontWeight: '900', color: SQColors.text },
  popularTag: {
    alignSelf: 'flex-start',
    backgroundColor: SQColors.neonPink,
    borderRadius: SQRadius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 3,
  },
  popularText: { color: '#FFFFFF', fontWeight: '900', fontSize: 10 },
  boughtPill: {
    borderRadius: SQRadius.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: SQColors.neon,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
