import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { useFQLabels } from '@/constants/flags-quiz/labels';

/**
 * Flags Quiz Play screen (App Template: Geography). Opens from the home Play
 * button. Plain vertical blue gradient background with a Back button (top-left,
 * same glossy-blue tile as the Settings screen).
 *
 * Four glossy-blue mode buttons (same design as the home Play button):
 * All countries, By continent, Challenge (locked — coming soon), Draw a flag
 * (locked — coming soon). A bottom "Other apps" phone tile mirrors the reference.
 * Destinations aren't built yet, so the active handlers are no-ops for now.
 */
export default function FlagsQuizPlay() {
  const t = useFQLabels();

  return (
    <View style={styles.fill}>
      <GradientBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header: back button only. */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
        </View>

        {/* Mode buttons */}
        <View style={styles.actions}>
          <GlossyButton
            label={t.allCountries}
            fontSize={24}
            paddingVertical={24}
            onPress={() => {
              // TODO: start the "all countries" game once it exists.
            }}
          />
          <GlossyButton
            label={t.byContinents}
            fontSize={24}
            paddingVertical={24}
            onPress={() => {
              // TODO: open continent selection once it exists.
            }}
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
        </View>

        <View style={styles.spacer} />

        {/* Bottom: "Other apps" phone tile. */}
        <View style={styles.bottom}>
          <Pressable
            hitSlop={8}
            style={({ pressed }) => [styles.bottomItem, pressed && styles.pressed]}
            onPress={() => {
              // TODO: link to the publisher's other apps once decided.
            }}
          >
            <GlossyIconButton glyph="phone-portrait" size={54} />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actions: { paddingHorizontal: 24, paddingTop: 8, gap: 16 },
  spacer: { flex: 1 },
  bottom: {
    alignItems: 'center',
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
