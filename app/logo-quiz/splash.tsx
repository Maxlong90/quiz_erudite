import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Asset } from 'expo-asset';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppBackground, BG_BASE } from '@/components/logo-quiz/app-background';
import { loadCachedSnapshot, syncContent } from '@/lib/content-cache';
import { buildLevels, LOGO_QUIZ_SLUG } from '@/lib/logo-quiz/content';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLocale } from '@/hooks/use-locale';

/**
 * Logo Quiz splash — the dedicated in-group splash reached via app/index.tsx's
 * `/logo-quiz/splash` redirect, mirroring the Sport Quiz / Flags Quiz pattern
 * (each app template owns its splash instead of the shared erudite app/splash).
 *
 * Same QUIZZES wordmark treatment as the other templates (the three middle Z's
 * are the accent) in the Logo Quiz light palette, with the "Train Your Brain!"
 * tagline. Stays up a MINIMUM of 3s and, in that same window, preloads BOTH the
 * bundled Welcome art AND the brand logos of the first levels — so the Welcome
 * screen and the first level open with no image pop-in. Only when the timer and
 * the preload both finish do we navigate; a hard cap guarantees we never trap the
 * user on a slow first-launch sync.
 */
const SPLASH_MS = 3000;
// Warm the first 3 levels (15 logos each) first; the rest follow in the
// background. This only orders the background prefetch — it never gates the
// splash, which always lasts exactly SPLASH_MS.
const PRELOAD_MIN_LOGOS = 45;
const LETTERS = ['Q', 'U', 'I', 'Z', 'Z', 'Z', 'E', 'S'] as const;

// Bundled art the Welcome screen draws immediately (title + brand strip + wheel
// art + result badges) — warmed here so Welcome paints with no pop-in. Mirrors
// the list in app/logo-quiz/index.tsx.
const WELCOME_ASSETS = [
  require('../../assets/logo-quiz/title.png'),
  require('../../assets/logo-quiz/brand-strip.png'),
  require('../../assets/logo-quiz/wheel-icon.png'),
  require('../../assets/logo-quiz/wheel-title.png'),
  require('../../assets/logo-quiz/game-over-cloud.png'),
  require('../../assets/logo-quiz/win-smiley.png'),
];

/**
 * Warm the Logo Quiz brand logos into expo-image's memory-disk cache. Runs as a
 * background best-effort task — the splash NEVER waits on it, so a slow/cold
 * first-launch sync can't stretch the splash. The image files are already on
 * disk from content sync; this only warms the DECODE. Loads the cached snapshot
 * directly (syncing if it's missing or for the wrong locale), builds the levels,
 * and prefetches every question's imageUri (first 3 levels first, the rest
 * after). expo-image's cache is global/persistent, so tiles warmed even after we
 * leave the splash still land cached on the first level. Fully fail-open.
 */
async function prefetchLogoQuizLogos(locale: string): Promise<void> {
  try {
    let snapshot = await loadCachedSnapshot(LOGO_QUIZ_SLUG);
    if (!snapshot || snapshot.locale !== locale) {
      snapshot = await syncContent({ locale, appSlug: LOGO_QUIZ_SLUG });
    }
    if (!snapshot) return;
    const uris = buildLevels(snapshot)
      .flatMap((l) => l.questions)
      .map((q) => q.imageUri)
      .filter((uri): uri is string => !!uri);
    if (uris.length === 0) return;
    const first = uris.slice(0, PRELOAD_MIN_LOGOS);
    const rest = uris.slice(PRELOAD_MIN_LOGOS);
    await ExpoImage.prefetch(first, { cachePolicy: 'memory-disk' }).catch(() => {});
    if (rest.length > 0) {
      ExpoImage.prefetch(rest, { cachePolicy: 'memory-disk' }).catch(() => {});
    }
  } catch {
    // Fail-open: never block the splash on a preload/sync error.
  }
}

export default function LogoQuizSplash() {
  const labels = useLQLabels();
  const { locale } = useLocale();

  const wordOpacity = useSharedValue(0);
  const wordScale = useSharedValue(0.92);
  const tagOpacity = useSharedValue(0);

  useEffect(() => {
    wordOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    tagOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    let alive = true;
    // Warm caches in the BACKGROUND — never block navigation on them, so the
    // splash always lasts exactly SPLASH_MS. Bundled Welcome art is local/fast;
    // the remote brand logos keep warming even after we navigate (expo-image's
    // cache is global, so tiles decoded post-navigation still land warm).
    Asset.loadAsync(WELCOME_ASSETS).catch(() => {});
    prefetchLogoQuizLogos(locale);

    const timer = setTimeout(() => {
      if (alive) router.replace('/logo-quiz');
    }, SPLASH_MS);

    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ scale: wordScale.value }],
  }));
  const tagStyle = useAnimatedStyle(() => ({ opacity: tagOpacity.value }));

  return (
    <View style={[styles.fill, { backgroundColor: BG_BASE }]}>
      <AppBackground />
      <StatusBar style="dark" />

      <View style={styles.center}>
        <Animated.View style={[styles.wordmark, wordStyle]}>
          {LETTERS.map((ch, i) => {
            // Highlight the three middle Z's (indices 3–5) in the brand purple.
            const isAccent = i >= 3 && i <= 5;
            return (
              <Text key={i} style={[styles.letter, isAccent && styles.letterAccent]}>
                {ch}
              </Text>
            );
          })}
        </Animated.View>
        <Animated.Text style={[styles.tagline, tagStyle]}>{labels.tagline}</Animated.Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 14 },
  wordmark: { flexDirection: 'row', alignItems: 'center' },
  // Light-theme wordmark: dark-grey QUI/ES and purple ZZZ on the pale periwinkle
  // backdrop (matches the shared splash's Logo Quiz variant).
  letter: {
    fontSize: 56,
    fontWeight: '900',
    color: '#4A4A5E',
    letterSpacing: 2,
  },
  letterAccent: {
    color: '#7C5CFF',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5A5A6E',
    letterSpacing: 0.4,
  },
});
