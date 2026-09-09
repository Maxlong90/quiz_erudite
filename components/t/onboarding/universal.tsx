import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { T_ASSET_SLOTS } from '@/constants/t/asset-slots';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { withAlpha } from '@/lib/theme/color';
import type { EruditePalette } from '@/constants/theme';
import type { TOnboardingVariantProps } from '@/components/t/onboarding/contract';

/**
 * The `universal` onboarding variant: ONE page at a time, cross-faded, with a
 * tappable filmstrip of the steps and a segmented progress bar above the button.
 *
 * It is not a restyle of `classic` and it is deliberately not one. `classic`
 * mounts all four pages side by side in a pagingEnabled ScrollView and moves the
 * viewport; this one mounts exactly the page it was given and lets React swap the
 * subtree. Everything that follows is downstream of that single decision — there
 * is no scroll offset to reconcile, so there is no `settledPage` bookkeeping, no
 * ref, no effect and no state of any kind here. The page is a pure function of
 * the `page` prop.
 *
 * WHAT IT LOOKS LIKE, AND WHY THE DIFFERENCE IS FREE
 * -------------------------------------------------
 * The two variants draw the same five bundled slots and the same six bundled
 * strings — an operator swapping `onboarding_type` gets a different SHAPE, not
 * different content, and needs no new artwork and no new copy to do it. Where
 * `classic` centres a 200pt picture over centred text, this one seats a 208pt
 * picture inside a round plate tinted with the operator's own `accent` and sets
 * the copy LEFT, larger, under a numeric eyebrow. The button is a square-ish
 * radius-16 slab with no glow against `classic`'s radius-28 pill, and skip is a
 * centred link in the footer rather than a corner button. Same tokens throughout,
 * so both shapes repaint with the preset.
 *
 * THE ANIMATION MAY NOT GATE A MOUNT
 * ----------------------------------
 * `key={page}` is what makes the swap happen: React reconciles a new subtree in
 * the same commit, and `entering` merely decorates a mount that has already
 * occurred. So the picture and the copy are on screen synchronously whether
 * Reanimated runs, is mocked, or is disabled by a reduce-motion setting. There is
 * deliberately no `exiting` — it would keep the outgoing page mounted, putting two
 * `t-onboarding-art-<slot>` nodes on screen at once ON DEVICE ONLY, since the
 * repo's Reanimated test double ignores `exiting` entirely and every assertion
 * would stay green. Against a static gradient the cut is indistinguishable.
 *
 * It is CONTROLLED and it decides nothing: no markSeen(), no billing check, no
 * router. See components/t/onboarding/contract.ts for why that line is drawn
 * where it is, and note in particular that `primaryLabel` is rendered verbatim.
 */

/** '01', '04' — a two-digit counter reads as a set rather than as a number. */
function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function OnboardingUniversal({
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
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  /**
   * TOTAL, and synchronous. Any `page` outside the step range — including a
   * negative one, or one past `pageCount` — resolves to the closing premium
   * pitch rather than indexing off the end of `steps` and throwing. The host is
   * the only thing that sets `page` and it never goes out of range, but a variant
   * that crashes on a value it was handed would take the whole flow down.
   */
  const step = page >= 0 && page < steps.length ? steps[page] : null;
  const slot = step ? step.slot : premiumSlot;
  const titleKey = step ? step.titleKey : premiumTitleKey;
  const subtitleKey = step ? step.subtitleKey : premiumSubtitleKey;

  // A template literal, not a `' / '` constant: __tests__/app/t-routes.test.ts
  // scans this tree for quoted strings that begin with a slash and would read a
  // bare '/' as a route escaping the template.
  const counter = `${pad(Math.min(page + 1, pageCount))} / ${pad(pageCount)}`;

  return (
    <View style={styles.variant} testID="t-onboarding-variant-universal">
      <Animated.View key={page} entering={FadeIn.duration(240)} style={styles.stage}>
        {step ? (
          <View style={styles.plate}>
            <Image
              source={T_ASSET_SLOTS[slot]}
              style={styles.stepArt}
              resizeMode="contain"
              testID={`t-onboarding-art-${slot}`}
            />
          </View>
        ) : (
          <Image
            source={T_ASSET_SLOTS[slot]}
            style={styles.heroArt}
            resizeMode="cover"
            testID={`t-onboarding-art-${slot}`}
          />
        )}

        <View style={step ? styles.copy : [styles.copy, styles.premiumCard]}>
          <Text style={styles.counter}>{counter}</Text>
          <Text style={styles.title}>{t(titleKey)}</Text>
          <Text style={styles.subtitle}>{t(subtitleKey)}</Text>
        </View>
      </Animated.View>

      <View style={styles.footer}>
        {/**
         * The filmstrip covers the STEPS only, never the closing pitch, so a tap
         * can only ever move backwards or sideways through the intro — the
         * premium page stays reachable exclusively through the primary button
         * and the capability gate that computes its label.
         *
         * A different testID prefix is mandatory, not cosmetic: these draw the
         * same three slots a second time, and getByTestId throws on duplicates.
         */}
        <View style={styles.filmstrip}>
          {steps.map((thumbStep, i) => (
            <Pressable
              key={thumbStep.slot}
              // Guarded AND disabled, so "never acknowledge a page the host set"
              // is structurally unbreakable rather than merely observed.
              onPress={() => {
                if (i !== page) onPageChange(i);
              }}
              disabled={i === page}
              accessibilityRole="button"
              accessibilityState={{ selected: i === page }}
              // 38pt is under the 44pt minimum target; this is what closes it.
              hitSlop={8}
              style={[
                styles.thumb,
                i === page ? styles.thumbActive : i < page ? styles.thumbDone : styles.thumbTodo,
              ]}
              testID={`t-onboarding-thumb-${thumbStep.slot}`}
            >
              <Image
                source={T_ASSET_SLOTS[thumbStep.slot]}
                style={styles.thumbArt}
                resizeMode="contain"
              />
            </Pressable>
          ))}
        </View>

        <View style={styles.progress}>
          {Array.from({ length: pageCount }, (_, i) => (
            // Only the active segment is addressable — same rule the classic
            // dots follow, and the reason inactive ones carry no testID at all:
            // `undefined` is unmatchable by RNTL rather than merely unmatched.
            <View
              key={i}
              style={[styles.segment, i === page && styles.segmentActive]}
              testID={i === page ? `t-onboarding-page-${i}` : undefined}
            />
          ))}
        </View>

        <Pressable
          onPress={onPrimaryPress}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          testID="t-onboarding-primary"
        >
          <Text style={styles.buttonText}>{primaryLabel}</Text>
        </Pressable>

        {/* Outside the keyed stage on purpose: skip has to be present on every
            page, the closing pitch included, and remounting it per page would
            make it flicker along with the artwork. */}
        <Pressable onPress={onSkip} style={styles.skip} hitSlop={10} testID="t-onboarding-skip">
          <Text style={styles.skipText}>{skipLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Fixed paddings rather than safe-area insets, exactly as classic.tsx does.
 * react-native-safe-area-context is NOT mocked by the variant suite, and calling
 * useSafeAreaInsets() without a provider throws — which would take down every
 * variant's cases, not just this file's.
 */
const makeStyles = (c: EruditePalette) =>
  StyleSheet.create({
    variant: { flex: 1 },
    stage: { flex: 1, justifyContent: 'center', paddingTop: 56, paddingHorizontal: 28, gap: 30 },
    // The operator's accent becomes the motif rather than just the button.
    plate: {
      width: 264,
      height: 264,
      borderRadius: 132,
      alignSelf: 'center',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(c.accent, 0.12),
      borderWidth: 1,
      borderColor: withAlpha(c.accent, 0.28),
    },
    stepArt: { width: 208, height: 208 },
    // The hero is authored 4:3 and cropped wide here, so the pitch reads as a
    // banner rather than as a fourth step.
    heroArt: { width: '100%', height: 236, borderRadius: 20 },
    copy: { gap: 10 },
    premiumCard: {
      backgroundColor: c.accentBg,
      borderColor: c.accentBorderSoft,
      borderWidth: 1,
      borderRadius: 18,
      padding: 16,
    },
    counter: { color: c.accentSoft, fontSize: 12, fontWeight: '800', letterSpacing: 2.4 },
    title: { fontSize: 34, fontWeight: '900', color: c.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 16, lineHeight: 24, color: c.textMuted },
    footer: { paddingHorizontal: 28, paddingBottom: 28, gap: 18 },
    filmstrip: { flexDirection: 'row', gap: 10 },
    thumb: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    thumbActive: { borderColor: c.accent, backgroundColor: withAlpha(c.accent, 0.18) },
    thumbDone: { borderColor: withAlpha(c.accent, 0.35), opacity: 0.7 },
    thumbTodo: { borderColor: c.borderSoft, opacity: 0.3 },
    thumbArt: { width: 26, height: 26 },
    progress: { flexDirection: 'row', gap: 6 },
    segment: { flex: 1, height: 3, borderRadius: 2, backgroundColor: c.borderStrong },
    segmentActive: { backgroundColor: c.accent },
    button: {
      backgroundColor: c.accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      // Radius 16 and a flat elevation, against classic's radius-28 pill with an
      // accent glow. Shape is what tells the two variants apart at a glance —
      // borrowing an icon for the job would give this file a dependency classic
      // does not have, and force a new jest.mock into three suites.
      borderRadius: 16,
      elevation: 4,
    },
    buttonPressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
    buttonText: { color: c.onAccent, fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
    skip: { alignSelf: 'center', paddingVertical: 6, paddingHorizontal: 12 },
    skipText: { color: c.textFaint, fontSize: 14, fontWeight: '600' },
  });
