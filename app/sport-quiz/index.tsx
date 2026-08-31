import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/sport-quiz/app-background';
import { GlassPillButton } from '@/components/sport-quiz/ui';
import { WheelAlertDot, WheelMark } from '@/components/sport-quiz/wheel-badge';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz, useNow } from '@/hooks/sport-quiz/use-sport-quiz';
import { wheelSpinAvailable } from '@/lib/sport-quiz/economy';

/**
 * Sport Quiz home. Logo-Quiz-style vertical stack of three glass pill buttons —
 * Play, Shop, Settings — over the colourful sports backdrop. When the free wheel
 * spin is ready, a spinning-wheel glyph with a pulsing PINK "!" sits on the Shop
 * button (mirrors Logo Quiz's cue).
 */
export default function SportQuizWelcome() {
  const t = useSQLabels();
  const { wheelLastSpinAt } = useSportQuiz();
  const now = useNow(1000);
  const wheelAvailable = wheelSpinAvailable(wheelLastSpinAt, now);

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="color" />
      <StatusBar style="light" />

      <View style={styles.center}>
        <View style={styles.topSpacer} />
        <View style={styles.actions}>
          <GlassPillButton icon="play" label={t.play} fontSize={39} onPress={() => router.push('/sport-quiz/play')} />

          <View style={styles.shopWrap}>
            <GlassPillButton icon="bag-handle" label={t.shop} fontSize={35} onPress={() => router.push('/sport-quiz/shop')} />
            {wheelAvailable && (
              <View style={styles.wheelBadge} pointerEvents="none">
                <View style={styles.wheelBadgeInner}>
                  <WheelMark size={38} />
                  <WheelAlertDot pulse size={18} style={styles.wheelBadgeDot} />
                </View>
              </View>
            )}
          </View>

          <GlassPillButton icon="settings" label={t.settings} fontSize={31} onPress={() => router.push('/sport-quiz/settings')} />
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 26 },
  topSpacer: { flex: 1 },
  bottomSpacer: { flex: 1.5 },
  actions: { width: '100%', alignItems: 'stretch', gap: 16 },
  shopWrap: { width: '100%' },
  // Full-height overlay pinned to the right so the wheel icon sits vertically
  // centred — level with the "Shop" label — not floating above the button.
  wheelBadge: { position: 'absolute', right: 22, top: 0, bottom: 0, justifyContent: 'center' },
  wheelBadgeInner: {},
  wheelBadgeDot: { position: 'absolute', top: -6, right: -6 },
});
