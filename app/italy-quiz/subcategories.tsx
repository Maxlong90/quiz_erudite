import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { useItalyCategory } from '@/constants/italy-quiz/categories';

/**
 * Italy Quiz subcategory list (category → here). Uses the SAME background as the
 * category screen — the landmarks artwork under a navy scrim — so the two read as
 * one flow; the glossy navy buttons keep their gloss band and drop shadow, which
 * is what separates them from the artwork. The quiz opens from any row.
 */
export default function ItalyQuizSubcategories() {
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const category = useItalyCategory(cat);
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
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
          <Text style={styles.title} numberOfLines={2}>
            {category?.title ?? ''}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {(category?.subcategories ?? []).map((s) => (
            <GlossyButton
              key={s.id}
              label={s.title}
              fontSize={22}
              paddingVertical={18}
              onPress={() =>
                router.push({
                  pathname: '/italy-quiz/quiz',
                  params: { cat: cat ?? '', sub: s.slug },
                })
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
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(6, 15, 56, 0.42)',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  list: {
    paddingHorizontal: 24,
    // Lowered ~half a button height below the back/header row per the brief.
    paddingTop: 48,
    paddingBottom: 32,
    gap: 14,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
