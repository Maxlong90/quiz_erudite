import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useItalyBgReady } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { useItalyPlaces } from '@/constants/italy-quiz/places';
import { useItalyLabels } from '@/constants/italy-quiz/labels';

/**
 * Italy Quiz place picker (Play → here) — the app's ONLY taxonomy screen.
 *
 * It replaces the old category → subcategory pair. Those two screens split the
 * content by school subject (Geography, History, Art…), which meant a player
 * picked a discipline and then got a wall of it; this one asks a single question,
 * "where are we going", and the tour behind each row mixes every discipline as it
 * walks that place through time.
 *
 * Places with no questions authored yet render locked rather than being hidden,
 * so the shape of the finished app is visible from the first build.
 */
export default function ItalyQuizPlaces() {
  const places = useItalyPlaces();
  const t = useItalyLabels();
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
          <Pressable
            onPress={() => router.push('/italy-quiz/settings')}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="settings-sharp" size={44} />
          </Pressable>
        </View>

        <Text style={styles.title}>{t.whereTo}</Text>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {places.map((p) => (
            <GlossyButton
              key={p.id}
              label={p.title}
              sublabel={p.locked ? t.comingSoon : p.tagline}
              locked={p.locked}
              fontSize={22}
              paddingVertical={16}
              onPress={() =>
                router.push({ pathname: '/italy-quiz/quiz', params: { place: p.id } })
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
  },
  title: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    paddingHorizontal: 20,
    marginTop: 20,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  list: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 12,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
