import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { Easing, FadeIn, LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { FlagsShareCard } from '@/components/flags-quiz/share-card';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useLocale } from '@/hooks/use-locale';
import { useFlagsQuizContent } from '@/hooks/flags-quiz/use-flags-quiz-content';
import { useRunProgress } from '@/hooks/flags-quiz/use-run-progress';
import { getStoreLinks } from '@/lib/store-links';
import { wrapLabel } from '@/lib/flags-quiz/label';
import { shareQuestionImage } from '@/lib/flags-quiz/share-image';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;
// Fixed answer-button height.
const OPTION_H = 68;
// Persisted-progress key for the "All countries" run (resume where you left off).
const PROGRESS_KEY = 'flags.progress.all.v1';

// Answer-reveal timings (mirrors Logo Quiz): the wrong options clear while the
// correct answer glides up and centers under the question; once it lands, the
// flag note + "Next" button fade in.
const MOVE_MS = 900;
const UI_FADE_MS = 300;
// The flag note is height-capped (it scrolls internally when long) so the answer +
// "Next" button always fit one screen — identical layout on tall and short phones.
const NOTE_MAX_H = 160;

// Font-fitting for the answer labels. The option button is 48% of the row width
// (options padding 20 each side) with 12px inner padding, so this is the text
// width one label has to live in. For a MULTI-word name we size the font DOWN
// from the max until the longest whole word fits that width — never breaking a
// word across lines. A single-word name shrinks reliably via adjustsFontSizeToFit.
const SCREEN_W = Dimensions.get('window').width;
const OPTION_TEXT_W = 0.48 * (SCREEN_W - 40) - 24;
const OPTION_FONT_MAX = 23;
const OPTION_FONT_MIN = 8;
// Conservative per-character advance (fraction of font size) for the bold label
// font; a little high on purpose so the computed size always leaves margin on the
// narrowest phones (where a too-large size would clip a whole word).
const CHAR_ADV = 0.72;

type OptionState = 'idle' | 'correct' | 'wrong';

/** Largest font size (within the min/max band) at which the longest of these
 *  lines still fits the option's text width on ONE line — so whole words never
 *  wrap mid-word. Used for the multi-line (multi-word) labels. */
function fitFontSize(lines: string[]): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (longest === 0) return OPTION_FONT_MAX;
  const fit = Math.floor(OPTION_TEXT_W / (longest * CHAR_ADV));
  return Math.max(OPTION_FONT_MIN, Math.min(OPTION_FONT_MAX, fit));
}

/**
 * Flags Quiz "All countries" gameplay screen (App Template: Geography). A flag
 * PICTURE, the question, and a 2×2 grid of glossy-blue TEXT answer buttons. The
 * catalogue is the backend's full set of `image_questions` (every country),
 * served in the content snapshot and shared via the content provider.
 *
 * The run order is SHUFFLED and PERSISTED (see useRunProgress): exiting mid-run
 * and returning resumes at the same question with the same score, and only a
 * finished (or brand-new) run reshuffles. A `retry` run replays ONLY the passed
 * missed-question indices and is not persisted.
 *
 * Answer flow:
 * - WRONG pick → flashes red, is recorded, then skips to the next question.
 * - CORRECT pick → the wrong options fade out, the correct answer glides to the
 *   centre under the question, the flag note appears below it and a "Next" button
 *   advances the run (mirrors Logo Quiz).
 * - After the last question → the result screen (score + retry-mistakes).
 */
export default function FlagsQuizGame() {
  const t = useFQLabels();
  const { locale } = useLocale();
  const { retry } = useLocalSearchParams<{ retry?: string }>();
  const { countryQuestions, status } = useFlagsQuizContent();
  const [reportOpen, setReportOpen] = useState(false);
  // Off-screen composition (flag + prompt + options) captured to a PNG for Share.
  const shareCardRef = useRef<View>(null);

  // On a retry we replay only the missed indices (in order); otherwise the run is
  // resumed-or-freshly-shuffled and persisted by useRunProgress.
  const retryIdxs = useMemo(() => {
    if (!retry) return null;
    const idxs = retry
      .split(',')
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < countryQuestions.length);
    return idxs.length > 0 ? idxs : null;
  }, [retry, countryQuestions.length]);

  const { hydrated, order, pos, wrong, setPos, addWrong, clear } = useRunProgress({
    key: PROGRESS_KEY,
    count: countryQuestions.length,
    retry: retryIdxs,
    ready: countryQuestions.length > 0,
  });

  const [picked, setPicked] = useState<number | null>(null);

  const questionIdx = order[pos];
  const question = countryQuestions[questionIdx];
  const answered = picked !== null;
  const isCorrectPick = answered && question != null && picked === question.correctIndex;

  const finish = useCallback(
    (finalWrong: number[]) => {
      clear();
      const total = order.length;
      const correct = total - finalWrong.length;
      router.replace({
        pathname: '/flags-quiz/result',
        params: {
          mode: 'all',
          correct: String(correct),
          total: String(total),
          wrong: finalWrong.join(','),
        },
      });
    },
    [order.length, clear],
  );

  const advance = useCallback(
    (finalWrong: number[]) => {
      const next = pos + 1;
      if (next >= order.length) {
        finish(finalWrong);
        return;
      }
      setPicked(null);
      setPos(next);
    },
    [pos, order.length, finish, setPos],
  );

  const onPick = (option: number) => {
    if (answered || !question) return;
    setPicked(option);
    const correct = option === question.correctIndex;
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    if (correct) {
      // Play the reveal; the player taps "Next" to continue.
      return;
    }
    const newWrong = [...wrong, questionIdx];
    addWrong(questionIdx);
    setTimeout(() => advance(newWrong), REVEAL_MS);
  };

  const onContinue = () => {
    if (!isCorrectPick) return;
    advance(wrong);
  };

  const stateFor = (option: number): OptionState => {
    if (!answered || !question) return 'idle';
    // Only the tapped option lights up: green if correct, red if wrong. A wrong
    // pick never reveals the correct answer.
    if (option === picked) return picked === question.correctIndex ? 'correct' : 'wrong';
    return 'idle';
  };

  // Share the question: capture the off-screen ShareCard to a PNG and share it
  // with the invite (mirrors Logo Quiz's "Share a logo").
  const onShare = () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    const message = t.shareInvite.replace('{url}', storeUrl);
    shareQuestionImage(shareCardRef, message);
  };

  // Content or saved progress still loading — show a light loader rather than an
  // empty screen.
  if (!hydrated || !question) {
    return (
      <View style={styles.fill}>
        <GradientBackground />
        <StatusBar style="light" />
        <SafeAreaView style={[styles.fill, styles.center]} edges={['top', 'bottom']}>
          {status === 'error' ? (
            <Text style={styles.loaderText}>{t.resultKeepGoing}</Text>
          ) : (
            <ActivityIndicator size="large" color="#FFFFFF" />
          )}
        </SafeAreaView>
      </View>
    );
  }

  const historyText = question.explanation;
  const revealing = isCorrectPick;

  return (
    <View style={styles.fill}>
      <GradientBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Top bar: back (left) · report + share (right). No lives / coins / ⋯. */}
        <View style={styles.hud}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <GlossyIconButton glyph="chevron-back" size={44} />
          </Pressable>
          <View style={styles.hudRight}>
            <Pressable
              onPress={() => setReportOpen(true)}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              testID="quiz-report-button"
            >
              <GlossyIconButton glyph="flag" size={44} />
            </Pressable>
            <Pressable
              onPress={onShare}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              testID="quiz-share-button"
            >
              <GlossyIconButton glyph="share-social" size={44} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Flag block: progress right above the flag, then the flag, then the question. */}
          <View style={styles.imageArea}>
            <Text style={styles.progress}>{`${pos + 1}/${order.length}`}</Text>
            <View style={styles.imageFrame}>
              {question.imageUri ? (
                <Image
                  source={{ uri: question.imageUri }}
                  style={styles.flagImg}
                  contentFit="contain"
                  transition={0}
                />
              ) : (
                <View style={[styles.flagImg, styles.flagFallback]} />
              )}
            </View>
            <Text style={styles.prompt}>{t.whichCountry}</Text>
          </View>

          {/* 2×2 answer grid. On a correct reveal the wrong options unmount (FadeOut)
              while the correct answer — kept mounted — glides up and centers. */}
          <View key={question.id} style={[styles.options, revealing && styles.optionsRevealing]}>
            {question.options.map((option, i) => {
              if (revealing && i !== question.correctIndex) return null;
              return (
                <Animated.View
                  key={`${question.id}-${i}`}
                  layout={LinearTransition.duration(MOVE_MS).easing(Easing.out(Easing.cubic))}
                  style={styles.optionWrap}
                >
                  <OptionButton
                    label={option}
                    state={stateFor(i)}
                    disabled={answered}
                    onPress={() => onPick(i)}
                  />
                </Animated.View>
              );
            })}
          </View>

          {/* Reveal panel — the flag note (when present) then a "Next" button, in
              the Flags Quiz button style. Fades in once the answer glide lands. */}
          {revealing ? (
            <Animated.View entering={FadeIn.delay(MOVE_MS).duration(UI_FADE_MS)}>
              {historyText ? (
                <View style={[styles.historyBox, FQShadow.card]}>
                  <ScrollView
                    style={styles.historyScroll}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                  >
                    <Text style={styles.historyText}>{historyText}</Text>
                  </ScrollView>
                </View>
              ) : null}
              <View style={styles.nextWrap}>
                <GlossyButton label={t.next} onPress={onContinue} fontSize={23} paddingVertical={18} />
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Report form — opened straight from the Report button (mirrors Logo Quiz). */}
      <QuizMenuModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        question={{ id: question.id } as unknown as LogoQuizQuestion}
        appConfig={undefined}
        locale={locale}
        initialView="report"
        primaryGradient={['#A6E1FF', '#3FA9F5']}
        sheetGradient={['#C2E4FF', '#7FBDF3']}
      />

      {/* Off-screen composition captured for the Share image. Laid out (so it can be
          snapshotted) but parked outside the viewport, never affecting layout. */}
      <View style={styles.shareCardHost} pointerEvents="none">
        <FlagsShareCard
          ref={shareCardRef}
          variant="country"
          title={t.appName}
          prompt={t.whichCountry}
          flagUri={question.imageUri}
          textOptions={question.options}
        />
      </View>
    </View>
  );
}

/** A glossy-blue answer button (same design as the home buttons) that tints green
 *  when it's the correct answer and red when it's a wrong pick, once answered. */
function OptionButton({
  label,
  state,
  onPress,
  disabled,
}: {
  label: string;
  state: OptionState;
  onPress: () => void;
  disabled: boolean;
}) {
  const gradient =
    state === 'correct'
      ? (['#7BE495', '#37B24D'] as const)
      : state === 'wrong'
        ? (['#FF9A9A', '#E03131'] as const)
        : ([FQColors.tileLight, FQColors.tileDark] as const);
  const rim = state === 'correct' ? '#2B8A3E' : state === 'wrong' ? '#C92A2A' : FQColors.tileRim;
  const textColor = state === 'idle' ? FQColors.tileGlyph : '#FFFFFF';
  const display = wrapLabel(label);
  const lines = display.split('\n');
  const multiline = lines.length > 1;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.optionFill, pressed && !disabled && styles.pressed]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.option, { borderColor: rim }, FQShadow.card]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          style={styles.optionGloss}
          pointerEvents="none"
        />
        {/* Single-word labels shrink reliably on one line (adjustsFontSizeToFit,
            never clipped). Multi-word labels use a computed size that fits the
            longest whole word, so words wrap only at real word boundaries. */}
        <Text
          style={[styles.optionText, { color: textColor }, multiline ? { fontSize: fitFontSize(lines) } : null]}
          numberOfLines={lines.length}
          adjustsFontSizeToFit={!multiline}
          minimumFontScale={0.5}
        >
          {display}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  // Parks the share composition off-screen — laid out (so it can be snapshotted)
  // but never visible or interactive.
  shareCardHost: { position: 'absolute', left: -9999, top: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  loaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  body: { paddingBottom: 32 },

  // Sits right above the flag inside the flag block.
  progress: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 22,
    textShadowColor: 'rgba(4, 40, 96, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Progress + flag + question, sitting right below the top bar.
  imageArea: { alignItems: 'center', marginTop: 16 },
  // Rim frame like the buttons — navy border hugging the flag with no gap.
  imageFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    // White backing so flags with off-3:2 ratios (e.g. Nepal's pennant)
    // letterbox cleanly on white instead of showing the screen through.
    backgroundColor: '#FFFFFF',
  },
  flagImg: { width: 216, height: 144 },
  flagFallback: { backgroundColor: 'rgba(255,255,255,0.12)' },
  prompt: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 16,
    textAlign: 'center',
    alignSelf: 'center',
    paddingHorizontal: 24,
    textShadowColor: 'rgba(4, 40, 96, 0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },

  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    rowGap: 14,
    // Two button-heights below the question, then raised a full button back up.
    marginTop: OPTION_H * 1.0,
  },
  // While revealing only the correct answer remains — center the lone survivor so
  // its glide lands under the question, and pull the block up to make room for the
  // note + "Next" button within one screen.
  optionsRevealing: { justifyContent: 'center', marginTop: 32 },
  optionWrap: { width: '48%' },
  optionFill: { width: '100%' },
  option: {
    height: OPTION_H,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionGloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  optionText: { fontSize: 23, fontWeight: '900', textAlign: 'center' },

  // White card, blue rim, navy text — the flag-note reveal (display only now; the
  // "Next" button below advances). Height-capped so the button stays on screen.
  historyBox: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  historyScroll: { maxHeight: NOTE_MAX_H },
  historyText: {
    color: FQColors.tileGlyph,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  // "Next" matches an answer button: same 48% width, centered under the answer.
  nextWrap: { width: '48%', alignSelf: 'center', marginTop: 18 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
