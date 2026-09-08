import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { FQIconButton, FQLogo, goldGlow } from '@/components/football-quiz/ui';
import { FQColors, FQ_FILL } from '@/constants/football-quiz/theme';

/**
 * Football Quiz home — the approved "variant D" layout, and the only screen that
 * does NOT follow Sport Quiz's structure.
 *
 * The backdrop sits OUTSIDE the SafeAreaView so the photo runs edge to edge,
 * under the status bar and the home indicator. Only the content is inset.
 *
 * The wordmark shares ONE flex row with the Shop/Settings buttons
 * (space-between + align-items: center), so logo and icons stay vertically
 * centred on each other whatever the type or button size.
 */
const BTN = 190;
const GLYPH = 92;
const LABEL = 42;

export default function FootballQuizHome() {
  return (
    <View style={styles.fill}>
      <AppBackground variant="home" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <FQLogo />
          <View style={styles.headerIcons}>
            <FQIconButton glyph="cart" size={66} glyphScale={0.45} ring={3} onPress={() => router.push('/football-quiz/shop')} />
            <FQIconButton glyph="settings" size={66} glyphScale={0.45} ring={3} onPress={() => router.push('/football-quiz/settings')} />
          </View>
        </View>

        <View style={styles.center}>
          <Pressable
            onPress={() => router.push('/football-quiz/play')}
            style={({ pressed }) => [
              styles.playBtn,
              goldGlow(BTN * 0.3, 0.35),
              pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
            ]}
          >
            <Ionicons name="play" size={GLYPH} color={FQColors.goldLight} style={styles.playGlyph} />
            <Text style={styles.playLabel}>PLAY</Text>
          </Pressable>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 12 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -30 },
  playBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    backgroundColor: FQ_FILL,
    borderWidth: 3,
    borderColor: FQColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlyph: { marginBottom: -6 },
  playLabel: {
    color: FQColors.goldLight,
    fontWeight: '900',
    fontSize: LABEL,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 2 },
  },
});
