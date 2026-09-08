import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { useFittedFontSize } from '@/components/football-quiz/fitted-text';
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
 * TEXT FITTING IS MEASURED ON THE DEVICE, NOT PRECOMPUTED.
 *
 * Two earlier attempts failed for reasons worth recording:
 *   1. adjustsFontSizeToFit + numberOfLines={2} — RN breaks the WORD instead of
 *      shrinking the type, which produced "Классическ / ий".
 *   2. a size computed here from Roboto Black's metrics — wrong font. On iOS
 *      fontWeight '900' resolves to San Francisco Black, which is wider, so the
 *      label overflowed and got ellipsised to "Классиче…". Screen width is not a
 *      constant either, so the usable width per card cannot be assumed.
 *
 * Now useFittedFontSize renders each candidate string off-screen at a reference
 * size, reads its real width via onTextLayout, and derives ONE size that fits the
 * widest of them. Both mode cards share that size, so they stay identical, and
 * the same is done independently for the service row.
 */
const SCREEN_PAD = 16;
const CARD_GAP = 10;
const CARD_PAD = 10;
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
  fontSize,
  onPress,
}: {
  glyph: keyof typeof Ionicons.glyphMap;
  lines: [string, string];
  fontSize: number | null;
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
      {/* Held back for the one frame it takes to measure, so nothing is ever
          shown clipped or at the wrong size. */}
      {fontSize != null && (
        <View>
          {lines.map((line) => (
            <Text
              key={line}
              style={[styles.modeLabel, { fontSize, lineHeight: Math.round(fontSize * 1.14) }]}
              numberOfLines={1}
            >
              {line}
            </Text>
          ))}
        </View>
      )}
    </Pressable>
  );
}

function ServicePill({
  glyph,
  label,
  fontSize,
  onPress,
}: {
  glyph: keyof typeof Ionicons.glyphMap;
  label: string;
  fontSize: number | null;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.service, pressed && { opacity: 0.88 }]}>
      <Ionicons name={glyph} size={SERVICE_ICON} color={FQColors.goldLight} />
      {fontSize != null && (
        <Text style={[styles.serviceLabel, { fontSize }]} numberOfLines={1}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export default function FootballQuizHome() {
  const t = useFQLabels();
  const modes = useFQModeLines();
  const { width } = useWindowDimensions();

  const cardWidth = (width - SCREEN_PAD * 2 - CARD_GAP) / 2;
  const modeAvail = cardWidth - CARD_PAD * 2;
  const serviceAvail = cardWidth - SERVICE_PAD * 2 - SERVICE_ICON - SERVICE_GAP;

  // Memoised so the candidate arrays keep their identity across renders — the
  // measurement hook keys its cache off them.
  const modeWords = useMemo(() => [...modes.classic, ...modes.legends], [modes]);
  const serviceWords = useMemo(() => [t.shop, t.settings], [t.shop, t.settings]);

  const mode = useFittedFontSize(modeWords, modeAvail, MODE_MAX);
  const service = useFittedFontSize(serviceWords, serviceAvail, SERVICE_MAX);

  return (
    <View style={styles.fill}>
      <AppBackground variant="home" />
      <StatusBar style="light" />

      {mode.probes}
      {service.probes}

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
          <View style={styles.modes}>
            <ModeCard
              glyph="football"
              lines={modes.classic}
              fontSize={mode.size}
              onPress={() => router.push('/football-quiz/levels')}
            />
            <ModeCard
              glyph="star"
              lines={modes.legends}
              fontSize={mode.size}
              onPress={() => router.push('/football-quiz/levels')}
            />
          </View>
          <View style={styles.services}>
            <ServicePill
              glyph="cart"
              label={t.shop}
              fontSize={service.size}
              onPress={() => router.push('/football-quiz/shop')}
            />
            <ServicePill
              glyph="settings"
              label={t.settings}
              fontSize={service.size}
              onPress={() => router.push('/football-quiz/settings')}
            />
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
  modeLabel: {
    fontWeight: '900',
    color: FQColors.text,
    textAlign: 'center',
    letterSpacing: 0.2,
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
  serviceLabel: { fontWeight: '900', color: FQColors.text },
});
