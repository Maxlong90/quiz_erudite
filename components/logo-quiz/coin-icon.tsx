import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GOLD_GRADIENT, GOLD_BORDER, GOLD_TEXT } from '@/constants/logo-quiz/theme';

/**
 * The game's currency icon — a shiny minted gold coin, replacing the old 🪙
 * emoji everywhere. Fully scalable via `size` (borders/rim scale with it) so it
 * drops in at any of the sizes the emoji used (HUD 16, hint 13, shop 30).
 */
export function CoinIcon({ size = 16, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
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
      {/* Gold body with a top-left → bottom-right sheen. */}
      <LinearGradient
        colors={GOLD_GRADIENT}
        start={{ x: 0.25, y: 0 }}
        end={{ x: 0.75, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* Inner rim ring for a minted-coin look, with a star face — shown at every
          size so the coin looks identical everywhere (HUD balance, hints, shop). */}
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
        <Text style={{ fontSize: size * 0.42, fontWeight: '900', color: GOLD_TEXT, lineHeight: size * 0.5 }}>
          ★
        </Text>
      </View>
    </View>
  );
}
