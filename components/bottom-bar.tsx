import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';

export type BottomBarKey = 'home' | 'premium' | 'account' | 'shop' | 'stats' | 'settings' | null;

interface Props {
  /** Which destination is currently on screen — that icon is brightened. */
  current?: BottomBarKey;
}

const REGULAR_SIZE = 24;
const HOME_SIZE = 32;

/**
 * Persistent app-wide bottom navigation. Order: [premium|account],
 * shop, HOME (bigger, center), stats, settings. The leftmost slot is
 * the gold "Get Premium" crown for free users (→ paywall) and turns
 * into a plain Account person once subscribed (→ account screen), so
 * the bar keeps its five-slot symmetry either way.
 */
export function BottomBar({ current = null }: Props) {
  const { isPremium } = usePremium();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.row}>
      {isPremium ? (
        <BarButton
          active={current === 'account'}
          onPress={() => router.replace('/account')}
          icon="person.fill"
          testID="account-button"
          accessibilityLabel="Account"
        />
      ) : (
        <BarButton
          active={current === 'premium'}
          onPress={() => router.push('/paywall')}
          icon="crown.fill"
          // Crown stays gold whether active or not — it's a brand colour.
          color={colors.gold}
          testID="crown-button"
          accessibilityLabel="Premium"
        />
      )}
      <BarButton
        active={current === 'shop'}
        onPress={() => router.replace('/shop')}
        icon="bag.fill"
        testID="shop-button"
        accessibilityLabel="Shop"
      />
      <BarButton
        active={current === 'home'}
        onPress={() => router.replace('/')}
        icon="house.fill"
        size={HOME_SIZE}
        testID="home-button"
        accessibilityLabel="Home"
      />
      <BarButton
        active={current === 'stats'}
        onPress={() => router.replace('/stats')}
        icon="chart.bar.fill"
        testID="stats-button"
        accessibilityLabel="Stats"
      />
      <BarButton
        active={current === 'settings'}
        onPress={() => router.replace('/settings')}
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
  const colors = useThemeColors();
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
