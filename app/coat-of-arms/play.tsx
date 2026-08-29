import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useCoatBgReady } from '@/components/coat-of-arms/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';

/**
 * Coat of Arms Play screen. Opens from the home Play button and mirrors the
 * Flags Quiz Play screen — same Coat of Arms coats background as the home
 * screen, a Back (left) + Settings (right) header, and a stack of glossy-blue
 * mode buttons in the exact home-screen style/colours.
 *
 * Categories: All countries, By continent, Challenge (locked), International
 * symbols (locked — "available soon"), Cities, and Bonus level at the bottom.
 * Content-backed destinations aren't wired yet, so the active handlers are
 * no-ops for now (like the home Play button).
 */
export default function CoatOfArmsPlay() {
  const t = useFQLabels();
  const c = useCoaLabels();
  const bgReady = useCoatBgReady();

  // Hold on a plain blue base until the coats artwork is cached, then reveal
  // background + buttons together (matches the home screen).
  if (!bgReady) {
    return <View style={[styles.fill, { backgroundColor: BG_BASE }]} />;
  }

  return (
    <View style={styles.fill}>
      <AppBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Header: back (left) + settings (right), same glossy tiles as Flags Quiz. */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/coat-of-arms/settings')}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="settings-sharp" size={44} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.actions}
          showsVerticalScrollIndicator={false}
        >
          <GlossyButton
            label={t.allCountries}
            fontSize={24}
            paddingVertical={22}
            onPress={() => router.push('/coat-of-arms/quiz')}
          />
          <GlossyButton
            label={t.byContinents}
            fontSize={24}
            paddingVertical={22}
            onPress={() => {}}
          />
          <GlossyButton
            label={t.challenge}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={22}
            locked
            onPress={() => {}}
          />
          <GlossyButton
            label={c.internationalSymbols}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={22}
            locked
            onPress={() => {}}
          />
          <GlossyButton
            label={c.cities}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={22}
            locked
            onPress={() => {}}
          />
          <GlossyButton
            label={c.bonusLevel}
            sublabel={t.comingSoon}
            fontSize={24}
            paddingVertical={22}
            locked
            onPress={() => {}}
          />
        </ScrollView>
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
  actions: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 20, gap: 16 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
