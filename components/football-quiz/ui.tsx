import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  FQColors,
  FQRadius,
  FQ_COIN_GRADIENT,
  FQ_FILL,
  FQ_GOLD_GRADIENT,
} from '@/constants/football-quiz/theme';

/**
 * Football Quiz shared UI kit — the "Gold on Haze" look locked in the design
 * review. Structurally this is Sport Quiz's ui.tsx (same primitives, same props)
 * with the neon-aqua palette swapped for a single gold accent.
 */

type IoniconName = keyof typeof Ionicons.glyphMap;

export const goldGlow = (radius = 14, opacity = 0.6) => ({
  shadowColor: FQColors.gold,
  shadowOpacity: opacity,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
});

/**
 * Round icon button — back / help / share / report / shop / settings.
 *
 * `glyphScale` is the glyph's share of the button diameter. It defaults to 0.5
 * (Sport Quiz's ratio); the "?" and "i" buttons pass 0.82 so the mark fills the
 * whole circle instead of sitting as a small ring inside the button.
 */
export function FQIconButton({
  glyph,
  onPress,
  size = 44,
  glyphScale = 0.5,
  ring = 2.5,
  badge,
}: {
  glyph: IoniconName;
  onPress: () => void;
  size?: number;
  glyphScale?: number;
  ring?: number;
  badge?: ReactNode;
}) {
  const r = size / 2;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <View
        style={[
          styles.iconBtn,
          { width: size, height: size, borderRadius: r, borderWidth: ring },
          goldGlow(12, 0.45),
        ]}
      >
        <Ionicons name={glyph} size={size * glyphScale} color={FQColors.goldLight} />
      </View>
      {badge != null && <View style={styles.badge}>{badge}</View>}
    </Pressable>
  );
}

/**
 * The currency icon — a minted RED coin with a star face. Red on purpose: gold
 * is the interface accent (rims, titles, CTAs), so a gold coin would read as
 * more chrome instead of a resource the player owns.
 */
export function CoinIcon({ size = 20, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  const rim = size * 0.62;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(1, size * 0.08),
          borderColor: FQColors.coinRim,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <LinearGradient
        colors={FQ_COIN_GRADIENT}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={{
          width: rim,
          height: rim,
          borderRadius: rim / 2,
          borderWidth: Math.max(1, size * 0.06),
          borderColor: 'rgba(255,255,255,0.55)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: '#FFE3E3', lineHeight: size * 0.5 }}>★</Text>
      </View>
    </View>
  );
}

/** Coin counter HUD pill (red coin + amount) on grey glass. */
export function CoinPill({ coins, size = 'md' }: { coins: number; size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <View style={[styles.coinPill, big && { paddingVertical: 8, paddingHorizontal: 16 }, goldGlow(10, 0.4)]}>
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.pill }]}
      />
      <CoinIcon size={big ? 24 : 20} />
      <Text style={[styles.coinText, big && { fontSize: 20 }]}>{coins.toLocaleString('ru-RU')}</Text>
    </View>
  );
}

/** Grey-glass surface with a gold rim — rows, cards, tiles. */
export function FQCard({
  children,
  style,
  dim,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  dim?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        dim ? { borderColor: FQColors.glassBorderDim, opacity: 0.75 } : goldGlow(12, 0.45),
        style,
      ]}
    >
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.lg }]}
      />
      {children}
    </View>
  );
}

/** Full-width glass pill row — the Settings list. */
export function FQPillRow({
  label,
  onPress,
  icon,
}: {
  label: string;
  onPress?: () => void;
  icon?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pillRow, goldGlow(10, 0.4), pressed && { opacity: 0.92 }]}
    >
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.pill }]}
      />
      {icon}
      <Text style={styles.pillRowText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Screen title. Sport Quiz uses its magenta accent here; Football Quiz has ONE
 * accent, so the title is gold too and separates itself by glow and weight
 * instead of by hue.
 */
export function ScreenTitle({ children, size = 26 }: { children: ReactNode; size?: number }) {
  return <Text style={[styles.screenTitle, { fontSize: size }]}>{children}</Text>;
}

/** Small section heading on a dark chip — the Shop's "Wheel" / "Coin Packs". */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.section}>{children}</Text>
    </View>
  );
}

/** Solid gold CTA with dark ink text — Buy, Spin, Skip, Back, Next. */
export function GoldCta({
  label,
  onPress,
  disabled,
  icon,
  iconRight,
  style,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IoniconName;
  iconRight?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.cta,
        !disabled && goldGlow(14, 0.6),
        { opacity: disabled ? 0.4 : pressed ? 0.88 : 1 },
        style,
      ]}
    >
      <LinearGradient colors={FQ_GOLD_GRADIENT} style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.pill }]} />
      {icon && !iconRight && <Ionicons name={icon} size={22} color={FQColors.ink} />}
      <Text style={styles.ctaText}>{label}</Text>
      {icon && iconRight && <Ionicons name={icon} size={22} color={FQColors.ink} />}
    </Pressable>
  );
}

/** Modal shell — grey glass card with a gold rim, used by the language / odds / report sheets. */
export function FQModalCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.modalCard, goldGlow(14, 0.5), style]}>
      <LinearGradient
        colors={[FQColors.glassStrong, FQColors.glass]}
        style={[StyleSheet.absoluteFill, { borderRadius: FQRadius.lg }]}
      />
      {children}
    </View>
  );
}

/** The wordmark: a gold bar, FOOTBALL in white, QUIZ tracked out in gold. */
export function FQLogo({ scale = 1 }: { scale?: number }) {
  return (
    <View style={styles.logoRow}>
      <LinearGradient colors={FQ_GOLD_GRADIENT} style={[styles.logoBar, { width: 5.2 * scale }]} />
      <View>
        <Text style={[styles.logoTop, { fontSize: 31 * scale, lineHeight: 33 * scale }]}>FOOTBALL</Text>
        <Text style={[styles.logoBottom, { fontSize: 18 * scale, letterSpacing: 8.45 * scale }]}>QUIZ</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: FQ_FILL,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
  },
  badge: { position: 'absolute', top: -6, right: -6 },

  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: FQRadius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
  },
  coinText: { color: FQColors.text, fontWeight: '900', fontSize: 16 },

  card: {
    borderRadius: FQRadius.lg,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    padding: 14,
  },

  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: FQRadius.pill,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    gap: 10,
  },
  pillRowText: { color: FQColors.text, fontWeight: '900', fontSize: 20 },

  screenTitle: {
    color: FQColors.goldLight,
    fontWeight: '900',
    letterSpacing: 0.5,
    textAlign: 'center',
    textTransform: 'uppercase',
    textShadowColor: FQColors.gold,
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },

  sectionWrap: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(10,12,14,0.66)',
    borderRadius: FQRadius.pill,
    paddingVertical: 7,
    paddingHorizontal: 15,
    marginBottom: 12,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255,201,60,0.47)',
  },
  section: {
    color: FQColors.goldLight,
    fontWeight: '900',
    fontSize: 19,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: FQColors.gold,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  cta: {
    flexDirection: 'row',
    borderRadius: FQRadius.pill,
    paddingVertical: 12,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  ctaText: { color: FQColors.ink, fontWeight: '900', fontSize: 18 },

  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: FQRadius.lg,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    padding: 20,
    gap: 10,
  },

  logoRow: { flexDirection: 'row', gap: 13, alignItems: 'stretch' },
  logoBar: { borderRadius: 3 },
  logoTop: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
  logoBottom: {
    color: FQColors.gold,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
});
