import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE } from '@/components/logo-quiz/app-background';
import { BrandStrip } from '@/components/logo-quiz/brand-strip';
import { DiamondSparkle } from '@/components/logo-quiz/gold-gradient';
import { StatusChip } from '@/components/logo-quiz/hud';
import { WheelAlertDot, WheelMark } from '@/components/logo-quiz/wheel-badge';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz, useNow } from '@/hooks/logo-quiz/use-logo-quiz';
import { wheelSpinAvailable } from '@/lib/logo-quiz/economy';

// Bitmap art shown on Welcome — the title and the bottom brand strip — plus the
// Wheel-of-Fortune icon/title used later on Home, Shop, and the Wheel screen.
// Preloaded before the screen renders (below) so they don't pop in a beat after
// the instantly-drawn buttons. Welcome is the guaranteed entry screen for the
// logo-quiz build, so warming the wheel art here covers every downstream call
// site (Home shop-button badge, Shop wheel tile, Wheel title).
const WELCOME_ASSETS = [
  require('../../assets/logo-quiz/title.png'),
  require('../../assets/logo-quiz/brand-strip.png'),
  require('../../assets/logo-quiz/wheel-icon.png'),
  require('../../assets/logo-quiz/wheel-title.png'),
  // Result-screen badges — warmed here so they draw instantly on the result screen.
  require('../../assets/logo-quiz/game-over-cloud.png'),
  require('../../assets/logo-quiz/win-smiley.png'),
];

export default function LogoQuizWelcome() {
  const t = useLQLabels();
  const { ready, isPremium, wheelLastSpinAt } = useLogoQuiz();
  const [assetsReady, setAssetsReady] = useState(false);
  const now = useNow(1000);
  const wheelAvailable = wheelSpinAvailable(wheelLastSpinAt, now);

  // Warm the image cache during the loading gate; fail-open so a preload error
  // never blocks the screen.
  useEffect(() => {
    let cancelled = false;
    Asset.loadAsync(WELCOME_ASSETS)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAssetsReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready || !assetsReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={LQColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <AppBackground />
      <BrandStrip />
      <StatusBar style="dark" />

      {/* Top: account status (right) */}
      <View style={styles.topBar}>
        <StatusChip isPremium={isPremium} />
      </View>

      {/* Logo + Play + Shop, sitting a little above the middle of the screen */}
      <View style={styles.center}>
        <View style={styles.topSpacer} />
        <View style={styles.titleWrap}>
          <Image
            source={require('../../assets/logo-quiz/title.png')}
            style={styles.titleImage}
            resizeMode="contain"
          />
          {/* Twinkling diamonds spread evenly across the whole logo — same glint
              mechanic as the Wheel's Spin CTA. */}
          <DiamondSparkle />
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.playBtn, LQShadow.card, pressed && styles.pressed]}
            onPress={() => router.push('/logo-quiz/categories')}
          >
            <Ionicons name="play" size={44} color={LQColors.surfaceAlt} />
            <Text style={styles.playText}>{t.play}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.shopBtn, LQShadow.card, pressed && styles.pressed]}
            onPress={() => router.push('/logo-quiz/shop')}
          >
            <Ionicons name="bag-handle" size={40} color={LQColors.surfaceAlt} />
            <Text style={styles.shopText}>{t.shop}</Text>
            {/* Wheel-ready cue: a wheel glyph with a pulsing red "!" — only when
                the free spin is available. */}
            {wheelAvailable && (
              <View style={styles.wheelBadge}>
                <WheelMark size={34} />
                <WheelAlertDot pulse size={18} style={styles.wheelBadgeDot} />
              </View>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.settingsBtn, LQShadow.card, pressed && styles.pressed]}
            onPress={() => router.push('/logo-quiz/settings')}
          >
            <Ionicons name="settings" size={38} color={LQColors.surfaceAlt} />
            <Text style={styles.settingsText}>{t.settings}</Text>
          </Pressable>
        </View>

        <View style={styles.bottomSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  loading: { flex: 1, backgroundColor: BG_BASE, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  // Bias the logo + buttons block to sit a little above the vertical middle.
  topSpacer: { flex: 1 },
  bottomSpacer: { flex: 1.7 },
  // Wrapper holds the title + its diamond-sparkle overlay so both scale/lift
  // together. Scaled up ~10% on every side (scale 1.2) and lifted via a transform
  // (which does NOT affect layout). translateY -62 = the title and the button
  // stack both lowered by half a Play button (42) from the earlier -104.
  titleWrap: {
    width: 232,
    height: 199,
    marginBottom: 24,
    transform: [{ translateY: -62 }, { scale: 1.2 }],
  },
  titleImage: {
    width: 232,
    height: 199,
  },

  // Lift the whole button stack up (visual only — no reflow). -42 = the earlier
  // -84 lowered by half a Play button, in step with the title above.
  actions: { width: '100%', alignItems: 'stretch', gap: 16, transform: [{ translateY: -42 }] },
  playBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 20,
  },
  playText: { color: LQColors.surfaceAlt, fontWeight: '900', fontSize: 36 },
  shopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 20,
  },
  shopText: { color: LQColors.surfaceAlt, fontWeight: '900', fontSize: 34 },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 20,
  },
  settingsText: { color: LQColors.surfaceAlt, fontWeight: '900', fontSize: 30 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
  wheelBadge: { position: 'absolute', top: -12, right: 18 },
  wheelBadgeDot: { position: 'absolute', top: -6, right: -6 },
});
