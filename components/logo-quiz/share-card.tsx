import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LogoDisplay } from '@/components/logo-quiz/logo-display';
import { BG_BASE } from '@/components/logo-quiz/app-background';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';

/**
 * Off-screen composition captured (via react-native-view-shot) into the image
 * shared from the "…" menu's "Share a logo" action. It mirrors the quiz screen —
 * the brand logo above a 2×2 grid of the answer options — but is deliberately
 * NEUTRAL: no option is highlighted, so the recipient gets a "guess this logo"
 * challenge rather than the answer. Rendered with a fixed width so the captured
 * PNG has stable, share-friendly dimensions regardless of the device screen.
 */
export const SHARE_CARD_WIDTH = 360;

interface Props {
  imageUri?: string | null;
  options: string[];
  /** Localized "Which brand?" prompt. */
  prompt: string;
  /** App name shown as the branded header ("Logo Quiz"). */
  title: string;
}

export const ShareCard = forwardRef<View, Props>(function ShareCard(
  { imageUri, options, prompt, title },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.brand}>{title}</Text>
      <LogoDisplay imageUri={imageUri} size={180} />
      <Text style={styles.prompt}>{prompt}</Text>
      <View style={styles.grid}>
        {options.map((option) => (
          <View key={option} style={styles.optionWrap}>
            <View style={[styles.option, LQShadow.card]}>
              <Text
                style={styles.optionText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {option}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    backgroundColor: BG_BASE,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    alignItems: 'center',
  },
  brand: {
    fontSize: 20,
    fontWeight: '900',
    color: LQColors.primary,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  prompt: {
    fontSize: 17,
    fontWeight: '800',
    color: LQColors.text,
    marginTop: 16,
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    rowGap: 12,
  },
  optionWrap: { width: '48%' },
  option: {
    width: '100%',
    height: 56,
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.md,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionText: { fontSize: 16, fontWeight: '800', color: LQColors.text },
});
