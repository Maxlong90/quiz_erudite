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
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useLocale } from '@/hooks/use-locale';
import { useCoatContent } from '@/hooks/coat-of-arms/use-coat-content';
import { useRunProgress } from '@/hooks/flags-quiz/use-run-progress';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';
import { wrapLabel } from '@/lib/flags-quiz/label';
import { shareQuestionImage } from '@/lib/flags-quiz/share-image';
import { getStoreLinks } from '@/lib/store-links';
import { CoatShareCard } from '@/components/coat-of-arms/share-card';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;
// Fixed answer-button height.
const OPTION_H = 68;
// Persisted-progress key for the "All countries" coats run (resume on return).
const PROGRESS_KEY = 'coat.progress.all.v1';

// Answer-reveal timings (mirror Flags Quiz): the wrong options clear while the
// correct answer glides up and centers under the question; once it lands, the
// note + "Next" button fade in.
const MOVE_MS = 900;
const UI_FADE_MS = 300;
const NOTE_MAX_H = 160;

// Font-fitting for the answer labels (identical to Flags Quiz).
const SCREEN_W = Dimensions.get('window').width;
const OPTION_TEXT_W = 0.48 * (SCREEN_W - 40) - 24;
const OPTION_FONT_MAX = 23;
const OPTION_FONT_MIN = 8;
const CHAR_ADV = 0.72;

type OptionState = 'idle' | 'correct' | 'wrong';

function fitFontSize(lines: string[]): number {
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  if (longest === 0) return OPTION_FONT_MAX;
  const fit = Math.floor(OPTION_TEXT_W / (longest * CHAR_ADV));
  return Math.max(OPTION_FONT_MIN, Math.min(OPTION_FONT_MAX, fit));
}

/**
 * Coat of Arms "All countries" gameplay screen. Same technology as the Flags
 * Quiz gameplay — only the picture is a COAT OF ARMS and the prompt asks which
 * country it belongs to. A coat picture, the question, and a 2×2 grid of
 * glossy-blue TEXT answer buttons (four countries, one correct). The catalogue is
 * the backend's `coat-of-arms` image_questions, served in the content snapshot.
 *
 * The run order is SHUFFLED and PERSISTED (see useRunProgress): exiting mid-run
 * and returning resumes at the same question with the same score, and only a
 * finished (or brand-new) run reshuffles. A `retry` run replays ONLY the passed
 * missed-question indices and is not persisted.
 *
 * Answer flow: a WRONG pick flashes red then skips on; a CORRECT pick fades the
 * wrong options out, glides the correct answer to the centre, reveals the note
 * and a "Next" button. Only the tapped option lights up — a wrong pick never
 * reveals the correct answer. After the last question → the result screen.
 */
export default function CoatOfArmsGame() {
  const t = useFQLabels();
  const c = useCoaLabels();
  const { locale } = useLocale();
  const { retry } = useLocalSearchParams<{ retry?: string }>();
  const { countryQuestions, status } = useCoatContent();
  const [reportOpen, setReportOpen] = useState(false);
  // Off-screen composition (coat + prompt + options) captured to a PNG for Share.
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
        pathname: '/coat-of-arms/result',
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

  // Share the question: capture the off-screen CoatShareCard to a PNG and share
  // it with the invite (mirrors Flags Quiz's "Share a flag").
  const onShare = () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    const message = t.shareInvite.replace('{url}', storeUrl);
    shareQuestionImage(shareCardRef, message);
  };

  const stateFor = (option: number): OptionState => {
    if (!answered || !question) return 'idle';
    // Only the tapped option lights up: green if correct, red if wrong. A wrong
    // pick never reveals the correct answer.
    if (option === picked) return picked === question.correctIndex ? 'correct' : 'wrong';
    return 'idle';
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
  // RU splits the prompt onto two lines (its single-line wrap looked wrong);
  // every other locale keeps the backend question, which already wraps nicely.
  const promptText = c.quizPrompt || question.prompt;

  return (
    <View style={styles.fill}>
      <GradientBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Top bar: back (left) · report + share (right). */}
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
          {/* Coat block: progress right above the coat, then the coat, then the question. */}
          <View style={styles.imageArea}>
            <Text style={styles.progress}>{`${pos + 1}/${order.length}`}</Text>
            <View style={styles.imageFrame}>
              {question.imageUri ? (
                <Image
                  source={{ uri: question.imageUri }}
                  style={styles.coatImg}
                  contentFit="contain"
                  transition={0}
                />
              ) : (
                <View style={[styles.coatImg, styles.coatFallback]} />
              )}
            </View>
            <Text style={styles.prompt}>{promptText}</Text>
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

          {/* Reveal panel — the note (when present) then a "Next" button, in the
              Flags Quiz button style. Fades in once the answer glide lands. */}
          {revealing ? (
            <Animated.View entering={FadeIn.delay(MOVE_MS).duration(UI_FADE_MS)}>
              {historyText ? (
                <View style={[styles.historyBox, FQShadow.card]}>
                  <Text style={styles.historyText}>{historyText}</Text>
                </View>
              ) : null}
              <View style={styles.nextWrap}>
                <GlossyButton label={t.next} onPress={onContinue} fontSize={23} paddingVertical={18} />
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Report form — opened straight from the Report button (mirrors Flags Quiz). */}
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

      {/* Off-screen composition captured for the Share image. Laid out (so it can
          be snapshotted) but parked outside the viewport, never affecting layout. */}
      <View style={styles.shareCardHost} pointerEvents="none">
        <CoatShareCard
          ref={shareCardRef}
          title={c.appName}
          prompt={promptText}
          coatUri={question.imageUri}
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

  // Sits right above the coat inside the coat block.
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

  // Progress + coat + question, sitting right below the top bar.
  imageArea: { alignItems: 'center', marginTop: 16 },
  // Rim frame like the buttons, with a light inner fill so a transparent coat
  // reads clearly. A coat is portrait/square (unlike a wide flag), so the frame
  // is square and the image is CONTAINED (never cropped).
  imageFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  coatImg: { width: 190, height: 190 },
  coatFallback: { backgroundColor: 'rgba(11, 58, 135, 0.08)' },
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
    marginTop: OPTION_H * 1.0,
  },
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
  nextWrap: { width: '48%', alignSelf: 'center', marginTop: 18 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
