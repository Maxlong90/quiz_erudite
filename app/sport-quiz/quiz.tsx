import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppBackground } from '@/components/sport-quiz/app-background';
import { CoinIcon, CoinPill, GlassIconButton, neonGlow } from '@/components/sport-quiz/ui';
import { ReportSheet } from '@/components/sport-quiz/report-sheet';
import { questionsForLevel, type SportQuizQuestion } from '@/lib/sport-quiz/content';
import { CORRECT_REWARD_COINS, HINT_SKIP_COST } from '@/lib/sport-quiz/economy';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import { useSportQuizContent } from '@/hooks/sport-quiz/use-sport-quiz-content';
import { useLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';

// Answer-reveal timings (mirrors the Logo Quiz quiz): the wrong options fade out
// over ~1s while the correct answer simultaneously glides up under the question
// over ~1.7s; once it lands, the Explanation + "Next" button fade in.
const FADE_MS = 1000;
const MOVE_MS = 1700;
const UI_FADE_MS = 300;

// Answer button height and the vertical rhythm derived from it. The counter is
// lifted up, and (on text/numeric questions) the prompt sits under the counter,
// both by 75% of an answer button.
const OPTION_MIN_HEIGHT = 60;
const TEXT_TOP_GAP = Math.round(OPTION_MIN_HEIGHT * 0.75); // 45

export default function SportQuizQuiz() {
  const t = useSQLabels();
  const { locale } = useLocale();
  const { level } = useLocalSearchParams<{ level?: string }>();
  const levelNumber = Number(level ?? 0);
  const { snapshot } = useSportQuizContent();
  const { coins, addCoins, spendCoins, isSolved, markSolved, setLastLevel } = useSportQuiz();
  const [reportOpen, setReportOpen] = useState(false);

  // Every question of this level, frozen at mount (the level list guarantees the
  // snapshot is ready before we get here).
  const runList = useMemo<SportQuizQuestion[]>(
    () => (snapshot ? questionsForLevel(snapshot, levelNumber) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Start on the first unsolved question (continue where the player left off);
  // for a fresh level that is question 1.
  const initialIndex = useMemo(() => {
    const firstUnsolved = runList.findIndex((q) => !isSolved(q.id));
    return firstUnsolved >= 0 ? firstUnsolved : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(initialIndex);
  const initialAnswered = useMemo(() => {
    const first = runList[initialIndex];
    return first ? isSolved(first.id) : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Whether the level was ALREADY fully solved when opened → review mode: paging
  // loops (last question → first) instead of ending at Level Complete.
  const enteredComplete = useMemo(
    () => runList.length > 0 && runList.every((qq) => isSolved(qq.id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const question = runList[index];

  // Per-question state. Wrong picks stay red until the correct one is chosen; the
  // correct answer turns green and the board reveals (in place) once solved.
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);
  const [solved, setSolved] = useState(initialAnswered);
  const [revealing, setRevealing] = useState(initialAnswered);
  const [revealAnimated, setRevealAnimated] = useState(false);

  // Remember this level so the level list scrolls back to it.
  useEffect(() => {
    if (levelNumber > 0) setLastLevel(levelNumber);
  }, [levelNumber, setLastLevel]);

  const isLast = index >= runList.length - 1;

  const onPick = (option: string) => {
    if (solved || wrongPicked.includes(option)) return;
    if (option === question.correctAnswer) {
      // Correct: light it green, award coins (first solve only), mark solved and
      // play the in-place reveal (wrong options fade out, answer glides up).
      const already = isSolved(question.id);
      setSolved(true);
      setRevealAnimated(true);
      markSolved(question.id);
      if (!already) addCoins(CORRECT_REWARD_COINS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setRevealing(true);
    } else {
      // Wrong: keep it red and stay on the question (no lives, no penalty) so the
      // player keeps trying until they pick the correct answer.
      setWrongPicked((w) => [...w, option]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const useSkip = () => {
    if (solved) return;
    if (!spendCoins(HINT_SKIP_COST)) return;
    // Skip reveals the answer green, marks it passed (no reward) and runs the same
    // in-place reveal as a normal solve.
    markSolved(question.id);
    setSolved(true);
    setRevealAnimated(true);
    Haptics.selectionAsync().catch(() => {});
    setRevealing(true);
  };

  // Reset every per-question flag and show `nextIndex` in place. An already-solved
  // target opens revealed (review look); an unanswered one resets to gameplay.
  const goToIndex = useCallback(
    (nextIndex: number) => {
      const target = runList[nextIndex];
      const targetAnswered = target ? isSolved(target.id) : false;
      setWrongPicked([]);
      setSolved(targetAnswered);
      setRevealing(targetAnswered);
      setRevealAnimated(false);
      setIndex(nextIndex);
      Haptics.selectionAsync().catch(() => {});
    },
    [runList, isSolved],
  );

  // Advance in place. On the last question: a first completion opens Level
  // Complete; reviewing an already-completed level LOOPS back to the first
  // question instead (cyclic paging, no Level Complete).
  const goNext = useCallback(() => {
    if (isLast) {
      if (enteredComplete) {
        goToIndex(0);
        return;
      }
      router.replace({ pathname: '/sport-quiz/level-complete', params: { level: String(levelNumber) } });
      return;
    }
    goToIndex(index + 1);
  }, [isLast, enteredComplete, index, goToIndex, levelNumber]);

  const onShare = useCallback(async () => {
    const { storeUrl } = getStoreLinks(snapshot?.app, Platform.OS);
    const message = t.shareInvite.replace('{url}', storeUrl);
    try {
      await Share.share({ message });
    } catch {
      // user cancelled — nothing to do
    }
  }, [snapshot?.app, t.shareInvite]);

  if (!question) {
    return (
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <AppBackground variant="deep" />
        <StatusBar style="light" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="deep" />
      <StatusBar style="light" />

      {/* HUD: back on the left; share · report · coins on the right (coins in the
          corner, report to its left, share to the left of report). */}
      <View style={styles.hud}>
        <GlassIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
        <View style={styles.headerRight}>
          <GlassIconButton glyph="share-social" size={44} onPress={onShare} />
          <GlassIconButton glyph="flag" size={44} onPress={() => setReportOpen(true)} />
          <Pressable onPress={() => router.push('/sport-quiz/shop')} hitSlop={8}>
            <CoinPill coins={coins} size="lg" />
          </Pressable>
        </View>
      </View>

      {/* Progress — position within the level. */}
      <Text style={styles.progress}>{`${index + 1} / ${runList.length}`}</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image questions show the framed picture in its fixed slot. Text and
            numeric questions have NO image: the prompt sits directly under the
            counter, separated only by TEXT_TOP_GAP (= 75% of an answer button). */}
        {question.imageUri ? (
          <View style={[styles.imageFrame, neonGlow(SQColors.neon, 10)]}>
            <Image source={{ uri: question.imageUri }} style={styles.image} contentFit="contain" />
          </View>
        ) : (
          <View style={styles.textTopGap} />
        )}
        <Text style={styles.prompt}>{question.question}</Text>

        {/* Options grid. On a correct reveal the wrong options unmount (FadeOut)
            while the correct answer — kept mounted with a stable key — glides up
            and centers (LinearTransition). Keyed by question id so a question
            change remounts the whole grid as a unit. */}
        <View key={question.id} style={[styles.options, revealing && styles.optionsRevealing]}>
          {question.options.map((option) => {
            const isAnswer = option === question.correctAnswer;
            if (revealing && !isAnswer) return null;
            const isWrong = wrongPicked.includes(option);
            let tone: StyleProp<ViewStyle> = styles.optionIdle;
            let textTone: StyleProp<TextStyle> = styles.optionText;
            if (solved && isAnswer) {
              tone = styles.optionCorrect;
              textTone = styles.optionTextStrong;
            } else if (isWrong) {
              tone = styles.optionWrong;
              textTone = styles.optionTextStrong;
            }
            return (
              <Animated.View
                key={option}
                layout={
                  revealAnimated ? LinearTransition.duration(MOVE_MS).easing(Easing.out(Easing.cubic)) : undefined
                }
                exiting={isAnswer ? undefined : FadeOut.duration(FADE_MS)}
                style={styles.optionWrap}
              >
                <Pressable
                  disabled={solved || revealing || isWrong}
                  onPress={() => onPick(option)}
                  style={({ pressed }) => [
                    styles.option,
                    tone,
                    pressed && !solved && !isWrong && { transform: [{ scale: 0.98 }] },
                  ]}
                >
                  {/* Long answers WRAP onto more lines (whole words) rather than
                      shrinking to an unreadable size: the button grows in height
                      and the font only dips to 90% at most. */}
                  <Text style={textTone} numberOfLines={4} adjustsFontSizeToFit minimumFontScale={0.9}>
                    {option}
                  </Text>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Reveal panel — Explanation, shown below the centered answer once its
            glide lands (on a fresh solve) or instantly (re-opening a solved one). */}
        {revealing && !!question.explanation && question.explanation.trim().length > 0 && (
          <Animated.View
            entering={revealAnimated ? FadeIn.delay(MOVE_MS).duration(UI_FADE_MS) : undefined}
            style={styles.revealArea}
          >
            <Text style={styles.explHeading}>{t.explanationHeading}</Text>
            <View style={styles.explCard}>
              <Text style={styles.explText}>{question.explanation}</Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom: before solving, the Skip hint; after, the Next button (which on
          the last question opens Level Complete). */}
      <View style={styles.bottom}>
        {solved ? (
          <Animated.View
            entering={revealAnimated ? FadeIn.delay(MOVE_MS).duration(UI_FADE_MS) : undefined}
            style={styles.nextWrap}
          >
            <Pressable
              onPress={goNext}
              style={({ pressed }) => [styles.nextBtn, neonGlow(SQColors.neon, 12), pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.nextText}>{t.next}</Text>
              <Ionicons name="arrow-forward" size={22} color={SQColors.textOnNeon} />
            </Pressable>
          </Animated.View>
        ) : (
          <Pressable
            disabled={coins < HINT_SKIP_COST}
            onPress={useSkip}
            style={({ pressed }) => [
              styles.skipBtn,
              neonGlow(SQColors.neon, 12),
              coins < HINT_SKIP_COST && styles.skipDisabled,
              pressed && coins >= HINT_SKIP_COST && { opacity: 0.92, transform: [{ scale: 0.99 }] },
            ]}
          >
            <LinearGradient colors={[SQColors.glassStrong, SQColors.glass]} style={StyleSheet.absoluteFill} />
            <Text style={styles.skipLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {t.skip}
            </Text>
            <View style={styles.costTag}>
              <CoinIcon size={24} />
              <Text style={styles.costText}>{HINT_SKIP_COST}</Text>
            </View>
          </Pressable>
        )}
      </View>

      <ReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={question.id}
        locale={locale}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Counter + question + answers sit lower — dropped by ~one answer-button
  // height (option minHeight 60 + rowGap ≈ 65) below the HUD. Counter is a bigger
  // pink neon number.
  progress: {
    textAlign: 'center',
    color: SQColors.neonPink,
    fontWeight: '900',
    fontSize: 18,
    // Lifted up by 0.75 of an answer button (was 65).
    marginTop: 65 - TEXT_TOP_GAP,
    marginBottom: 0,
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },

  imageFrame: {
    alignSelf: 'center',
    width: '86%',
    height: 180,
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    backgroundColor: 'rgba(9,24,40,0.5)',
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 14,
  },
  image: { width: '100%', height: '100%' },

  prompt: {
    fontSize: 20,
    fontWeight: '900',
    color: SQColors.text,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 18,
  },

  // Text/numeric questions have no image: this fixed gap (75% of an answer
  // button) sits between the counter and the prompt, so the prompt is directly
  // under the counter instead of dropped down by an image slot.
  textTopGap: { height: TEXT_TOP_GAP },

  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
  },
  optionsRevealing: { justifyContent: 'center' },
  optionWrap: { width: '48%' },
  option: {
    width: '100%',
    minHeight: OPTION_MIN_HEIGHT,
    backgroundColor: 'rgba(9,24,40,0.72)',
    borderRadius: SQRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: SQColors.glassBorderDim,
  },
  optionIdle: {},
  optionCorrect: { backgroundColor: 'rgba(43,255,179,0.18)', borderColor: SQColors.neon },
  optionWrong: { backgroundColor: 'rgba(255,59,87,0.20)', borderColor: '#FF3B57' },
  optionText: { fontSize: 15, fontWeight: '800', color: SQColors.text, textAlign: 'center' },
  optionTextStrong: { fontSize: 15, fontWeight: '900', color: SQColors.text, textAlign: 'center' },

  revealArea: { marginTop: 18, alignItems: 'center' },
  explHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: SQColors.neonPink,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  explCard: {
    backgroundColor: 'rgba(9,24,40,0.72)',
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorderDim,
    padding: 14,
    width: '100%',
  },
  explText: { fontSize: 14, fontWeight: '600', color: SQColors.text, lineHeight: 20, textAlign: 'center' },

  bottom: { marginTop: 'auto', paddingTop: 12, paddingBottom: 10 },
  nextWrap: { paddingHorizontal: 16 },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SQColors.neon,
    borderRadius: SQRadius.pill,
    paddingVertical: 16,
  },
  nextText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },

  // Skip button in the standard app-button format (like Play/Shop): a rounded
  // glass pill with a neon-green rim + glow, inset from the screen edges by the
  // same 16 as the answers. Near-white label + gold coin/cost.
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginHorizontal: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: SQRadius.pill,
    borderWidth: 1.5,
    borderColor: SQColors.neon,
    overflow: 'hidden',
  },
  skipDisabled: { opacity: 0.5 },
  skipLabel: {
    color: '#EAFFF8',
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 0.5,
  },
  costTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  costText: { fontSize: 20, fontWeight: '900', color: SQColors.coin },
});
