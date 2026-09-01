import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { AppBackground, BG_BASE } from '@/components/logo-quiz/app-background';
import { ScreenBackground } from '@/components/screen-background';
import { APP_SLUG } from '@/api/client';
import { loadCachedSnapshot, syncContent } from '@/lib/content-cache';
import { buildLevels, LOGO_QUIZ_SLUG } from '@/lib/logo-quiz/content';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLocale } from '@/hooks/use-locale';
import { useThemePref } from '@/hooks/use-theme-pref';
import { useTranslation } from '@/hooks/use-translation';

// Logo Quiz sits on a 3s splash (vs 2500ms elsewhere) — it doubles as the minimum
// window during which the first levels' brand logos are prefetched (see below).
const SPLASH_DURATION_MS = APP_SLUG === 'logo-quiz' ? 3000 : 2500;
// Never trap the user on the splash: navigate no later than this even if the
// logo preload is still running (slow network / huge catalog).
const SPLASH_HARD_CAP_MS = 10000;
// Guarantee at least the first 3 levels (15 logos each) are decoded before we
// leave the splash, so the first level opens with no visible image pop-in.
const PRELOAD_MIN_LOGOS = 45;
const ONBOARDING_SEEN_KEY = 'onboarding.seen.v1';
const LETTERS = ['Q', 'U', 'I', 'Z', 'Z', 'Z', 'E', 'S'] as const;

/**
 * Warm the Logo Quiz brand logos into expo-image's memory-disk cache during the
 * splash so the first level opens with no per-tile decode pop-in. The image
 * files are already on disk from content sync; this only warms the DECODE.
 *
 * Loads the cached snapshot directly (syncing if it's missing or for the wrong
 * locale), builds the levels, and prefetches every question's imageUri. The
 * first PRELOAD_MIN_LOGOS (3 levels) are awaited so the caller can gate the
 * splash on them; the rest are prefetched in the background so a large catalog
 * never delays the first screen. Fully fail-open — any error resolves quietly,
 * so the splash is never blocked by a preload/sync failure.
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
    // Await the first levels so navigation can gate on them; warm the rest in
    // the background without blocking.
    await ExpoImage.prefetch(first, { cachePolicy: 'memory-disk' }).catch(() => {});
    if (rest.length > 0) {
      ExpoImage.prefetch(rest, { cachePolicy: 'memory-disk' }).catch(() => {});
    }
  } catch {
    // Fail-open: never block the splash on a preload/sync error.
  }
}

export default function SplashScreen() {
  // The Logo Quiz build has its OWN splash (app/logo-quiz/splash.tsx). This
  // shared erudite splash is the root Stack's initialRoute, so WITHOUT this guard
  // it rendered FIRST for logo-quiz too — a brief "first" splash before the real
  // one (the double-splash the user saw), and on first run it even routed into
  // the erudite language picker. Redirect straight to the Logo Quiz splash so
  // this screen never renders for that build. APP_SLUG is a build-time constant,
  // so this early return is stable and never changes the hook order below.
  if (APP_SLUG === 'logo-quiz') {
    return <Redirect href="/logo-quiz/splash" />;
  }

  const { t } = useTranslation();
  const { theme } = useThemePref();
  // Called unconditionally to keep hook order stable across builds; only read
  // for the Logo Quiz tagline below.
  const lq = useLQLabels();
  const { locale } = useLocale();

  const wordmarkOpacity = useSharedValue(0);
  const wordmarkScale = useSharedValue(0.92);
  const taglineOpacity = useSharedValue(0);

  useEffect(() => {
    wordmarkOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    wordmarkScale.value = withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) });
    taglineOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    let cancelled = false;

    // The QUIZZES splash plays on every cold start. After it, branch on the
    // persisted `onboarding.seen.v1` flag: the first launch ever runs the full
    // first-run intro (language -> onboarding -> paywall -> home); every later
    // launch skips straight to home. So the language picker and the onboarding
    // carousel are shown exactly once, while the splash itself shows each launch.
    const navigate = async () => {
      if (cancelled) return;
      let seenOnboarding = false;
      try {
        seenOnboarding = (await AsyncStorage.getItem(ONBOARDING_SEEN_KEY)) === '1';
      } catch {
        seenOnboarding = false;
      }
      if (!cancelled) router.replace(seenOnboarding ? '/' : '/language');
    };

    // Non-logo-quiz builds keep the simple fixed-duration timer.
    if (APP_SLUG !== 'logo-quiz') {
      const timer = setTimeout(navigate, SPLASH_DURATION_MS);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }

    // Logo Quiz: leave the splash only after BOTH the 3s minimum AND the first
    // levels' logos are prefetched — but never later than the hard cap, so a slow
    // sync/prefetch can't trap the user.
    let navigated = false;
    let minId: ReturnType<typeof setTimeout>;
    let capId: ReturnType<typeof setTimeout>;
    const go = () => {
      if (navigated) return;
      navigated = true;
      navigate();
    };
    const minTimer = new Promise<void>((resolve) => {
      minId = setTimeout(resolve, SPLASH_DURATION_MS);
    });
    const hardCap = new Promise<void>((resolve) => {
      capId = setTimeout(resolve, SPLASH_HARD_CAP_MS);
    });
    Promise.race([
      Promise.all([minTimer, prefetchLogoQuizLogos(locale)]),
      hardCap,
    ]).then(go);

    return () => {
      cancelled = true;
      clearTimeout(minId);
      clearTimeout(capId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ scale: wordmarkScale.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  // Logo Quiz builds get the light brand palette; every other build keeps the
  // dark erudite splash. APP_SLUG is a build-time constant, so this branch is
  // stable across renders and lives *after* all hooks — hook order is untouched.
  const isLogoQuiz = APP_SLUG === 'logo-quiz';
  // Logo Quiz is always light; the erudite build follows the app appearance
  // preference. Both share the pale-lavender letter styles, so the light
  // wordmark variants are reused whenever either is true.
  const useLightWordmark = isLogoQuiz || theme === 'light';
  const letterStyle = useLightWordmark ? styles.letterLight : styles.letter;
  const accentStyle = useLightWordmark ? styles.letterAccentLight : styles.letterAccent;
  const taglineBaseStyle = useLightWordmark ? styles.taglineLight : styles.tagline;

  // The animated wordmark + tagline are identical across themes — only the
  // colours differ — so build the block once and drop it into either backdrop.
  const content = (
    <View style={styles.content}>
      <Animated.View style={[styles.wordmark, wordmarkStyle]}>
        {LETTERS.map((ch, i) => {
          // Highlight the three middle Z's in the brand purple so the
          // wordmark reads as QUI-ZZZ-ES, signalling the "quiz triple".
          const isAccent = i >= 3 && i <= 5;
          return (
            <Text key={i} style={[letterStyle, isAccent && accentStyle]}>
              {ch}
            </Text>
          );
        })}
      </Animated.View>

      <Animated.Text style={[taglineBaseStyle, taglineStyle]}>
        {isLogoQuiz ? lq.tagline : t('splash.tagline')}
      </Animated.Text>
    </View>
  );

  if (isLogoQuiz) {
    // Solid BG_BASE backing under the SVG mesh guarantees a full-screen light
    // fill with no dark flash before AppBackground paints. No <Stars /> — the
    // speckle overlay is tuned for the dark backdrop.
    return (
      <View style={[styles.flex, { backgroundColor: BG_BASE }]}>
        <AppBackground />
        <StatusBar style="dark" />
        {content}
      </View>
    );
  }

  return (
    <ScreenBackground>
      {content}

      {/* The speckle overlay is tuned for the dark backdrop only. */}
      {theme === 'dark' && <Stars />}
    </ScreenBackground>
  );
}

function Stars() {
  const positions = [
    { top: 80, left: 40, size: 3 },
    { top: 130, left: '70%' as const, size: 2 },
    { top: 200, left: '20%' as const, size: 2 },
    { top: 260, right: 40, size: 4 },
    { top: 360, left: '50%' as const, size: 2 },
    { top: 430, left: 50, size: 2 },
    { top: 500, right: 70, size: 3 },
    { top: 580, left: '40%' as const, size: 2 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {positions.map((p, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: p.top,
              left: 'left' in p ? p.left : undefined,
              right: 'right' in p ? p.right : undefined,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 14,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  letter: {
    fontSize: 56,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    // Soft glow so the wordmark reads on the dark backdrop.
    textShadowColor: 'rgba(124, 92, 255, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  letterAccent: {
    color: '#a78bff',
    textShadowColor: 'rgba(167, 139, 255, 0.85)',
    textShadowRadius: 22,
  },
  // Light-theme wordmark for the Logo Quiz build: dark-grey QUI/ES and purple
  // ZZZ that read on the pale periwinkle backdrop, with the dark-tuned glow
  // dropped entirely.
  letterLight: {
    fontSize: 56,
    fontWeight: '900',
    color: '#4A4A5E',
    letterSpacing: 2,
  },
  letterAccentLight: {
    color: '#7C5CFF',
  },
  tagline: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ffffffaa',
    letterSpacing: 0.4,
  },
  taglineLight: {
    fontSize: 16,
    fontWeight: '500',
    color: '#5A5A6E',
    letterSpacing: 0.4,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff66',
  },
});
