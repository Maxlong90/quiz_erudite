import { useEffect, useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// Continent-shape icons (from the reference sheet) shown inside each button.
const CONTINENT_ICON: Record<ContinentKey, ImageSourcePropType> = {
  africa: require('../../assets/flags-quiz/continents/africa.png'),
  northAmerica: require('../../assets/flags-quiz/continents/north-america.png'),
  southAmerica: require('../../assets/flags-quiz/continents/south-america.png'),
  asia: require('../../assets/flags-quiz/continents/asia.png'),
  europe: require('../../assets/flags-quiz/continents/europe.png'),
  oceania: require('../../assets/flags-quiz/continents/oceania.png'),
};

// All six icon modules, preloaded together so they decode up front and every
// continent button paints its icon in the SAME frame — no one-by-one pop-in.
// `require()` of a bundled image resolves to a numeric module id — the shape
// Asset.loadAsync expects.
const CONTINENT_ICON_MODULES = Object.values(CONTINENT_ICON) as number[];

/**
 * Warms all continent icons before the list renders, so they appear together
 * and instantly. Fails open; after the first warm-up they're cached, so later
 * visits resolve immediately.
 */
function useContinentIconsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Asset.loadAsync(CONTINENT_ICON_MODULES)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}

// Continents in play order, with the flag (question) count per region. America is
// split into North & South per spec. Counts are placeholders (≈ real country
// counts, ~195 total) until the backend catalogue is wired.
const CONTINENTS: { key: ContinentKey; count: number }[] = [
  { key: 'africa', count: 54 },
  { key: 'northAmerica', count: 23 },
  { key: 'southAmerica', count: 12 },
  { key: 'asia', count: 48 },
  { key: 'europe', count: 44 },
  { key: 'oceania', count: 14 },
];

/**
 * Flags Quiz "By continent" screen (App Template: Geography). Opens from the Play
 * screen. Same blue gradient background and glossy-blue buttons as the rest of the
 * flow; each continent button carries its shape icon + question count and opens
 * that continent's game. Top bar: back (left) + report + share (right), matching
 * the "All countries" screen.
 */
export default function FlagsQuizContinents() {
  const t = useFQLabels();
  const { locale } = useLocale();
  const [reportOpen, setReportOpen] = useState(false);
  const iconsReady = useContinentIconsReady();
  // Measured height of a single continent button — the whole list is nudged down
  // by half of it (wider gap under the header; inter-button gap unchanged).
  const [btnH, setBtnH] = useState(0);

  const onShare = async () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    try {
      await Share.share({ message: t.shareInvite.replace('{url}', storeUrl) });
    } catch {
      // cancelled / unavailable
    }
  };

  return (
    <View style={styles.fill}>
      <GradientBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Top bar: back (left) · report + share (right). */}
        <View style={styles.hud}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
          <View style={styles.hudRight}>
            <Pressable
              onPress={() => setReportOpen(true)}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <GlossyIconButton glyph="flag" size={44} />
            </Pressable>
            <Pressable
              onPress={onShare}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <GlossyIconButton glyph="share-social" size={44} />
            </Pressable>
          </View>
        </View>

        {/* Hold the list until all icons are warmed, so every continent button
            reveals its icon together (no staggered pop-in). */}
        {iconsReady ? (
          <ScrollView
            contentContainerStyle={[styles.actions, btnH ? { paddingTop: 8 + btnH / 2 } : null]}
            showsVerticalScrollIndicator={false}
          >
            {CONTINENTS.map((c, i) => (
              <View
                key={c.key}
                onLayout={i === 0 ? (e) => setBtnH(e.nativeEvent.layout.height) : undefined}
              >
                <GlossyButton
                  label={t[c.key]}
                  sublabel={`${t.questions}: ${c.count}`}
                  fontSize={24}
                  paddingVertical={20}
                  icon={
                    <Image
                      source={CONTINENT_ICON[c.key]}
                      style={styles.contIcon}
                      resizeMode="contain"
                      fadeDuration={0}
                    />
                  }
                  onPress={() =>
                    router.push({ pathname: '/flags-quiz/continent-quiz', params: { continent: c.key } })
                  }
                />
              </View>
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>

      {/* Report — placeholder question id (no per-question context on this screen). */}
      <QuizMenuModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        question={{ id: 0 } as unknown as LogoQuizQuestion}
        appConfig={undefined}
        locale={locale}
        initialView="report"
        primaryGradient={['#A6E1FF', '#3FA9F5']}
        sheetGradient={['#C2E4FF', '#7FBDF3']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actions: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 16 },
  contIcon: { width: 42, height: 42 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
