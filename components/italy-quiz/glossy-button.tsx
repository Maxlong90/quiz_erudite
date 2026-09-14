import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';

/**
 * How far the title may shrink to fit, and how far the SYSTEM font setting may
 * inflate it first. The pair has to be solved together, because
 * `adjustsFontSizeToFit` shrinks relative to the already system-scaled size:
 * the floor is `MIN_FONT_SCALE × fontSize × systemScale`, so a large enough
 * system scale drags the floor back above the width of the pill and the label
 * ellipsizes no matter how low the minimum goes.
 *
 * Measured on the real 360dp place card (~162dp of text width at the two-line
 * size of 17dp): the widest requirement line, Russian «Пройдите ещё 5 кругов»,
 * needs 0.827 of that size. So the constraint is
 * `MIN_FONT_SCALE × MAX_FONT_SCALE <= 0.827`; 0.6 × 1.3 = 0.78 clears it with
 * room to spare. Capping at 1.3 is a deliberate trade: this is a short action
 * label in a fixed-width pill, and a clipped label serves a low-vision reader
 * worse than a bounded one. Body copy elsewhere is NOT capped.
 */
const MIN_FONT_SCALE = 0.6;
const MAX_FONT_SCALE = 1.3;

/**
 * Wide glossy action button — the Flags Quiz GlossyButton recoloured to Italy
 * Quiz's saturated deep navy (same design as the home Play button and the Settings
 * gear tile): navy gradient, top gloss band, dark-navy rim, white label.
 *
 * - `sublabel`  — optional smaller line under the title.
 * - `icon`      — optional leading node (e.g. a language flag).
 * - `locked`    — dims the button, shows a trailing padlock, and disables it.
 * - `inactive`  — dims + disables without the padlock.
 *
 * `label` may contain "\n": the title honours as many lines as the string asks
 * for and shrinks them together (`adjustsFontSizeToFit`), which is what lets a
 * two-line caption survive a narrow phone and system font enlargement without
 * changing the button's height contract.
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
  // The padlock is absolutely positioned, so the flex layout does not know it is
  // there and a centred label simply runs underneath it — which is exactly how
  // the tail of the locked-city caption used to disappear. Reserve the icon's
  // width as padding on BOTH sides: symmetric, so the text stays optically
  // centred, and derived from `fontSize` because the icon is drawn at that size.
  const lockGutter = locked ? Math.round(fontSize) + 12 : 0;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => pressed && !disabled && styles.pressed}
    >
      <LinearGradient
        colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.btn,
          { paddingVertical, paddingHorizontal: 18 + lockGutter },
          ItalyShadow.card,
          disabled && styles.dimmed,
        ]}
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
            minimumFontScale={MIN_FONT_SCALE}
            maxFontSizeMultiplier={MAX_FONT_SCALE}
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
