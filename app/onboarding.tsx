import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageSourcePropType,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/screen-background';
import { revenueCatEnabled } from '@/lib/revenuecat';
import { useContentCache } from '@/hooks/use-content-cache';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useThemePref } from '@/hooks/use-theme-pref';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';
import type { StringKey } from '@/i18n/strings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PageDef {
  iconCenter: ImageSourcePropType;
  iconOrbit: ImageSourcePropType[];
  titleKey: StringKey;
  subtitleKey: StringKey;
}

const PAGES: PageDef[] = [
  {
    iconCenter: require('@/assets/onboarding/trophy.png'),
    iconOrbit: [
      require('@/assets/onboarding/light-bulb.png'),
      require('@/assets/onboarding/books.png'),
      require('@/assets/onboarding/question.png'),
      require('@/assets/onboarding/sparkles.png'),
      require('@/assets/onboarding/brain.png'),
      require('@/assets/onboarding/star.png'),
    ],
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    iconCenter: require('@/assets/onboarding/globe.png'),
    iconOrbit: [
      require('@/assets/onboarding/palette.png'),
      require('@/assets/onboarding/atom.png'),
      require('@/assets/onboarding/open-book.png'),
      require('@/assets/onboarding/classical-building.png'),
      require('@/assets/onboarding/clapper.png'),
      require('@/assets/onboarding/soccer.png'),
    ],
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    iconCenter: require('@/assets/onboarding/bar-chart.png'),
    iconOrbit: [
      require('@/assets/onboarding/fire.png'),
      require('@/assets/onboarding/star.png'),
      require('@/assets/onboarding/medal.png'),
      require('@/assets/onboarding/target.png'),
      require('@/assets/onboarding/gem.png'),
      require('@/assets/onboarding/rocket.png'),
    ],
    titleKey: 'onboarding.page3.title',
    subtitleKey: 'onboarding.page3.subtitle',
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { markSeen } = useOnboarding();
  const { snapshot } = useContentCache();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { theme } = useThemePref();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // Latest snapshot, readable inside the async navigation wait below without
  // stale-closure issues.
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const isLast = page === PAGES.length - 1;

  // The forced post-onboarding paywall is capability-gated: shown only when
  // store billing is actually enabled on this platform (revenueCatEnabled) AND
  // the per-platform backend flag is true (iOS reads show_paywall_ios, Android
  // reads show_paywall_android). Gating on revenueCatEnabled guarantees a
  // paywall is never forced on a platform that cannot charge — so iOS stays
  // safe until its RevenueCat key is provided.
  //
  // The content sync surfaces the `app` config as soon as its JSON arrives
  // (well within the splash), so the flag is normally ready by the time
  // onboarding ends. As a safety net for a slow first-launch network, briefly
  // wait for the snapshot before deciding rather than defaulting to home the
  // instant it's still null. Bounded so we never hang offline.
  async function destinationAfterOnboarding(): Promise<'/paywall' | '/'> {
    const deadline = Date.now() + 4000;
    while (!snapshotRef.current && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const app = snapshotRef.current?.app;
    const platformFlag =
      Platform.OS === 'ios' ? app?.show_paywall_ios : app?.show_paywall_android;
    const goPaywall = revenueCatEnabled && platformFlag === true;
    return goPaywall ? '/paywall' : '/';
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== page) {
      setPage(next);
    }
  }

  async function onPrimaryPress() {
    if (isLast) {
      await markSeen();
      router.replace(await destinationAfterOnboarding());
      return;
    }
    const next = page + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setPage(next);
  }

  async function onSkip() {
    await markSeen();
    router.replace(await destinationAfterOnboarding());
  }

  return (
    <ScreenBackground>
      {page === 0 && (
        <Pressable
          onPress={() => router.replace('/language')}
          style={styles.back}
          hitSlop={10}
          accessibilityLabel="Back to language picker"
          testID="onboarding-back"
        >
          <IconSymbol name="chevron.left" size={26} color={colors.textMuted} />
        </Pressable>
      )}

      <Pressable onPress={onSkip} style={styles.skip} hitSlop={10}>
        <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {PAGES.map((p, i) => (
          <PageView key={i} page={p} />
        ))}
      </ScrollView>

      <View style={styles.bottomSlot} pointerEvents="box-none">
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.buttonWrap}>
          <Pressable
            onPress={onPrimaryPress}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            testID="onboarding-primary"
          >
            <Text style={styles.buttonText}>
              {isLast ? t('onboarding.start') : t('onboarding.next')}
            </Text>
          </Pressable>
        </View>
      </View>

      {theme === 'dark' && <Stars />}
    </ScreenBackground>
  );
}

function PageView({ page }: { page: PageDef }) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const orbits = useMemo(
    () =>
      page.iconOrbit.map((src, i) => {
        const angle = (i / page.iconOrbit.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 120;
        return {
          src,
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
        };
      }),
    [page.iconOrbit],
  );

  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.illustration}>
        <Image source={page.iconCenter} style={styles.centerIcon} resizeMode="contain" />
        {orbits.map((o, i) => (
          <Image
            key={i}
            source={o.src}
            style={[
              styles.orbitIcon,
              { transform: [{ translateX: o.x }, { translateY: o.y }] },
            ]}
            resizeMode="contain"
          />
        ))}
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{t(page.titleKey)}</Text>
        <Text style={styles.subtitle}>{t(page.subtitleKey)}</Text>
      </View>
    </View>
  );
}

function Stars() {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  // Decorative twinkle layer; pure CSS-style positioning, non-interactive.
  const positions = [
    { top: 60, left: 30, size: 3 },
    { top: 90, left: '70%' as const, size: 2 },
    { top: 140, left: '20%' as const, size: 2 },
    { top: 180, right: 40, size: 4 },
    { top: 220, left: '50%' as const, size: 2 },
    { top: 280, left: 50, size: 2 },
    { top: 330, right: 70, size: 3 },
    { top: 380, left: '40%' as const, size: 2 },
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

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  back: {
    position: 'absolute',
    top: 56,
    left: 14,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skip: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    color: c.textFaint,
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 220,
    paddingHorizontal: 32,
    gap: 16,
  },
  illustration: {
    width: 280,
    height: 280,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerIcon: {
    width: 140,
    height: 140,
  },
  orbitIcon: {
    position: 'absolute',
    width: 56,
    height: 56,
  },
  copy: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: c.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.borderStrong,
  },
  dotActive: {
    backgroundColor: c.text,
    width: 24,
  },
  buttonWrap: {
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: c.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: c.onAccent,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff66',
  },
});
