import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { useItalyCategories } from '@/constants/italy-quiz/categories';

/**
 * Italy Quiz category picker (Play → here). The home landmarks artwork is the
 * background; a soft navy scrim keeps the button labels legible over it. Each of
 * the seven categories is a glossy navy button in the SAME style as the home Play
 * button; tapping one opens its subcategory list. No screen title, no per-button
 * icons (removed per the brief).
 */
export default function ItalyQuizCategories() {
  const categories = useItalyCategories();
  const bgReady = useItalyBgReady();

  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />
      {/* Soft scrim so the glossy buttons read clearly over the busy artwork. */}
      <View style={styles.scrim} pointerEvents="none" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header: back button only (title removed). */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {categories.map((c) => (
            <GlossyButton
              key={c.id}
              label={c.title}
              fontSize={22}
              paddingVertical={18}
              onPress={() =>
                router.push({ pathname: '/italy-quiz/subcategories', params: { cat: c.id } })
              }
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  scrim: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6, 15, 56, 0.42)' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  list: {
    paddingHorizontal: 24,
    // Lowered the whole list by ~half a button height per the brief.
    paddingTop: 48,
    paddingBottom: 32,
    gap: 14,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
