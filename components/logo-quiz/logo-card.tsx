import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { LogoQuizColors, LogoQuizRadii } from '@/constants/logo-quiz-theme';

interface LogoCardProps {
  /** Real logo image; when absent the glyph placeholder is shown. */
  logoUri: string | null;
  /** Placeholder brand glyph rendered until real images exist (#721). */
  glyph: string;
  /** Small plate label, e.g. "ЛОГОТИП". */
  badgeLabel: string;
  /** Neon frame/glow color. */
  accent?: string;
}

/**
 * The centered square logo card from mockup 2 — a neon-framed panel with a
 * glowing border and a "ЛОГОТИП" plate. Renders the real logo via
 * expo-image when a URI is present, otherwise a large glyph placeholder.
 *
 * TODO(#721): once backend logo images land, `logoUri` will be populated
 * and the glyph fallback becomes a rare edge case.
 */
export function LogoCard({ logoUri, glyph, badgeLabel, accent = LogoQuizColors.cyan }: LogoCardProps) {
  return (
    <View style={[styles.card, { borderColor: accent, shadowColor: accent }]} testID="logo-card">
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badgeLabel}</Text>
      </View>
      {logoUri ? (
        <Image source={{ uri: logoUri }} style={styles.image} contentFit="contain" transition={200} testID="logo-image" />
      ) : (
        <Text style={styles.glyph} testID="logo-glyph">
          {glyph}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    aspectRatio: 1,
    borderRadius: LogoQuizRadii.xl,
    borderWidth: 1.5,
    backgroundColor: LogoQuizColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    // Neon glow around the framed logo.
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 22,
    elevation: 10,
  },
  badge: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LogoQuizColors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: LogoQuizColors.border,
  },
  badgeText: {
    color: LogoQuizColors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  glyph: {
    fontSize: 96,
    lineHeight: 108,
    textAlign: 'center',
  },
});
