import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useCoatBgReady } from '@/components/coat-of-arms/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';

// How far above dead-centre the Play button sits: 70% of its own height,
// applied as a visual translate (doesn't affect layout). Measured via onLayout
// so it stays exact regardless of the button's final size.
const PLAY_LIFT_RATIO = 0.7;

/**
 * Coat of Arms home. The spiral-of-coats artwork is the full-screen background.
 * Settings (gear) sits top-right; the Play button uses the SAME glossy-blue tile
 * design (navy label) as Flags Quiz and sits inside the spiral's eye, a little
 * above centre. Buttons, colours and layout are lifted verbatim from the Flags
 * Quiz home so the two apps share one visual language.
 *
 * Content is gated on the background finishing its warm-up so the artwork and the
 * buttons appear together (no one-second pop-in).
 */
export default function CoatOfArmsWelcome() {
  const t = useFQLabels();
  const [playH, setPlayH] = useState(0);
  const bgReady = useCoatBgReady();

  // Hold on a plain blue base until the coats artwork is cached, then reveal
  // background + buttons in the same frame.
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* Top bar: Settings only, top-right corner. */}
        <View style={styles.topRow}>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => router.push('/coat-of-arms/settings')}
          >
            <GlossyIconButton glyph="settings-sharp" />
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
            // Quiz flow is not wired for Coat of Arms yet — the CTA is present and
            // styled identically to Flags Quiz; the gameplay route lands here later.
            onPress={() => {}}
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
    // Settings gear sits in the top-right corner.
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  // Glossy blue tile design, shared with the Settings button.
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
  // Navy label — same colour as the gear glyph.
  playText: {
    color: FQColors.tileGlyph,
    fontWeight: '900',
    fontSize: 53,
    letterSpacing: 0.5,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
