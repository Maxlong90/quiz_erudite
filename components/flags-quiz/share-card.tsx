import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { wrapLabel } from '@/lib/flags-quiz/label';

/**
 * Off-screen composition captured (via react-native-view-shot) into the image
 * shared from a gameplay screen's Share button. It mirrors the quiz board but is
 * deliberately NEUTRAL — no option is highlighted — so the recipient gets a
 * "guess this flag" challenge rather than the answer. Rendered at a fixed width so
 * the captured PNG has stable, share-friendly dimensions on any device.
 *
 * Two shapes, matching the two game modes:
 *  - `country`   — a flag PICTURE + the prompt + four TEXT options ("All countries").
 *  - `continent` — a country NAME + four flag-PICTURE options ("By continent").
 */
export const SHARE_CARD_WIDTH = 340;

const CARD_INNER = SHARE_CARD_WIDTH - 40; // paddingHorizontal 20 each side
const OPT_TEXT_W = CARD_INNER * 0.48 - 20; // text width inside a 48% option
// Flag-picture option box sized to fit two columns (mirrors the game's frame).
const IMG_OPT_W = Math.floor(CARD_INNER * 0.48) - 14;
const IMG_OPT_H = Math.round(IMG_OPT_W * 0.62);

/** Deterministic font size so the longest whole word fits one line (no mid-word breaks). */
function fitFont(lines: string[]): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (longest === 0) return 18;
  return Math.max(9, Math.min(18, Math.floor(OPT_TEXT_W / (longest * 0.66))));
}

interface Props {
  variant: 'country' | 'continent';
  /** App name shown as the branded header ("Flags Quiz"). */
  title: string;
  /** country: the localized prompt; continent: the country name. */
  prompt: string;
  /** country variant: the flag image. */
  flagUri?: string | null;
  /** country variant: the four text answer choices. */
  textOptions?: string[];
  /** continent variant: the four flag-image options. */
  imageOptions?: (string | null)[];
}

export const FlagsShareCard = forwardRef<View, Props>(function FlagsShareCard(
  { variant, title, prompt, flagUri, textOptions, imageOptions },
  ref,
) {
  return (
    <View ref={ref} collapsable={false} style={styles.cardOuter}>
      <LinearGradient
        colors={[FQColors.bgTop, FQColors.bgMid, FQColors.bgBottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.card}
      >
        <Text style={styles.brand}>{title}</Text>

        {variant === 'country' ? (
          <>
            <View style={styles.flagFrame}>
              {flagUri ? (
                <Image source={{ uri: flagUri }} style={styles.flagImg} contentFit="cover" transition={0} />
              ) : (
                <View style={[styles.flagImg, styles.fallback]} />
              )}
            </View>
            <Text style={styles.prompt}>{prompt}</Text>
            <View style={styles.grid}>
              {(textOptions ?? []).map((option, i) => {
                const display = wrapLabel(option);
                const lines = display.split('\n');
                return (
                  <View key={`${option}-${i}`} style={styles.optWrap}>
                    <LinearGradient
                      colors={[FQColors.tileLight, FQColors.tileDark]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.textOpt, FQShadow.card]}
                    >
                      <Text
                        style={[styles.optText, { fontSize: fitFont(lines) }]}
                        numberOfLines={lines.length}
                      >
                        {display}
                      </Text>
                    </LinearGradient>
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.country}>{prompt}</Text>
            <View style={styles.grid}>
              {(imageOptions ?? []).map((uri, i) => (
                <View key={i} style={styles.imgOptWrap}>
                  <View style={styles.imgFrame}>
                    {uri ? (
                      <Image
                        source={{ uri }}
                        style={{ width: IMG_OPT_W, height: IMG_OPT_H }}
                        contentFit="cover"
                        transition={0}
                      />
                    ) : (
                      <View style={[{ width: IMG_OPT_W, height: IMG_OPT_H }, styles.fallback]} />
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  cardOuter: { width: SHARE_CARD_WIDTH },
  card: { width: SHARE_CARD_WIDTH, paddingHorizontal: 20, paddingTop: 18, paddingBottom: 22, alignItems: 'center' },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 16,
    textShadowColor: 'rgba(4, 40, 96, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  flagFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 6,
    overflow: 'hidden',
  },
  flagImg: { width: 210, height: 140 },
  fallback: { backgroundColor: 'rgba(255,255,255,0.15)' },
  prompt: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  country: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    rowGap: 12,
  },
  optWrap: { width: '48%' },
  textOpt: {
    height: 58,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optText: { color: FQColors.tileGlyph, fontWeight: '900', textAlign: 'center' },
  imgOptWrap: { width: '48%', alignItems: 'center' },
  imgFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 6,
    overflow: 'hidden',
  },
});
