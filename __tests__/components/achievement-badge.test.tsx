/**
 * AchievementBadge (components/achievements/achievement-badge.tsx) — the badge
 * gradient FALLBACK, after task Э7-A replaced its hardcoded violet-to-blue pair
 * with the live accent tokens.
 *
 * WHY THIS SUITE EXISTS FOR AN UNREACHABLE BRANCH
 * -----------------------------------------------
 * All seven entries in lib/achievements.ts define their own `gradient`, so
 * `def.gradient ?? [...]` never takes the right-hand side in the shipped app —
 * which is exactly why the swap was safe to make, and exactly why nothing would
 * notice if it were wrong. The branch is reachable only by a FUTURE catalog
 * entry that omits its gradient, and on that day the fallback needs to already
 * be a token rather than a stale blue that ignores the operator's palette.
 *
 * So the contract locked in here is three-part:
 *  - the shipped path is UNCHANGED: a catalog entry still paints its own ramp;
 *  - the fallback is THEMED, not merely different — it follows the appearance,
 *    which is the property that distinguishes a token from a swapped constant;
 *  - the catalog invariant that makes the first point true is asserted rather
 *    than assumed, so "the branch is unreachable" cannot quietly stop being true
 *    without this suite explaining why it now matters.
 *
 * The badge is NOT part of the app/t surface, so the no-colour-literal scan does
 * not reach it (see __tests__/app/t-no-color-literals.test.ts, where it sits in
 * AHEAD_OF_THE_WALK until the ported results screen imports it). This suite is
 * the only thing covering the change until then.
 *
 * expo-linear-gradient is mocked to a plain View so the `colors` prop — which IS
 * the assertion here — stays readable in the rendered tree.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

import { AchievementBadge } from '@/components/achievements/achievement-badge';
import { EruditeColors } from '@/constants/theme';
import { ThemePrefProvider } from '@/hooks/use-theme-pref';
import { ACHIEVEMENTS, type AchievementDef, type AchievementProgress } from '@/lib/achievements';

/** The appearance key ThemePrefProvider reads on mount (hooks/use-theme-pref.ts). */
const THEME_KEY = 'app.theme.v1';

/** A shipped catalog entry, and the same entry with its gradient taken away. */
const CATALOG_ENTRY = ACHIEVEMENTS[0];
const WITHOUT_GRADIENT: AchievementDef = { ...CATALOG_ENTRY, gradient: undefined };

function progressFor(def: AchievementDef, level: number): AchievementProgress {
  return { def, value: 0, level } as AchievementProgress;
}

function renderBadge(def: AchievementDef, level = 1) {
  return render(
    <ThemePrefProvider>
      <AchievementBadge progress={progressFor(def, level)} />
    </ThemePrefProvider>,
  );
}

/** The `colors` prop of the gradient the badge renders, or null when it renders none. */
function gradientColors(screen: ReturnType<typeof render>): unknown {
  const [node] = screen.UNSAFE_root.findAll(
    (candidate) => Array.isArray(candidate.props?.colors),
  );
  return node ? node.props.colors : null;
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('AchievementBadge gradient', () => {
  it('every shipped catalog entry supplies its own gradient', () => {
    // This is what makes the fallback unreachable today, and therefore what made
    // the token swap a zero-pixel change. If an entry ever lands without one,
    // this goes red and points at the fallback assertions below as the new
    // shipped behaviour to review.
    const missing = ACHIEVEMENTS.filter((def) => def.gradient === undefined).map((def) => def.id);
    expect(missing).toEqual([]);
    expect(ACHIEVEMENTS.length).toBeGreaterThan(0);
  });

  it('still paints a catalog entry with its own ramp, untouched', async () => {
    // The shipped path for all seven badges. The Э7-A change must be inert here.
    const screen = renderBadge(CATALOG_ENTRY);
    await waitFor(() => expect(gradientColors(screen)).toEqual(CATALOG_ENTRY.gradient));
  });

  it('falls back to the brand accent pair when an entry omits its gradient', async () => {
    const screen = renderBadge(WITHOUT_GRADIENT);
    await waitFor(() =>
      expect(gradientColors(screen)).toEqual([
        EruditeColors.dark.accent,
        EruditeColors.dark.accentSoft,
      ]),
    );
  });

  it('resolves that fallback against the LIVE appearance, not a frozen pair', async () => {
    // THE LOAD-BEARING ONE. Swapping a hardcoded blue for a hardcoded purple
    // would satisfy every assertion above. Only this one proves the fallback is
    // a token: under the light palette it must follow accentSoft from #a78bff to
    // #6a45f5, which no constant could do.
    await AsyncStorage.setItem(THEME_KEY, 'light');

    const screen = renderBadge(WITHOUT_GRADIENT);

    await waitFor(() =>
      expect(gradientColors(screen)).toEqual([
        EruditeColors.light.accent,
        EruditeColors.light.accentSoft,
      ]),
    );
    // Belt and braces: the two appearances really do differ here, so the
    // assertion above cannot pass by accident on an unchanged palette.
    expect(EruditeColors.light.accentSoft).not.toBe(EruditeColors.dark.accentSoft);
  });

  it('renders no gradient at all while the achievement is locked', async () => {
    // Level 0 takes an early return to a flat grey card. Asserted so the
    // fallback edit cannot leak a gradient into the locked state, which would
    // spoil the "what is still ahead of you" treatment.
    const screen = renderBadge(CATALOG_ENTRY, 0);
    await waitFor(() => expect(screen.UNSAFE_root).toBeTruthy());
    expect(gradientColors(screen)).toBeNull();
  });
});
