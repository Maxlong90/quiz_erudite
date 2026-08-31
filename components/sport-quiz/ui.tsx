import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';

/**
 * Sport Quiz shared UI kit — the locked "Aqua Neon Glass" look (home variant 1):
 * translucent navy-glass surfaces with a bright aqua neon rim + soft aqua glow,
 * aqua-tinted glyphs, near-white text. Every Sport Quiz screen (home, settings,
 * shop, wheel) is built from these primitives so the whole app is one surface.
 */

type IoniconName = keyof typeof Ionicons.glyphMap;

const NEON = SQColors.neon;
const TEXT = '#EAFFF8';

export const neonGlow = (color: string = NEON, radius = 16) => ({
  shadowColor: color,
  shadowOpacity: 0.7,
  shadowRadius: radius,
  shadowOffset: { width: 0, height: 0 },
  elevation: 8,
});

/** Full-width glass pill with an icon + label — the Play/Shop/Settings buttons. */
export function GlassPillButton({
  icon,
  label,
  fontSize = 32,
  onPress,
  style,
}: {
  icon: IoniconName;
  label: string;
  fontSize?: number;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        neonGlow(),
        { transform: [{ scale: pressed ? 0.98 : 1 }], opacity: pressed ? 0.92 : 1 },
        style,
      ]}
    >
      <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={StyleSheet.absoluteFill} />
      <View style={styles.pillRow}>
        {/* Icon pinned to a fixed-width left column so all three buttons' icons
            line up vertically; a matching right spacer keeps the label centred. */}
        <View style={styles.pillIconCol}>
          <Ionicons name={icon} size={fontSize * 1.15} color={NEON} />
        </View>
        <Text style={[styles.pillText, { fontSize }]}>{label}</Text>
        <View style={styles.pillIconCol} />
      </View>
    </Pressable>
  );
}

/** Round glass icon button (back / chrome). */
export function GlassIconButton({
  glyph,
  onPress,
  size = 48,
  badge,
}: {
  glyph: IoniconName;
  onPress: () => void;
  size?: number;
  badge?: ReactNode;
}) {
  const r = size / 2;
  return (
    <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}>
      <View style={[styles.iconBtn, { width: size, height: size, borderRadius: r }, neonGlow(NEON, 12)]}>
        <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={[StyleSheet.absoluteFill, { borderRadius: r }]} />
        <Ionicons name={glyph} size={size * 0.5} color={NEON} />
      </View>
      {badge != null && <View style={styles.badge}>{badge}</View>}
    </Pressable>
  );
}

/** Coin counter HUD pill (gold coin + amount) in the glass style. */
export function CoinPill({ coins, size = 'md' }: { coins: number; size?: 'md' | 'lg' }) {
  const big = size === 'lg';
  return (
    <View style={[styles.coinPill, big && { paddingVertical: 8, paddingHorizontal: 16 }, neonGlow(SQColors.coin, 10)]}>
      <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.pill }]} />
      <CoinIcon size={big ? 24 : 20} />
      <Text style={[styles.coinText, big && { fontSize: 20 }]}>{coins.toLocaleString()}</Text>
    </View>
  );
}

// Minted-gold-coin palette (identical to the Logo Quiz coin so both apps share
// the exact same currency icon).
const GOLD_GRADIENT = ['#FFD700', '#FFA000'] as const;
const GOLD_BORDER = '#E0930A';
const GOLD_TEXT = '#5A3D00';

/** The currency icon — a shiny minted gold coin with a ★ face (same as Logo Quiz). */
export function CoinIcon({ size = 20, style }: { size?: number; style?: ViewStyle }) {
  const rim = size * 0.62;
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: Math.max(1, size * 0.08),
          borderColor: GOLD_BORDER,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <LinearGradient colors={GOLD_GRADIENT} start={{ x: 0.25, y: 0 }} end={{ x: 0.75, y: 1 }} style={StyleSheet.absoluteFill} />
      <View
        style={{
          width: rim,
          height: rim,
          borderRadius: rim / 2,
          borderWidth: Math.max(1, size * 0.06),
          borderColor: 'rgba(255,255,255,0.5)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: GOLD_TEXT, lineHeight: size * 0.5 }}>★</Text>
      </View>
    </View>
  );
}

/** Glass surface card — section container for shop rows / wheel tiles. */
export function GlassCard({ children, style, glow }: { children: ReactNode; style?: ViewStyle; glow?: string }) {
  return (
    <View style={[styles.card, glow ? neonGlow(glow, 14) : neonGlow(NEON, 10), style]}>
      <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={[StyleSheet.absoluteFill, { borderRadius: SQRadius.lg }]} />
      {children}
    </View>
  );
}

/** Prominent section heading — bold accent-coloured text on a dark glass chip so
 * it pops on the busy background. Defaults to the hot-magenta accent. */
export function SectionTitle({ children, accent = SQColors.neonPink }: { children: ReactNode; accent?: string }) {
  return (
    <View style={[styles.sectionWrap, { borderColor: accent + '77' }]}>
      <Text style={[styles.section, { color: accent, textShadowColor: accent }]}>{children}</Text>
    </View>
  );
}

/** Small solid aqua CTA (e.g. "Buy", "Spin") with dark ink text. */
export function NeonCta({ label, onPress, disabled, color = NEON }: { label: string; onPress: () => void; disabled?: boolean; color?: string }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.cta, { backgroundColor: color, opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, !disabled && neonGlow(color, 12)]}
    >
      <Text style={styles.ctaText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: '100%',
    borderRadius: SQRadius.pill,
    paddingVertical: 21,
    borderWidth: 1.5,
    borderColor: NEON,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 22 },
  pillIconCol: { width: 46, alignItems: 'flex-start' },
  pillText: { flex: 1, textAlign: 'center', color: TEXT, fontWeight: '900', letterSpacing: 0.5 },

  iconBtn: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: NEON, overflow: 'hidden' },
  badge: { position: 'absolute', top: -6, right: -6 },

  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: SQRadius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: SQColors.coin,
    overflow: 'hidden',
  },
  coinText: { color: TEXT, fontWeight: '900', fontSize: 16 },

  card: {
    borderRadius: SQRadius.lg,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
    padding: 14,
  },
  sectionWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 9,
    backgroundColor: 'rgba(6,16,26,0.66)',
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 15,
    marginBottom: 12,
    marginTop: 10,
    borderWidth: 1.5,
  },
  sectionAccent: { width: 5, height: 20, borderRadius: 3 },
  section: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 19,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },

  cta: { borderRadius: SQRadius.pill, paddingVertical: 12, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 18 },
});
