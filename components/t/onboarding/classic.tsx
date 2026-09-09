import { useEffect, useMemo, useRef } from 'react';
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

import { T_ASSET_SLOTS } from '@/constants/t/asset-slots';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import type { EruditePalette } from '@/constants/theme';
import type { TOnboardingVariantProps } from '@/components/t/onboarding/contract';

/**
 * The `classic` onboarding variant: a horizontal pager, one full-bleed picture
 * per page, dots and a single primary button pinned to the bottom.
 *
 * This is the screen the template has always shipped — the presentation half of
 * what used to be app/t/onboarding.tsx, moved here unchanged so that a second
 * variant can arrive as a pure presentation change. Every style value, every
 * testID and the whole page structure are the originals; the diff that created
 * this file was proven inert by __tests__/app/t-onboarding.test.tsx passing
 * without a single edit.
 *
 * It draws four pages: the three intro steps it is given, plus the closing
 * premium pitch. Colours come exclusively from useTemplateTheme(), like
 * everywhere in `/t` (__tests__/app/t-no-color-literals.test.ts and an eslint
 * rule both enforce it), and the artwork comes exclusively from T_ASSET_SLOTS —
 * this remains the biggest consumer of the bundled image slots.
 *
 * It is CONTROLLED and it decides nothing: no markSeen(), no billing check, no
 * router. See components/t/onboarding/contract.ts for why that line is drawn
 * where it is.
 */
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function OnboardingClassic({
  steps,
  premiumSlot,
  premiumTitleKey,
  premiumSubtitleKey,
  page,
  pageCount,
  primaryLabel,
  skipLabel,
  t,
  onPrimaryPress,
  onSkip,
  onPageChange,
}: TOnboardingVariantProps) {
  const scrollRef = useRef<ScrollView>(null);
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  /**
   * The page the LIST is on, as opposed to the page the host believes.
   *
   * Becoming controlled is the one behavioural change in the extraction, and it
   * needs this ref to come out behaviourally identical. Before the split the
   * scrollTo() sat inside the button handler, so it ran on a tap and on nothing
   * else. A bare `useEffect(scrollTo, [page])` is NOT the same thing twice over:
   * it fires on mount (a pointless animated scroll to x=0), and it fires on
   * gesture-driven changes too — a drag crosses Math.round() mid-swipe,
   * onPageChange tells the host, the host re-renders with a new `page`, and the
   * effect answers with an animated programmatic scroll fighting the player's
   * finger and the list's own momentum on a pagingEnabled pager.
   *
   * Neither misbehaviour is visible from Jest: the suite never dispatches a
   * scroll event, so the naive version stays green while the device regresses.
   * Seeding this ref with `page` makes mount a no-op, and writing it in onScroll
   * BEFORE reporting upward means the render that report triggers finds the
   * effect already satisfied. Net result: scrollTo() runs on a button press and
   * on nothing else, exactly as before. Please do not "simplify" it back.
   */
  const settledPage = useRef(page);

  useEffect(() => {
    if (settledPage.current === page) return;
    settledPage.current = page;
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
  }, [page]);

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next === page) return;
    settledPage.current = next;
    onPageChange(next);
  }

  /**
   * The root wrapper exists to carry the variant marker — a Fragment cannot hold
   * a testID, and these three children have no other common parent inside the
   * host's <ScreenBackground>. It is pixel-free: ScreenBackground is a
   * LinearGradient styled `{ flex: 1 }` with no padding, so a single `flex: 1`
   * child with no padding occupies exactly its box and the two absolutely
   * positioned children below resolve against an identical containing block.
   * Sibling order is preserved, so skip's zIndex still lifts it over the pager.
   */
  return (
    <View style={styles.variant} testID="t-onboarding-variant-classic">
      <Pressable onPress={onSkip} style={styles.skip} hitSlop={10} testID="t-onboarding-skip">
        <Text style={styles.skipText}>{skipLabel}</Text>
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
        {steps.map((step) => (
          <View key={step.slot} style={[styles.page, { width: SCREEN_WIDTH }]}>
            <Image
              source={T_ASSET_SLOTS[step.slot]}
              style={styles.slideArt}
              resizeMode="contain"
              testID={`t-onboarding-art-${step.slot}`}
            />
            <View style={styles.copy}>
              <Text style={styles.title}>{t(step.titleKey)}</Text>
              <Text style={styles.subtitle}>{t(step.subtitleKey)}</Text>
            </View>
          </View>
        ))}

        <View style={[styles.page, { width: SCREEN_WIDTH }]}>
          <Image
            source={T_ASSET_SLOTS[premiumSlot]}
            style={styles.heroArt}
            resizeMode="contain"
            testID={`t-onboarding-art-${premiumSlot}`}
          />
          <View style={styles.copy}>
            <Text style={styles.title}>{t(premiumTitleKey)}</Text>
            <Text style={styles.subtitle}>{t(premiumSubtitleKey)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomSlot} pointerEvents="box-none">
        <View style={styles.dots}>
          {Array.from({ length: pageCount }, (_, i) => (
            // Only the active dot is addressable: this variant mounts every page,
            // so no art testID says which one the player is actually looking at.
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
              testID={i === page ? `t-onboarding-page-${i}` : undefined}
            />
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
    </View>
  );
}

const makeStyles = (c: EruditePalette) =>
  StyleSheet.create({
    variant: { flex: 1 },
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
