import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { wrapLabel } from '@/lib/flags-quiz/label';

/**
 * Off-screen composition captured (via react-native-view-shot) into the image
 * shared from the Coat of Arms gameplay Share button. Mirrors the Flags Quiz
 * share card ("country" variant) but the picture is a COAT OF ARMS — square and
 * CONTAINED on a white plate (never cropped) — with the prompt and four TEXT
 * options. Deliberately NEUTRAL (no option highlighted) so the recipient gets a
 * "guess this coat of arms" challenge rather than the answer.
 */
export const SHARE_CARD_WIDTH = 340;

const CARD_INNER = SHARE_CARD_WIDTH - 40; // paddingHorizontal 20 each side
const OPT_TEXT_W = CARD_INNER * 0.48 - 20; // text width inside a 48% option

/** Deterministic font size so the longest whole word fits one line. */
function fitFont(lines: string[]): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (longest === 0) return 18;
  return Math.max(9, Math.min(18, Math.floor(OPT_TEXT_W / (longest * 0.66))));
}

const IMG_OPT_W = Math.floor(CARD_INNER * 0.48) - 8;

interface Props {
  /** 'country' = coat + text options; 'continent' = country name + coat images. */
  variant?: 'country' | 'continent';
  /** App name shown as the branded header. */
  title: string;
  /** country: the localized prompt; continent: the country name. */
  prompt: string;
  /** country variant: the coat-of-arms image. */
  coatUri?: string | null;
  /** country variant: the four text answer choices. */
  textOptions?: string[];
  /** continent variant: the four coat-image options. */
  imageOptions?: (string | null)[];
}

export const CoatShareCard = forwardRef<View, Props>(function CoatShareCard(
  { variant = 'country', title, prompt, coatUri, textOptions, imageOptions },
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
            <View style={styles.coatFrame}>
              {coatUri ? (
                <Image source={{ uri: coatUri }} style={styles.coatImg} contentFit="contain" transition={0} />
              ) : (
                <View style={[styles.coatImg, styles.fallback]} />
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
                        style={{ width: IMG_OPT_W, height: IMG_OPT_W }}
                        contentFit="contain"
                        transition={0}
                      />
                    ) : (
                      <View style={[{ width: IMG_OPT_W, height: IMG_OPT_W }, styles.fallback]} />
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
  coatFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  coatImg: { width: 168, height: 168 },
  fallback: { backgroundColor: 'rgba(11, 58, 135, 0.08)' },
  prompt: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
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
  country: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 18,
  },
  imgOptWrap: { width: '48%', alignItems: 'center' },
  imgFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
});
