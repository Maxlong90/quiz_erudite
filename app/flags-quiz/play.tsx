import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useFlagsBgReady } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { useFQLabels } from '@/constants/flags-quiz/labels';

/**
 * Flags Quiz Play screen (App Template: Geography). Opens from the home Play
 * button. Uses the same spiral-of-flags background as the home screen, with a
 * Back button (top-left, same glossy-blue tile as the Settings screen).
 *
 * Five glossy-blue mode buttons (same design as the home Play button):
 * All countries, By continent, Challenge (locked), Draw a flag (locked), Maps
 * (locked). A bottom row holds "Other apps" + Settings tiles. Content-backed
 * destinations aren't wired yet, so those handlers are no-ops for now.
 */
export default function FlagsQuizPlay() {
  const t = useFQLabels();
  const bgReady = useFlagsBgReady();
  // Measured height of a single mode button — the whole stack is nudged down by
  // half of it, widening ONLY the gap under the header (the inter-button gap is
  // unchanged).
  const [btnH, setBtnH] = useState(0);

  // Hold on a plain blue base until the flags artwork is cached, then reveal
  // background + buttons together (matches the home screen).
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header: back (left) + settings (right, same size as the back button). */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/flags-quiz/settings')}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="settings-sharp" size={44} />
          </Pressable>
        </View>

        {/* Mode buttons — the stack sits half a button lower than the header. */}
        <View style={[styles.actions, btnH ? { marginTop: btnH / 2 } : null]}>
          <View onLayout={(e) => setBtnH(e.nativeEvent.layout.height)}>
            <GlossyButton
              label={t.allCountries}
              fontSize={24}
              paddingVertical={24}
              onPress={() => router.push('/flags-quiz/quiz')}
            />
          </View>
          <GlossyButton
            label={t.byContinents}
            fontSize={24}
            paddingVertical={24}
            onPress={() => router.push('/flags-quiz/continents')}
          />
          <GlossyButton
            label={t.challenge}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={24}
            locked
            onPress={() => {}}
          />
          <GlossyButton
            label={t.drawFlag}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={24}
            locked
            onPress={() => {}}
          />
          <GlossyButton
            label={t.maps}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={24}
            locked
            onPress={() => {}}
          />
        </View>

        <View style={styles.spacer} />

        {/* Bottom: "Other apps" phone tile, centred (Settings moved to the header). */}
        <View style={styles.bottom}>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.bottomItem, pressed && styles.pressed]}
            onPress={() => {
              Linking.openURL(
                'https://apps.apple.com/us/app/erudite-quiz-trivia-crac-daily/id6787385686',
              ).catch(() => {});
            }}
          >
            <GlossyIconButton glyph="phone-portrait" size={70} />
            <Text style={styles.bottomLabel}>{t.otherApps}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actions: { paddingHorizontal: 24, paddingTop: 8, gap: 16 },
  spacer: { flex: 1 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 40,
    paddingBottom: 12,
  },
  bottomItem: { alignItems: 'center', gap: 6 },
  bottomLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    textShadowColor: 'rgba(4, 40, 96, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
