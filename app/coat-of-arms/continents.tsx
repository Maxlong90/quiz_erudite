import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
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
import { useCoatContent } from '@/hooks/coat-of-arms/use-coat-content';

// Reuse the Flags Quiz continent-shape icons (same six continents).
const CONTINENT_ICON: Record<ContinentKey, ImageSourcePropType> = {
  africa: require('../../assets/flags-quiz/continents/africa.png'),
  northAmerica: require('../../assets/flags-quiz/continents/north-america.png'),
  southAmerica: require('../../assets/flags-quiz/continents/south-america.png'),
  asia: require('../../assets/flags-quiz/continents/asia.png'),
  europe: require('../../assets/flags-quiz/continents/europe.png'),
  oceania: require('../../assets/flags-quiz/continents/oceania.png'),
};

const CONTINENT_ICON_MODULES = Object.values(CONTINENT_ICON) as number[];

/** Warms all continent icons before the list renders, so they appear together. */
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

// Continents in play order (America split into North & South), mirroring Flags
// Quiz. Per-continent counts are read live from the backend content provider.
const CONTINENT_ORDER: ContinentKey[] = [
  'africa',
  'northAmerica',
  'southAmerica',
  'asia',
  'europe',
  'oceania',
];

/**
 * Coat of Arms "By continent" screen. Opens from the Play screen. Same blue
 * gradient background and glossy-blue buttons as the Flags Quiz continents
 * screen; each continent button carries its shape icon + question count and opens
 * that continent's coat game.
 */
export default function CoatOfArmsContinents() {
  const t = useFQLabels();
  const { countsByContinent } = useCoatContent();
  const iconsReady = useContinentIconsReady();
  // Measured height of a single continent button — the whole list is nudged down
  // by half of it (wider gap under the header; inter-button gap unchanged).
  const [btnH, setBtnH] = useState(0);

  return (
    <View style={styles.fill}>
      <GradientBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Top bar: back only (matches the coat gameplay HUD). */}
        <View style={styles.hud}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
        </View>

        {iconsReady ? (
          <ScrollView
            contentContainerStyle={[styles.actions, btnH ? { paddingTop: 8 + btnH / 2 } : null]}
            showsVerticalScrollIndicator={false}
          >
            {CONTINENT_ORDER.map((key, i) => {
              const count = countsByContinent[key];
              return (
                <View
                  key={key}
                  onLayout={i === 0 ? (e) => setBtnH(e.nativeEvent.layout.height) : undefined}
                >
                  <GlossyButton
                    label={t[key]}
                    sublabel={`${t.questions}: ${count != null ? count : '…'}`}
                    fontSize={24}
                    paddingVertical={20}
                    icon={
                      <Image
                        source={CONTINENT_ICON[key]}
                        style={styles.contIcon}
                        resizeMode="contain"
                        fadeDuration={0}
                      />
                    }
                    onPress={() =>
                      router.push({ pathname: '/coat-of-arms/continent-quiz', params: { continent: key } })
                    }
                  />
                </View>
              );
            })}
          </ScrollView>
        ) : null}
      </SafeAreaView>
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
  actions: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 24, gap: 16 },
  contIcon: { width: 42, height: 42 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
