import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius, FQ_GOLD_GRADIENT } from '@/constants/football-quiz/theme';
import { useFQLabels, useFQModeLines } from '@/constants/football-quiz/labels';

/**
 * Football Quiz home.
 *
 * Layout: the wordmark centred at the top over the dark sky, then the two game
 * modes as equal glass cards, then Shop and Settings as a thin row underneath.
 * No coin counter here — coins live in the shop and in the quiz, where they are
 * actually spent.
 *
 * TYPE SIZES AND THE BREAK ARE MEASURED, NOT GUESSED.
 *
 * A mode name is too long for one line at half screen width, so it is split
 * into its words BY DATA (see useFQModeLines) and each word gets its own <Text>.
 * That is deliberate: letting the layout wrap it is what produced
 * "Классическ / ий" on device — adjustsFontSizeToFit together with
 * numberOfLines={2} makes RN break the word rather than shrink the type.
 *
 * With the break by word, the cap is set by the longest WORD rather than the
 * whole phrase. Measured against Roboto Black at the real line width (390 screen
 * - 32 margins - 10 gap = 174 per card, minus 10 padding a side = 154): Russian
 * "Классический" fits at 23 dp with only 1 dp to spare, so 22 dp is used instead
 * — 8 dp of slack absorbs any difference between these metrics and the device's.
 * All four locales clear 22 dp. The service row is capped by "Настройки": 21 dp.
 */
const MODE_FONT = 22;
const MODE_LINE = 25;
const SERVICE_FONT = 21;
/** Card height, tightened from 140 → 100 dp so no dead space sits above the icon. */
const CARD_H = 100;

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
      <Ionicons name={glyph} size={32} color={FQColors.goldLight} />
      <View>
        {lines.map((line) => (
          <Text key={line} style={styles.modeLabel} numberOfLines={1}>
            {line}
          </Text>
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
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.service, pressed && { opacity: 0.88 }]}
    >
      <Ionicons name={glyph} size={22} color={FQColors.goldLight} />
      <Text style={styles.serviceLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
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
        {/* Wordmark. The gold bar is horizontal here and sits BETWEEN the two
            lines, so the mark has a real vertical axis. QUIZ carries a negative
            right margin equal to its tracking: letter-spacing also applies after
            the LAST glyph, which would otherwise push the word left of centre by
            exactly that much. */}
        <View style={styles.logo}>
          <Text style={styles.logoTop}>FOOTBALL</Text>
          <LinearGradient colors={FQ_GOLD_GRADIENT} style={styles.logoRule} />
          <Text style={styles.logoBottom}>QUIZ</Text>
        </View>

        <View style={{ flex: 1 }} />

        <View style={styles.deck}>
          <View style={styles.modes}>
            <ModeCard glyph="football" lines={modes.classic} onPress={() => router.push('/football-quiz/levels')} />
            <ModeCard glyph="star" lines={modes.legends} onPress={() => router.push('/football-quiz/levels')} />
          </View>
          <View style={styles.services}>
            <ServicePill glyph="cart" label={t.shop} onPress={() => router.push('/football-quiz/shop')} />
            <ServicePill glyph="settings" label={t.settings} onPress={() => router.push('/football-quiz/settings')} />
          </View>
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
    // Cancels the trailing letter-space so the word is optically centred.
    marginRight: -12.7,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowRadius: 14,
    textShadowOffset: { width: 0, height: 2 },
  },

  deck: { paddingHorizontal: 16, paddingBottom: 26, gap: 10 },
  modes: { flexDirection: 'row', gap: 10 },
  mode: {
    flex: 1,
    height: CARD_H,
    borderRadius: FQRadius.lg,
    borderWidth: 2,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  modeLabel: {
    fontSize: MODE_FONT,
    lineHeight: MODE_LINE,
    fontWeight: '900',
    color: FQColors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  services: { flexDirection: 'row', gap: 10 },
  service: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: FQRadius.pill,
    backgroundColor: 'rgba(12,14,16,0.70)',
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
  },
  serviceLabel: { fontSize: SERVICE_FONT, fontWeight: '900', color: FQColors.text },
});
