import { useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground, BG_BASE, useCoatBgReady } from '@/components/coat-of-arms/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';
import { CATEGORY_ICON, useCategoryIconsReady } from '@/constants/coat-of-arms/category-icons';
import { useCoatPlayMetrics } from '@/hooks/coat-of-arms/use-coat-layout';
import { getDeveloperLinks } from '@/lib/store-links';

// Soften the busy coats artwork behind the mode buttons so the glossy buttons
// read clearly. A light blur (~15%) — tune this single number up/down to taste.
const PLAY_BG_BLUR = 15;

/**
 * "Other apps" opens the PUBLISHER's page (every app we ship) rather than one
 * hardcoded sibling listing, so new releases surface there with no app update.
 * Tries the store-app deep link first and falls back to the web URL when no store
 * app can handle it. Mirrors app/sport-quiz/play.tsx.
 */
function openOtherApps() {
  const { url, deepLink } = getDeveloperLinks(Platform.OS);
  Linking.openURL(deepLink).catch(() => {
    Linking.openURL(url).catch(() => {});
  });
}

/**
 * Coat of Arms Play screen. Opens from the home Play button and mirrors the
 * Flags Quiz Play screen — same Coat of Arms coats background as the home
 * screen, a Back (left) + Settings (right) header, and a stack of glossy-blue
 * mode buttons in the exact home-screen style/colours.
 *
 * Categories: All countries, By continents, Challenge (locked), Cities (locked),
 * and Bonus level (locked). Each button carries its own crest icon. Content-
 * backed destinations aren't wired yet, so the locked handlers are no-ops.
 */
export default function CoatOfArmsPlay() {
  const t = useFQLabels();
  const c = useCoaLabels();
  const bgReady = useCoatBgReady();
  const iconsReady = useCategoryIconsReady();
  // Live window metrics. r.column keeps the five buttons from stretching into
  // full-width stripes on a wide window (the iPad reject); the vertical fields
  // (buttonPadV/buttonGap/buttonFont/iconSize) shrink the button stack on a short
  // or Display-Zoomed window so the bottom "Other apps" tile never overlaps the
  // last mode button. On a tall phone every field is the shipped value.
  const r = useCoatPlayMetrics();
  // Measured height of a single mode button — the whole stack is nudged down by
  // half of it, widening ONLY the gap under the header (mirrors Flags Quiz). It
  // tracks the fitted button height, so on a short window the top gap shrinks too.
  const [btnH, setBtnH] = useState(0);
  const iconSize = r.iconSize;

  // While the (already home-warmed) coats artwork + category icons finish
  // caching, render the SAME coats background (over the blue base) rather than a
  // plain blue fill, so the background never flips blue→coats when opening Play —
  // only the buttons appear once the icons are ready. The icons are also
  // preloaded by the feature layout, so on a normal open this frame is skipped.
  if (!bgReady || !iconsReady) {
    return (
      <View style={[styles.fill, { backgroundColor: BG_BASE }]}>
        <AppBackground blurRadius={PLAY_BG_BLUR} />
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <AppBackground blurRadius={PLAY_BG_BLUR} />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Content column. Null on a phone (a plain flex:1 pass-through, so the
            layout is unchanged); on a wide window it centres the content and caps
            it, which is what stops the five mode buttons becoming full-bleed
            stripes. `styles.fill` is unconditional — without it this wrapper is
            flex: 0 and the `spacer` below stops pushing the bottom tile down. */}
        <View style={[styles.fill, r.column]}>
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

          {/* Mode buttons — the stack sits half a button lower than the header,
              and its padding/gap/font shrink to fit a short or zoomed window. */}
          <View style={[styles.actions, { gap: r.buttonGap }, btnH ? { marginTop: btnH / 2 } : null]}>
            <View onLayout={(e) => setBtnH(e.nativeEvent.layout.height)}>
              <GlossyButton
                label={t.allCountries}
                fontSize={r.buttonFont}
                paddingVertical={r.buttonPadV}
                icon={<Image source={CATEGORY_ICON.allCountries} style={[styles.icon, { width: iconSize, height: iconSize }]} resizeMode="contain" fadeDuration={0} />}
                onPress={() => router.push('/coat-of-arms/quiz')}
              />
            </View>
            <GlossyButton
              label={t.byContinents}
              fontSize={r.buttonFont}
              paddingVertical={r.buttonPadV}
              icon={<Image source={CATEGORY_ICON.byContinents} style={[styles.icon, { width: iconSize, height: iconSize }]} resizeMode="contain" fadeDuration={0} />}
              onPress={() => router.push('/coat-of-arms/continents')}
            />
            <GlossyButton
              label={t.challenge}
              sublabel={t.comingSoon}
              fontSize={r.buttonFont}
              paddingVertical={r.buttonPadV}
              locked
              icon={<Image source={CATEGORY_ICON.challenge} style={[styles.icon, { width: iconSize, height: iconSize }]} resizeMode="contain" fadeDuration={0} />}
              onPress={() => {}}
            />
            <GlossyButton
              label={c.cities}
              sublabel={t.comingSoon}
              fontSize={r.buttonFont}
              paddingVertical={r.buttonPadV}
              locked
              icon={<Image source={CATEGORY_ICON.cities} style={[styles.icon, { width: iconSize, height: iconSize }]} resizeMode="contain" fadeDuration={0} />}
              onPress={() => {}}
            />
            <GlossyButton
              label={c.bonusLevel}
              sublabel={t.comingSoon}
              fontSize={r.buttonFont}
              paddingVertical={r.buttonPadV}
              locked
              icon={<Image source={CATEGORY_ICON.bonus} style={[styles.icon, { width: iconSize, height: iconSize }]} resizeMode="contain" fadeDuration={0} />}
              onPress={() => {}}
            />
          </View>

          <View style={styles.spacer} />

          {/* Bottom: "Other apps" phone tile, centred — same tile, label and link
              as the Flags Quiz Play screen. */}
          <View style={styles.bottom}>
            <Pressable
              hitSlop={8}
              style={({ pressed }) => [styles.bottomItem, pressed && styles.pressed]}
              onPress={openOtherApps}
            >
              <GlossyIconButton glyph="phone-portrait" size={70} />
              <Text style={styles.bottomLabel}>{t.otherApps}</Text>
            </Pressable>
          </View>
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
  actions: { paddingHorizontal: 24, paddingTop: 8 },
  icon: { width: 46, height: 46 },
  spacer: { flex: 1 },
  bottom: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
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
