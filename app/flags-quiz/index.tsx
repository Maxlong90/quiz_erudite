import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useFlagsBgReady } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';

// How far above dead-centre the Play button sits: 70% of its own height,
// applied as a visual translate (doesn't affect layout). Measured via onLayout
// so it stays exact regardless of the button's final size.
const PLAY_LIFT_RATIO = 0.7;

/**
 * Flags Quiz home (App Template: Geography). The spiral-of-flags artwork is the
 * full-screen background. Settings (gear) sits top-left and Shop (bag) top-right
 * at equal insets; the Play button uses the SAME glossy-blue tile design as those
 * icons (navy label), sits a little above centre, and opens the Play screen.
 *
 * Content is gated on the background finishing its warm-up so the artwork and the
 * buttons appear together (no one-second pop-in). The Shop destination isn't built
 * yet, so that handler is a no-op for now.
 */
export default function FlagsQuizWelcome() {
  const t = useFQLabels();
  const [playH, setPlayH] = useState(0);
  const bgReady = useFlagsBgReady();

  // Hold on a plain blue base until the flags artwork is cached, then reveal
  // background + buttons in the same frame.
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* Top bar: Settings hard-left, Shop hard-right, equal 16px insets. */}
        <View style={styles.topRow}>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => router.push('/flags-quiz/settings')}
          >
            <GlossyIconButton glyph="settings-sharp" />
          </Pressable>

          <Pressable
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => {
              // TODO: router.push('/flags-quiz/shop') once the shop exists.
            }}
          >
            <GlossyIconButton glyph="bag-handle" />
          </Pressable>
        </View>

        {/* Play — centred in the spiral's eye, then lifted up 70% of its height. */}
        <View style={styles.center} pointerEvents="box-none">
          <Pressable
            onLayout={(e) => setPlayH(e.nativeEvent.layout.height)}
            style={({ pressed }) => ({
              transform: [
                { translateY: -PLAY_LIFT_RATIO * playH },
                { scale: pressed ? 0.98 : 1 },
              ],
              opacity: pressed ? 0.9 : 1,
            })}
            onPress={() => router.push('/flags-quiz/play')}
          >
            <LinearGradient
              colors={[FQColors.tileLight, FQColors.tileDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.playBtn, FQShadow.card]}
            >
              {/* Top gloss band, matching the icon tiles. */}
              <LinearGradient
                colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                style={styles.playGloss}
                pointerEvents="none"
              />
              <Text style={styles.playText}>{t.play}</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Glossy blue tile design, shared with the Settings / Shop buttons.
  // Sized +20% over the original (paddingV 16→19, paddingH 40→48, minWidth
  // 200→240).
  playBtn: {
    minWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 19,
    paddingHorizontal: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
  },
  playGloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '50%',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  // Navy label — same colour as the gear / bag glyphs.
  playText: {
    color: FQColors.tileGlyph,
    fontWeight: '900',
    fontSize: 53,
    letterSpacing: 0.5,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
