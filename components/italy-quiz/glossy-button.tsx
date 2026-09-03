import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';

/**
 * Wide glossy action button — the Flags Quiz GlossyButton recoloured to Italy
 * Quiz's saturated deep navy (same design as the home Play button and the Settings
 * gear tile): navy gradient, top gloss band, dark-navy rim, white label.
 *
 * - `sublabel`  — optional smaller line under the title.
 * - `icon`      — optional leading node (e.g. a language flag).
 * - `locked`    — dims the button, shows a trailing padlock, and disables it.
 * - `inactive`  — dims + disables without the padlock.
 */
export function GlossyButton({
  label,
  sublabel,
  onPress,
  icon,
  locked,
  inactive,
  fontSize = 20,
  paddingVertical = 14,
}: {
  label: string;
  sublabel?: string;
  onPress: () => void;
  icon?: ReactNode;
  locked?: boolean;
  inactive?: boolean;
  fontSize?: number;
  paddingVertical?: number;
}) {
  const disabled = locked || inactive;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => pressed && !disabled && styles.pressed}
    >
      <LinearGradient
        colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.btn, { paddingVertical }, ItalyShadow.card, disabled && styles.dimmed]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          style={styles.gloss}
          pointerEvents="none"
        />
        {icon}
        <View style={styles.textCol}>
          <Text
            style={[styles.text, { fontSize }]}
            numberOfLines={label.split('\n').length}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {label}
          </Text>
          {sublabel ? <Text style={styles.sub}>{sublabel}</Text> : null}
        </View>
        {locked ? (
          <View style={styles.lockWrap} pointerEvents="none">
            <Ionicons name="lock-closed" size={fontSize} color={ItalyColors.tileGlyph} />
          </View>
        ) : null}
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
    borderColor: ItalyColors.tileRim,
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
  textCol: { alignItems: 'center', justifyContent: 'center', flexShrink: 1 },
  text: { color: ItalyColors.tileGlyph, fontWeight: '900', textAlign: 'center' },
  sub: {
    color: ItalyColors.tileGlyph,
    opacity: 0.85,
    fontWeight: '800',
    fontSize: 13,
    marginTop: 2,
  },
  dimmed: { opacity: 0.85 },
  lockWrap: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.99 }] },
});
