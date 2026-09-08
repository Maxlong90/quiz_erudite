import { Image, ImageSourcePropType, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { CoinPill, FQIconButton, ScreenTitle, goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius } from '@/constants/football-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { MOCK_COINS } from '@/lib/football-quiz/mock';

/**
 * Football Quiz mode select — same structure as app/sport-quiz/play.tsx: four
 * mode rows (Classic + Legends open, Challenge + Sprint locked), a header with
 * "?" and the coin pill, "Other apps" at the bottom.
 *
 * The "?" button is the one deliberate difference: glyphScale 0.82 makes the
 * question mark fill the whole circle instead of sitting inside a second ring.
 */
function ModeButton({
  image,
  label,
  sublabel,
  locked,
  onPress,
}: {
  image: ImageSourcePropType;
  label: string;
  sublabel?: string;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [
        styles.mode,
        locked ? styles.modeLocked : goldGlow(12, 0.45),
        !locked && pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
    >
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.pill }]}
      />
      <Image source={image} style={styles.modeIcon} resizeMode="contain" />
      <View style={styles.modeText}>
        <Text style={styles.modeLabel}>{label}</Text>
        {sublabel ? <Text style={styles.modeSub}>{sublabel}</Text> : null}
      </View>
      {locked ? <Ionicons name="lock-closed" size={26} color={FQColors.textMuted} /> : null}
    </Pressable>
  );
}

export default function FootballQuizPlay() {
  const t = useSQLabels();

  return (
    <View style={styles.fill}>
      <AppBackground variant="haze" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <FQIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
          <View style={styles.headerRight}>
            <FQIconButton glyph="help" size={44} glyphScale={0.82} onPress={() => {}} />
            <Pressable onPress={() => router.push('/football-quiz/shop')} hitSlop={8}>
              <CoinPill coins={MOCK_COINS} size="lg" />
            </Pressable>
          </View>
        </View>

        <View style={styles.body}>
          <ScreenTitle size={28}>{t.chooseMode}</ScreenTitle>
          <View style={styles.modes}>
            <ModeButton
              image={require('../../assets/sport-quiz/modes/classic.png')}
              label={t.modeClassic}
              onPress={() => router.push('/football-quiz/levels')}
            />
            <ModeButton
              image={require('../../assets/sport-quiz/modes/legends.png')}
              label={t.modeLegends}
              onPress={() => router.push('/football-quiz/levels')}
            />
            <ModeButton
              image={require('../../assets/sport-quiz/modes/challenge.png')}
              label={t.modeChallenge}
              sublabel={t.comingSoon}
              locked
              onPress={() => {}}
            />
            <ModeButton
              image={require('../../assets/sport-quiz/modes/sprint.png')}
              label={t.modeSprint}
              sublabel={t.comingSoon}
              locked
              onPress={() => {}}
            />
          </View>
        </View>

        <View style={styles.bottom}>
          <View style={styles.otherItem}>
            <FQIconButton glyph="phone-portrait" size={64} onPress={() => {}} />
            <Text style={styles.otherLabel}>{t.otherApps}</Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: FQColors.bgBase },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 26 },
  modes: { gap: 16, marginTop: 22 },

  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: FQRadius.pill,
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
  },
  modeIcon: { width: 72, height: 72 },
  modeLocked: { opacity: 0.6, borderColor: FQColors.glassBorderDim },
  modeText: { flex: 1 },
  modeLabel: { color: FQColors.text, fontWeight: '900', fontSize: 24 },
  modeSub: { color: FQColors.textMuted, fontWeight: '700', fontSize: 13, marginTop: 2 },

  bottom: { alignItems: 'center', paddingBottom: 14 },
  otherItem: { alignItems: 'center', gap: 6 },
  otherLabel: {
    color: FQColors.goldLight,
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: FQColors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
