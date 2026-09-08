import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { ScreenBackground } from '@/components/screen-background';
import { T_ASSET_SLOTS, type TAssetSlot } from '@/constants/t/asset-slots';
import { revenueCatEnabled } from '@/lib/revenuecat';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';
import type { StringKey } from '@/i18n/strings';

/**
 * The configurable template's onboarding, and the first real consumer of the
 * bundled image slots (constants/t/asset-slots.ts).
 *
 * It exists as much for the artwork as for the flow. Before it, nothing under
 * `app/t` rendered a single bundled picture — every image on the home screen is
 * a remote `icon_url` — so the pack mechanism would have had slots with no
 * reader: a contract that compiles, ships, and means nothing. Four of the five
 * slots are drawn here.
 *
 * MODELLED ON app/onboarding.tsx, NOT SHARED WITH IT
 * --------------------------------------------------
 * Same reasoning already recorded for app/t/index.tsx in
 * docs/configurable-template.md. The Erudite screen is shipped, largely
 * untested code carrying its own concerns — a language-picker back button, a
 * content-snapshot wait, the per-platform forced-paywall gate — none of which
 * belong to a template whose whole point is that an operator configures it.
 * Extracting a shared component would mean editing a file five live apps render
 * in order to add a sixth caller. The structure is copied; the code is not.
 *
 * Colours come exclusively from useTemplateTheme(), like everywhere in `/t`
 * (__tests__/app/t-no-color-literals.test.ts and an eslint rule both enforce it).
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideDef {
  slot: TAssetSlot;
  titleKey: StringKey;
  subtitleKey: StringKey;
}

/**
 * The three intro slides. Keys are the existing `onboarding.*` set, which is
 * already complete in all four locales — the template introduces no new copy.
 */
const SLIDES: SlideDef[] = [
  {
    slot: 'onboarding/step1.png',
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    slot: 'onboarding/step2.png',
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    slot: 'onboarding/step3.png',
    titleKey: 'onboarding.page3.title',
    subtitleKey: 'onboarding.page3.subtitle',
  },
];

/** Slides plus the closing premium pitch, which owns the `paywall/hero` slot. */
const SLIDE_COUNT = SLIDES.length + 1;

export default function TTemplateOnboarding() {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { markSeen } = useOnboarding();
  const { t } = useTranslation();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const isPremiumSlide = page === SLIDE_COUNT - 1;
  // The closing slide only sells anything where a store can actually charge.
  // Without billing it degrades to a plain "get started", the same
  // capability-driven gating the Erudite flow uses — a build that cannot take
  // money must never show a pitch a reviewer would then be unable to complete.
  const offersPremium = isPremiumSlide && revenueCatEnabled;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== page) setPage(next);
  }

  /**
   * Leave onboarding for good.
   *
   * markSeen() is awaited BEFORE navigating on every path, the paywall included,
   * and that ordering is deliberate rather than tidy. The paywall is PUSHED, not
   * replaced, so this screen stays mounted underneath it — and a player who
   * dismisses the paywall lands on /t, which is a fresh navigation rather than a
   * pop back to here. Marking first is what makes that a normal return home
   * instead of a second trip through onboarding: the flag is already written by
   * the time any of those transitions can run, whatever order they arrive in.
   *
   * (Until app/t/paywall.tsx existed this ordering also papered over a harder
   * bug — the Erudite paywall exits via `router.replace('/')`, which on a
   * template build redirects to /t/splash and sent the player back through the
   * splash. The ported paywall exits to '/t' directly, so that hazard is gone.)
   */
  async function leave(to: '/t' | '/t/paywall') {
    await markSeen();
    if (to === '/t/paywall') {
      router.push(to);
      return;
    }
    router.replace(to);
  }

  async function onPrimaryPress() {
    if (isPremiumSlide) {
      await leave(offersPremium ? '/t/paywall' : '/t');
      return;
    }
    const next = page + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setPage(next);
  }

  const primaryLabel = offersPremium
    ? t('paywall.cta')
    : isPremiumSlide
      ? t('onboarding.start')
      : t('onboarding.next');

  return (
    <ScreenBackground>
      <Pressable onPress={() => leave('/t')} style={styles.skip} hitSlop={10} testID="t-onboarding-skip">
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
        {SLIDES.map((slide) => (
          <View key={slide.slot} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <Image
              source={T_ASSET_SLOTS[slide.slot]}
              style={styles.slideArt}
              resizeMode="contain"
              testID={`t-onboarding-art-${slide.slot}`}
            />
            <View style={styles.copy}>
              <Text style={styles.title}>{t(slide.titleKey)}</Text>
              <Text style={styles.subtitle}>{t(slide.subtitleKey)}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <Image
            source={T_ASSET_SLOTS['paywall/hero.png']}
            style={styles.heroArt}
            resizeMode="contain"
            testID="t-onboarding-art-paywall/hero.png"
          />
          {/* Brand-neutral copy on purpose. `paywall.title` reads "Quizzzes
              Premium" in every locale, and this template ships under whatever
              name an operator gives it — so the pitch borrows the two existing
              keys that name a benefit rather than a brand. No new strings. */}
          <View style={styles.copy}>
            <Text style={styles.title}>{t('paywall.subtitle')}</Text>
            <Text style={styles.subtitle}>{t('paywall.feature.unlimited')}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomSlot} pointerEvents="box-none">
        <View style={styles.dots}>
          {Array.from({ length: SLIDE_COUNT }, (_, i) => (
            <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.buttonWrap}>
          <Pressable
            onPress={onPrimaryPress}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            testID="t-onboarding-primary"
          >
            <Text style={styles.buttonText}>{primaryLabel}</Text>
          </Pressable>
        </View>
      </View>
    </ScreenBackground>
  );
}

const makeStyles = (c: EruditePalette) =>
  StyleSheet.create({
    skip: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    skipText: { color: c.textFaint, fontSize: 14, fontWeight: '500' },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1 },
    page: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 60,
      paddingBottom: 220,
      paddingHorizontal: 32,
      gap: 28,
    },
    slideArt: { width: 200, height: 200 },
    // The hero is authored 4:3 rather than square, so it gets its own box.
    heroArt: { width: 280, height: 210 },
    copy: { alignItems: 'center', gap: 12, maxWidth: 320 },
    title: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    subtitle: { fontSize: 15, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
    bottomSlot: { position: 'absolute', left: 0, right: 0, bottom: 40, gap: 24 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.borderStrong },
    dotActive: { backgroundColor: c.text, width: 24 },
    buttonWrap: { paddingHorizontal: 24 },
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
    buttonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
    buttonText: { color: c.onAccent, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 },
  });
