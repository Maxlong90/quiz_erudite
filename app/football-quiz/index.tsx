import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { AutoFitText, FittedGroup } from '@/components/football-quiz/auto-fit-text';
import { FQColors, FQRadius, FQ_GOLD_GRADIENT } from '@/constants/football-quiz/theme';
import { useFQLabels } from '@/constants/football-quiz/labels';

/**
 * Football Quiz home.
 *
 * The wordmark sits at the top over the dark sky; a single round PLAY sits just
 * above the Shop / Settings row, where the two mode cards used to be. No coin
 * counter — coins live in the shop and the quiz, where they are spent.
 *
 * PLAY leads to the mode-select screen (app/football-quiz/play.tsx), the way
 * Sport Quiz does it: the two modes no longer fit on the home screen, so
 * choosing one is a step of its own again.
 *
 * WHY THE BUTTON IS PLACED FROM THE BOTTOM. The backdrop's turf starts at 61% of
 * the frame's height — measured off the artwork itself, not estimated — and the
 * button must not climb above it onto the stands. Anchoring it to the service
 * row (a fixed gap above it) keeps the whole bottom block together and makes the
 * button grow upward into the turf band as the diameter changes, never past it.
 * At ⌀190 the top lands ~51 dp below the turf line — comfortably inside the
 * band, with room to spare on screens of other proportions. (⌀230 also fits, but
 * only by 11 dp, and read as too heavy on device.)
 *
 * Text sizes are measured, never hardcoded — see components/football-quiz/auto-fit-text.
 */
const SCREEN_PAD = 16;
const ROW_GAP = 10;
/** Approved: dark fill, ⌀190, 12 dp above the service row. */
const PLAY_D = 190;
const PLAY_GAP = 12;
/** Proportions of the approved ⌀190 button — at this diameter, exactly 92 / 42. */
const PLAY_GLYPH = Math.round(PLAY_D * (92 / 190));
const PLAY_LABEL = Math.round(PLAY_D * (42 / 190));
const SERVICE_ICON = 22;
const SERVICE_GAP = 9;
const SERVICE_PAD = 16;
const SERVICE_MAX = 22;

function ServicePill({
  glyph,
  label,
  onPress,
}: {
  glyph: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.service, pressed && { opacity: 0.88 }]}>
      <Ionicons name={glyph} size={SERVICE_ICON} color={FQColors.goldLight} />
      <View style={styles.serviceLabelBox}>
        <AutoFitText maxFontSize={SERVICE_MAX} style={styles.serviceLabel}>
          {label}
        </AutoFitText>
      </View>
    </Pressable>
  );
}

export default function FootballQuizHome() {
  const t = useFQLabels();

  return (
    <View style={styles.fill}>
      <AppBackground variant="home" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* Wordmark. The gold bar is horizontal and sits BETWEEN the two lines,
            so the mark has a real vertical axis. QUIZ carries a negative right
            margin equal to its tracking: letter-spacing applies after the LAST
            glyph too, which would otherwise push the word left of centre. */}
        <View style={styles.logo}>
          <Text style={styles.logoTop}>FOOTBALL</Text>
          <LinearGradient colors={FQ_GOLD_GRADIENT} style={styles.logoRule} />
          <Text style={styles.logoBottom}>QUIZ</Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.deck}>
          <View style={styles.playRow}>
            <Pressable
              onPress={() => router.push('/football-quiz/play')}
              style={({ pressed }) => [
                styles.play,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
              ]}
            >
              <Ionicons name="play" size={PLAY_GLYPH} color={FQColors.goldLight} style={styles.playGlyph} />
              <Text style={styles.playLabel}>PLAY</Text>
            </Pressable>
          </View>

          <FittedGroup>
            <View style={styles.services}>
              <ServicePill glyph="cart" label={t.shop} onPress={() => router.push('/football-quiz/shop')} />
              <ServicePill glyph="settings" label={t.settings} onPress={() => router.push('/football-quiz/settings')} />
            </View>
          </FittedGroup>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: FQColors.bgBase },
  safe: { flex: 1 },

  logo: { alignItems: 'center', marginTop: 26 },
  logoTop: {
    fontSize: 46,
    lineHeight: 49,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 2 },
  },
  logoRule: { width: 158, height: 3, borderRadius: 3, marginVertical: 9 },
  logoBottom: {
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '900',
    color: FQColors.gold,
    letterSpacing: 12.7,
    marginRight: -12.7,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 2 },
  },

  deck: { paddingHorizontal: SCREEN_PAD, paddingBottom: 26 },
  // This margin IS the approved gap between the button and the service row.
  playRow: { alignItems: 'center', marginBottom: PLAY_GAP },
  play: {
    width: PLAY_D,
    height: PLAY_D,
    borderRadius: PLAY_D / 2,
    // Dark variant: same fill as Shop / Settings, so the bottom of the screen
    // reads as one system. Rim and glow are lighter than the gold variant's —
    // at equal weight the outline would out-shout the fill.
    backgroundColor: 'rgba(12,14,16,0.70)',
    borderWidth: 2,
    borderColor: FQColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: FQColors.gold,
    shadowOpacity: 0.22,
    shadowRadius: Math.round(PLAY_D * 0.3),
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  playGlyph: { marginBottom: -6 },
  playLabel: {
    color: FQColors.goldLight,
    fontWeight: '900',
    fontSize: PLAY_LABEL,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },

  services: { flexDirection: 'row', gap: ROW_GAP },
  service: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SERVICE_GAP,
    paddingVertical: 13,
    paddingHorizontal: SERVICE_PAD,
    borderRadius: FQRadius.pill,
    backgroundColor: 'rgba(12,14,16,0.70)',
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
  },
  serviceLabelBox: { flex: 1 },
  serviceLabel: { fontWeight: '900', color: FQColors.text, textAlign: 'center' },
});
