import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePremium } from '@/hooks/use-premium';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import type { EruditePalette } from '@/constants/theme';

/**
 * RE-DECLARED, never re-exported from components/bottom-bar.tsx.
 *
 * `export type { BottomBarKey } from '@/components/bottom-bar'` looks like the
 * DRY move and is the one thing this file must not do. The import walk in
 * __tests__/app/t-no-color-literals.test.ts anchors its SPECIFIER regex on
 * `from`, so a type-only re-export is an ordinary graph edge: it would hold the
 * shared Erudite bar inside the /t import closure forever, defeating the guard
 * that proves the template stopped depending on it — and turning that guard red
 * in a way that invites deleting it rather than fixing this.
 *
 * The cost is type drift, and package.json ships no `tsc --noEmit` script to
 * catch it. __tests__/components/t-bottom-bar.test.tsx pays for it instead, by
 * comparing the two unions as source text.
 */
export type BottomBarKey = 'home' | 'premium' | 'account' | 'shop' | 'stats' | 'settings' | null;

interface Props {
  /** Which destination is currently on screen — that icon is brightened. */
  current?: BottomBarKey;
}

const REGULAR_SIZE = 24;
const HOME_SIZE = 32;

/**
 * The configurable template's persistent bottom navigation. Order:
 * [premium|account], shop, HOME (bigger, center), stats, settings. The leftmost
 * slot is the gold "Get Premium" crown for free users (→ paywall) and turns into
 * a plain Account person once subscribed (→ account screen), so the bar keeps
 * its five-slot symmetry either way.
 *
 * A COPY OF components/bottom-bar.tsx, WITH EXACTLY TWO CHANGES
 * ------------------------------------------------------------
 * 1. Every destination is a /t route. The shared bar sends its six slots to the
 *    ERUDITE '/account', '/paywall', '/shop', '/' , '/stats' and '/settings'.
 *    On a template build app/index.tsx redirects '/' to '/t/splash', so the
 *    shared bar never crashed and never dead-ended — tapping Home silently
 *    bounced the player through another brand's splash screen on the way to a
 *    screen wearing another brand's wordmark. That is only visible on a device,
 *    which is why __tests__/app/t-routes.test.ts now scans this file too.
 * 2. The palette arrives through useTemplateTheme(), at BOTH call sites — this
 *    component and BarButton below.
 *
 *    Switching only the outer one is COMPLETELY silent at runtime, and more
 *    silent than it first looks: a TemplateTheme is a pure superset of the
 *    palette, so both hooks return identical values for the four tokens this
 *    file reads. Every pixel would be the same, and no render assertion —
 *    including this component's own dark/light tint tests, verified — could tell
 *    the two apart. The only thing that catches it is the SOURCE rule in
 *    __tests__/app/t-no-color-literals.test.ts asserting that nothing under
 *    app/t or components/t imports '@/hooks/use-theme-colors'.
 *
 *    Which is exactly why the rule is worth having: the half-switched version is
 *    not a bug today, it is a bug the day the funnel starts doing something the
 *    raw hook does not, at which point one of these two call sites quietly stops
 *    following it.
 *
 * Everything else is verbatim, deliberately — the testIDs, the icon names, the
 * sizes, the hit slop, and the inert-active-slot pair below.
 *
 * WHY A COPY RATHER THAN A `basePath` PROP ON THE SHARED BAR
 * ----------------------------------------------------------
 * Five shipped Erudite screens render that component. Widening its signature
 * would make this addition read as a refactor of live code, and the bar is
 * exactly the sort of thing that becomes operator data later — an operator
 * shipping no shop wants four slots — which would push a slot-list union into a
 * component the shipped app depends on. docs/configurable-template.md records
 * the general line: a leaf with no route is SHARED, a leaf that ENCODES routes
 * is copied.
 *
 * NO OPERATOR PRESET REPAINTS THIS BAR TODAY, and that is not an oversight. It
 * reads four tokens — gold, text, textDisabled and border — and none of them is
 * in REMOTE_TOKEN_KEYS (lib/theme/contract.ts), which today carries ten of the
 * palette's thirty. The bar still reads the funnel, so it repaints the moment
 * task Э1 widens that set; the suite asserts the four-out-of-scope fact rather
 * than assuming it, and goes red to ask for the real repaint assertion.
 */
export function BottomBar({ current = null }: Props) {
  const { isPremium } = usePremium();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row} testID="bottom-bar">
      {isPremium ? (
        <BarButton
          active={current === 'account'}
          onPress={() => router.replace('/t/account')}
          icon="person.fill"
          testID="account-button"
          accessibilityLabel="Account"
        />
      ) : (
        <BarButton
          active={current === 'premium'}
          // The crown PUSHES where every other slot replaces: the paywall is
          // dismissible back onto whatever opened it, while replacing everywhere
          // else is what stops the bar growing the stack on every nav tap.
          onPress={() => router.push('/t/paywall')}
          icon="crown.fill"
          // Crown stays gold whether active or not — it's a brand colour.
          color={colors.gold}
          testID="crown-button"
          accessibilityLabel="Premium"
        />
      )}
      <BarButton
        active={current === 'shop'}
        onPress={() => router.replace('/t/shop')}
        icon="bag.fill"
        testID="shop-button"
        accessibilityLabel="Shop"
      />
      <BarButton
        active={current === 'home'}
        onPress={() => router.replace('/t')}
        icon="house.fill"
        size={HOME_SIZE}
        testID="home-button"
        accessibilityLabel="Home"
      />
      <BarButton
        active={current === 'stats'}
        onPress={() => router.replace('/t/stats')}
        icon="chart.bar.fill"
        testID="stats-button"
        accessibilityLabel="Stats"
      />
      <BarButton
        active={current === 'settings'}
        onPress={() => router.replace('/t/settings')}
        icon="gearshape.fill"
        testID="settings-button"
        accessibilityLabel="Settings"
      />
    </View>
  );
}

interface BarButtonProps {
  active: boolean;
  onPress: () => void;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
  color?: string;
  size?: number;
  testID?: string;
  accessibilityLabel?: string;
}

function BarButton({
  active,
  onPress,
  icon,
  color,
  size = REGULAR_SIZE,
  testID,
  accessibilityLabel,
}: BarButtonProps) {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const tint = color ?? (active ? colors.text : colors.textDisabled);
  return (
    <Pressable
      // The currently-displayed destination is a no-op: tapping the
      // active icon shouldn't push the same route again or even ripple
      // the pressed state, which would mislead the player into thinking
      // something is happening.
      onPress={active ? undefined : onPress}
      disabled={active}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && !active && styles.pressed]}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
    >
      <IconSymbol name={icon} size={size} color={tint} />
    </Pressable>
  );
}

// EruditePalette, not TemplateTheme, on purpose: a TemplateTheme structurally
// satisfies this signature, and widening it would falsely signal that the bar
// needs one of the derived tier roles. It does not.
const makeStyles = (c: EruditePalette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  button: {
    width: 56,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.5,
  },
});
