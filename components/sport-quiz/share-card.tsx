import { forwardRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { FitAnswerText } from '@/components/sport-quiz/fit-answer-text';
import { SoccerBall } from '@/components/sport-quiz/soccer-ball';
import { PLATE_COLS, PLATE_ROWS } from '@/components/sport-quiz/puzzle-overlay';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';

/**
 * Off-screen composition captured (via react-native-view-shot) into the image
 * shared from a Sport Quiz gameplay screen's Share button. It mirrors the quiz
 * board — picture, prompt, 2×2 answer grid — on Sport Quiz's navy, but carries
 * NONE of the screen chrome (back / report / coins / counter / Skip) and is
 * deliberately NEUTRAL: no option is ever highlighted, so the recipient gets a
 * "guess this" challenge instead of the answer. Rendered at a fixed width so the
 * captured PNG has stable, share-friendly dimensions on any device.
 *
 * Two shapes, matching the two modes:
 *  - `classic` — the question picture (when the question has one) + the prompt.
 *  - `legends` — the athlete's portrait, still under the puzzle plates the player
 *    has not uncovered yet, so sharing an unsolved face cannot spoil it either.
 */
export const SHARE_CARD_WIDTH = 340;

const CARD_PADDING_H = 20;
const CARD_INNER = SHARE_CARD_WIDTH - CARD_PADDING_H * 2; // 300

// Answer buttons mirror the screens' fixed geometry (48% columns, height 64,
// paddingHorizontal 12, paddingVertical 6, 1.5 borders) — but measured against
// the CARD's width, not Dimensions.get('window'), so labels are sized for the
// picture we actually capture.
const OPTION_HEIGHT = 64;
const OPTION_BASE_FONT = 15;
const OPTION_TEXT_W = CARD_INNER * 0.48 - 12 * 2 - 3;
const OPTION_TEXT_H = OPTION_HEIGHT - 6 * 2 - 3;

/** Question picture (classic): the card's full inner width, landscape like the screen's frame. */
const CLASSIC_IMG_W = CARD_INNER;
const CLASSIC_IMG_H = 170;

/** Athlete portrait (legends): 3:4 like the screen's frame, given an explicit size
 *  (not a percentage + aspectRatio) so the captured PNG height is deterministic. */
const LEGEND_IMG_W = 210;
const LEGEND_IMG_H = Math.round(LEGEND_IMG_W * (4 / 3));

interface Props {
  variant: 'classic' | 'legends';
  /** App name shown as the branded header ("Sport Quiz"). */
  title: string;
  /** classic: the question text; legends: the localized "Who is this?" prompt. */
  prompt: string;
  /** The question picture. Null on Sport Quiz's text/date questions. */
  imageUri?: string | null;
  /** All four answer choices — always the full set, always unhighlighted. */
  options: string[];
  /** legends: plates the player has paid to uncover (mirrors PuzzleOverlay). */
  revealedPlates?: ReadonlySet<number>;
  /** legends: the face was guessed/skipped, so the whole photo is open. */
  revealAll?: boolean;
}

export const SportShareCard = forwardRef<View, Props>(function SportShareCard(
  { variant, title, prompt, imageUri, options, revealedPlates, revealAll },
  ref,
) {
  const isLegends = variant === 'legends';
  const frameSize = isLegends
    ? { width: LEGEND_IMG_W, height: LEGEND_IMG_H }
    : { width: CLASSIC_IMG_W, height: CLASSIC_IMG_H };

  return (
    // collapsable={false} keeps Android's view flattening from dropping this
    // ViewGroup — captureRef would otherwise snapshot the wrong view. The opaque
    // background matters just as much: the capture is a PNG, and a transparent
    // one gets composited to black by most chat apps.
    <View ref={ref} collapsable={false} style={styles.card}>
      <Text style={styles.brand}>{title}</Text>

      {/* Text/date questions have no picture at all — render no empty frame. */}
      {(isLegends || imageUri) && (
        <View style={[styles.imageFrame, frameSize]}>
          <Image
            source={imageUri ? { uri: imageUri } : undefined}
            style={styles.image}
            contentFit={isLegends ? 'cover' : 'contain'}
            cachePolicy="memory-disk"
            recyclingKey={imageUri ?? undefined}
            // No fade-in: a capture must never catch the picture mid-transition.
            transition={0}
          />
          {isLegends && <SharePlates revealed={revealedPlates} revealAll={revealAll} />}
        </View>
      )}

      <Text style={styles.prompt}>{prompt}</Text>

      <View style={styles.options}>
        {options.map((option, i) => (
          // Options can repeat verbatim across a question, so index the key.
          <View key={`${option}-${i}`} style={styles.optionWrap}>
            <View style={styles.option}>
              <FitAnswerText
                text={option}
                style={styles.optionText}
                baseSize={OPTION_BASE_FONT}
                maxWidth={OPTION_TEXT_W}
                maxHeight={OPTION_TEXT_H}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

/**
 * The Legends puzzle plates, frozen for the capture. A STATIC twin of
 * PuzzleOverlay: same grid and plate styling, but plain Views — the real overlay
 * animates each plate out (FadeOut) and wraps it in a Pressable, and a capture
 * fired during a reveal would freeze a half-faded grid into the shared PNG.
 */
function SharePlates({ revealed, revealAll }: { revealed?: ReadonlySet<number>; revealAll?: boolean }) {
  return (
    <View style={styles.plateLayer}>
      {Array.from({ length: PLATE_COLS * PLATE_ROWS }, (_, i) => {
        const gone = revealAll || revealed?.has(i);
        return (
          <View
            key={i}
            style={[styles.plateCell, { width: `${100 / PLATE_COLS}%`, height: `${100 / PLATE_ROWS}%` }]}
          >
            {!gone && (
              <View style={styles.plate}>
                <LinearGradient
                  colors={[SQColors.glassStrong, SQColors.glass]}
                  style={StyleSheet.absoluteFill}
                />
                <SoccerBall size={26} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SHARE_CARD_WIDTH,
    backgroundColor: SQColors.bgBase,
    paddingHorizontal: CARD_PADDING_H,
    paddingTop: 18,
    paddingBottom: 22,
    alignItems: 'center',
  },
  brand: {
    fontSize: 22,
    fontWeight: '900',
    color: SQColors.neon,
    letterSpacing: 0.5,
    marginBottom: 16,
    textShadowColor: SQColors.neon,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },

  // Neon RIM only — no neonGlow(): a glow is drawn outside the view bounds, which
  // captureRef clips away on iOS, and its Android half is an elevation shadow the
  // PARENT draws, so it does not reach the capture at all.
  imageFrame: {
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    // Opaque so a picture that has not warmed up yet reads as an empty frame
    // rather than a transparent hole.
    backgroundColor: '#0A1826',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },

  plateLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  plateCell: { padding: 1.5 },
  plate: {
    flex: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(43,255,179,0.25)',
    backgroundColor: 'rgba(9,24,40,0.96)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  prompt: {
    fontSize: 18,
    fontWeight: '900',
    color: SQColors.text,
    textAlign: 'center',
    marginTop: 14,
    marginBottom: 16,
  },

  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    rowGap: 12,
  },
  optionWrap: { width: '48%' },
  // Always the IDLE tone — the shared card never marks the correct answer.
  option: {
    width: '100%',
    height: OPTION_HEIGHT,
    backgroundColor: 'rgba(9,24,40,0.72)',
    borderRadius: SQRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: SQColors.glassBorderDim,
  },
  optionText: { fontSize: 15, fontWeight: '800', color: SQColors.text, textAlign: 'center' },
});
