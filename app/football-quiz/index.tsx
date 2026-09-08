import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQRadius, FQ_GOLD_GRADIENT } from '@/constants/football-quiz/theme';
import { useFQLabels } from '@/constants/football-quiz/labels';

/**
 * Football Quiz home.
 *
 * Layout: the wordmark centred at the top over the dark sky, then the two game
 * modes as equal glass cards, then Shop and Settings as a thin row underneath.
 * No coin counter here — coins live in the shop and in the quiz, where they are
 * actually spent.
 *
 * TYPE SIZES ARE MEASURED, NOT GUESSED. Both mode cards share ONE font size, and
 * that size is capped by the longest unbreakable word — Russian "Классический"
 * (12 characters, no hyphenation). Measured against Roboto Black at the real
 * card width (390 screen - 32 margins - 10 gap = 174 per card, minus 10 padding
 * a side = 154 usable): "Классический" fits at 22 dp with 8 dp to spare, 23 dp
 * is already flush. Same exercise for the service row, where "Настройки" is the
 * limiter next to its icon: 21 dp. Both pairs keep adjustsFontSizeToFit as a
 * safety net for locales we have not measured.
 */
const MODE_FONT = 22;
const SERVICE_FONT = 21;

function ModeCard({
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
      <Ionicons name={glyph} size={40} color={FQColors.goldLight} />
      <View style={styles.modeLabelBox}>
        <Text
          style={styles.modeLabel}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {label}
        </Text>
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
            <ModeCard glyph="football" label={t.modeClassic} onPress={() => router.push('/football-quiz/levels')} />
            <ModeCard glyph="star" label={t.modeLegends} onPress={() => router.push('/football-quiz/levels')} />
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
    borderRadius: FQRadius.lg,
    borderWidth: 2,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 8,
  },
  // Fixed two-line box so a one-line label ("Классический") and a two-line one
  // ("Легенды футбола") produce cards of exactly the same height.
  modeLabelBox: { height: 52, justifyContent: 'center' },
  modeLabel: {
    fontSize: MODE_FONT,
    lineHeight: 25,
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
