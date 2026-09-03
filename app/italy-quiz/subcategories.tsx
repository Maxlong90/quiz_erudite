import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { useItalyCategory } from '@/constants/italy-quiz/categories';

/**
 * Italy Quiz subcategory list (category → here). Background is a soft, lighter
 * blue-violet gradient (brightened per the brief — the old one was too dark) with
 * a gentle top glow; the glossy navy buttons keep their gloss band + drop shadow
 * so they still stand off the lighter background. Buttons match the category
 * buttons' size, and the whole list is lowered ~half a button below the back
 * button. The quiz flow is not wired yet, so tapping a subcategory is a no-op.
 */
export default function ItalyQuizSubcategories() {
  const { cat } = useLocalSearchParams<{ cat?: string }>();
  const category = useItalyCategory(cat);

  return (
    <View style={styles.fill}>
      {/* Lighter blue-violet base gradient. */}
      <LinearGradient
        colors={['#6E7FD6', '#43539F', '#212F63']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Soft light glow at the top so the header area has airy depth. */}
      <LinearGradient
        colors={['rgba(200, 214, 255, 0.5)', 'rgba(200, 214, 255, 0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
      <StatusBar style="light" />

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
              onPress={() => {
                // TODO: wire the Italy quiz flow (subcategory → quiz).
              }}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#212F63' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },

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
    textShadowColor: 'rgba(0,0,0,0.4)',
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
