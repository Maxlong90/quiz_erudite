import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';

/**
 * Wide glossy-blue action button — the same design language as the home Play
 * button and the Settings / Shop icon tiles (blue gradient, top gloss band,
 * navy rim, navy label). Used for the Settings screen rows. `inactive` dims it
 * for actions that currently do nothing; an optional leading `icon` (e.g. a
 * language flag) sits before the label.
 */
export function GlossyButton({
  label,
  onPress,
  icon,
  inactive,
  fontSize = 20,
}: {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  inactive?: boolean;
  fontSize?: number;
}) {
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      style={({ pressed }) => pressed && !inactive && styles.pressed}
    >
      <LinearGradient
        colors={[FQColors.tileLight, FQColors.tileDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, FQShadow.card, inactive && styles.inactive]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
          style={styles.gloss}
          pointerEvents="none"
        />
        {icon}
        <Text
          style={[styles.text, { fontSize }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  gloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  text: { color: FQColors.tileGlyph, fontWeight: '900' },
  inactive: { opacity: 0.45 },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
