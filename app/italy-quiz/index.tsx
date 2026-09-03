import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { useItalyLabels } from '@/constants/italy-quiz/labels';

// How far above dead-centre the Play button sits, as a fraction of its own height
// (visual translate — doesn't affect layout). Raised back up by half a
// button-height per the brief (0.1 + 0.5), so it sits above centre over the map.
const PLAY_LIFT_RATIO = 0.6;

/**
 * Italy Quiz home (App Template: World). The cartoon-3D Italian landmarks artwork
 * is the full-screen background (edge-to-edge, no bars). Settings (gear) sits in
 * the top-RIGHT corner; the Play button uses the SAME glossy-tile design as Flags
 * Quiz but recoloured to a deep saturated navy blue with a white label, and sits a
 * little above centre.
 *
 * Content is gated on the background finishing its warm-up so the artwork and the
 * buttons appear together (no one-second pop-in).
 */
export default function ItalyQuizHome() {
  const t = useItalyLabels();
  const [playH, setPlayH] = useState(0);
  const bgReady = useItalyBgReady();

  // Hold on a plain dusk base until the artwork is cached, then reveal background
  // + buttons in the same frame.
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top']}>
        {/* Top bar: Settings gear in the top-right corner. */}
        <View style={styles.topRow}>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
            onPress={() => router.push('/italy-quiz/settings')}
          >
            <GlossyIconButton glyph="settings-sharp" />
          </Pressable>
        </View>

        {/* Play — centred, then nudged so it sits over the open hills. Opens the
            category picker. */}
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
            onPress={() => router.push('/italy-quiz/categories')}
          >
            <LinearGradient
              colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.playBtn, ItalyShadow.card]}
            >
              {/* Top gloss band, matching the icon tiles. */}
              <LinearGradient
                colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
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

  // Glossy deep-navy tile, shared design with the Settings button.
  playBtn: {
    minWidth: 240,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 19,
    paddingHorizontal: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: ItalyColors.tileRim,
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
  // White label — reads clearly on the deep navy tile.
  playText: {
    color: ItalyColors.tileGlyph,
    fontWeight: '900',
    fontSize: 53,
    letterSpacing: 0.5,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
