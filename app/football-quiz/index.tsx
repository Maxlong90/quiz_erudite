import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { AutoFitText, FittedGroup } from '@/components/football-quiz/auto-fit-text';
import { goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius, FQ_GOLD_GRADIENT } from '@/constants/football-quiz/theme';
import { useFQLabels, useFQModeLines } from '@/constants/football-quiz/labels';

/**
 * Football Quiz home.
 *
 * Layout: the wordmark centred at the top over the dark sky, then the two game
 * modes as equal glass cards, then Shop and Settings as a thin service row. No
 * coin counter — coins live in the shop and the quiz, where they are spent.
 *
 * TEXT FITTING IS MEASURED ON BOTH SIDES — see components/football-quiz/auto-fit-text.
 *
 * Three attempts failed before this, all by computing what should be measured:
 * adjustsFontSizeToFit broke words; a size from Roboto's metrics is wrong on iOS
 * (SF Black is wider); and hand-computing the available width missed the 2 dp
 * border per side plus letterSpacing, ~6 dp, which clipped the label again.
 *
 * AutoFitText measures its own box (onLayout) AND its own string (onTextLayout),
 * so nothing is assumed about font, screen or surrounding styles. FittedGroup
 * makes the four mode words share one size, and the two service labels another,
 * so each row stays typographically uniform.
 */
const SCREEN_PAD = 16;
const CARD_GAP = 10;
const CARD_PAD = 12;
const CARD_H = 100;
const MODE_ICON = 32;
const SERVICE_ICON = 22;
const SERVICE_PAD = 16;
const SERVICE_GAP = 9;
/** Upper bounds — the measurement only ever scales down from here. */
const MODE_MAX = 24;
const SERVICE_MAX = 22;

function ModeCard({
  glyph,
  lines,
  onPress,
}: {
  glyph: keyof typeof Ionicons.glyphMap;
  lines: [string, string];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.mode,
        goldGlow(14, 0.4),
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.92 },
      ]}
    >
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.lg }]}
      />
      <Ionicons name={glyph} size={MODE_ICON} color={FQColors.goldLight} />
      <View style={styles.modeLabels}>
        {lines.map((line) => (
          <AutoFitText key={line} maxFontSize={MODE_MAX} style={styles.modeLabel}>
            {line}
          </AutoFitText>
        ))}
      </View>
    </Pressable>
  );
}

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
  const modes = useFQModeLines();

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
          {/* One group per row: all four mode words share a size, and the two
              service labels share theirs. */}
          <FittedGroup>
            <View style={styles.modes}>
              <ModeCard glyph="football" lines={modes.classic} onPress={() => router.push('/football-quiz/levels')} />
              <ModeCard glyph="star" lines={modes.legends} onPress={() => router.push('/football-quiz/levels')} />
            </View>
          </FittedGroup>
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

  deck: { paddingHorizontal: SCREEN_PAD, paddingBottom: 26, gap: CARD_GAP },
  modes: { flexDirection: 'row', gap: CARD_GAP },
  mode: {
    flex: 1,
    height: CARD_H,
    borderRadius: FQRadius.lg,
    borderWidth: 2,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    paddingHorizontal: CARD_PAD,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modeLabels: { width: '100%' },
  modeLabel: {
    fontWeight: '900',
    color: FQColors.text,
    textAlign: 'center',
  },

  services: { flexDirection: 'row', gap: CARD_GAP },
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
