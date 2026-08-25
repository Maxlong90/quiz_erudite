import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';

/**
 * Flags Quiz Play screen (App Template: Geography). Opens from the home Play
 * button. Plain vertical blue gradient background with a Back button (top-left,
 * same glossy-blue tile as the Settings screen) that returns to home. Content
 * (the level / category selection) is built out next.
 */
export default function FlagsQuizPlay() {
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

        {/* Content goes here (level / category selection) — next step. */}
        <View style={styles.content} />
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
  content: { flex: 1 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
