import { useCallback, useMemo, useState } from 'react';
import {
  Dimensions,
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
import { FitAnswerText } from '@/components/sport-quiz/fit-answer-text';
import { CoinIcon, CoinPill, GlassIconButton, neonGlow } from '@/components/sport-quiz/ui';
import { PuzzleOverlay } from '@/components/sport-quiz/puzzle-overlay';
import { ReportSheet } from '@/components/sport-quiz/report-sheet';
import { legendsQuestionsForLevel } from '@/lib/sport-quiz/legends';
import type { SportQuizQuestion } from '@/lib/sport-quiz/content';
import {
  HINT_SKIP_COST,
  LEGEND_CORRECT_REWARD_COINS,
  LEGEND_REVEAL_COST,
  LEGEND_WRONG_PENALTY_COINS,
  MIN_COINS_TO_ANSWER,
} from '@/lib/sport-quiz/economy';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useSportQuiz } from '@/hooks/sport-quiz/use-sport-quiz';
import { useSportQuizContent } from '@/hooks/sport-quiz/use-sport-quiz-content';
import { useLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';

// Same answer-reveal timings as the Classic quiz.
const FADE_MS = 1000;
const MOVE_MS = 1700;
const UI_FADE_MS = 300;

// The puzzle grid over the face — 4 × 5 = 20 plates (like the reference).
const PLATE_COLS = 4;
const PLATE_ROWS = 5;

// FIXED answer-button height (compact, ~the original size) so all options are ALWAYS
// the same size (long answers wrap, then shrink the font if still needed).
const OPTION_HEIGHT = 64;

// Usable label box inside an answer button (same geometry as the Classic quiz).
const { width: SCREEN_W } = Dimensions.get('window');
const OPTION_BASE_FONT = 15;
const OPTION_TEXT_W = (SCREEN_W - 32) * 0.48 - 12 * 2 - 3;
const OPTION_TEXT_H = OPTION_HEIGHT - 6 * 2 - 3;

/**
 * Sports Legends question — opened by tapping a face on the level board. Same
 * Classic layout (counter · framed photo · 4 options · Skip/Next), but the photo
 * starts hidden under a grid of puzzle plates: each tap uncovers one plate for
 * LEGEND_REVEAL_COST coins. Guessing (or skipping) the athlete reveals the whole
 * photo, marks the face solved (it stays open on the board) and shows the bio.
 */
export default function SportLegendsQuiz() {
  const t = useSQLabels();
  const { locale } = useLocale();
  const { level, q } = useLocalSearchParams<{ level?: string; q?: string }>();
  const levelNumber = Number(level ?? 0);
  const questionId = Number(q ?? 0);
  const { snapshot } = useSportQuizContent();
  const { coins, addCoins, spendCoins, isSolved, markSolved, revealedPlatesFor, revealPlate } = useSportQuiz();
  const [reportOpen, setReportOpen] = useState(false);

  // Which face is open. Starts at the tapped face; solving + "Next" advances it to
  // the next UNSOLVED face of the level in place (no re-navigation), so the player
  // stays inside the level until every face is done.
  const [activeId, setActiveId] = useState(questionId);

  // The active question + its 1-based position within the level (the "number").
  const { question, position, total } = useMemo(() => {
    const list: SportQuizQuestion[] = snapshot ? legendsQuestionsForLevel(snapshot, levelNumber) : [];
    const idx = list.findIndex((qq) => qq.id === activeId);
    return { question: idx >= 0 ? list[idx] : null, position: idx + 1, total: list.length };
  }, [snapshot, levelNumber, activeId]);

  const alreadySolved = question ? isSolved(question.id) : false;

  // Whether the level was ALREADY fully cleared when opened → review mode: paging
  // just loops instead of re-showing the win screen (mirrors the Classic quiz).
  const enteredComplete = useMemo(() => {
    const list = snapshot ? legendsQuestionsForLevel(snapshot, levelNumber) : [];
    return list.length > 0 && list.every((qq) => isSolved(qq.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-question state. Wrong picks stay red until the correct one is chosen; the
  // photo reveals (all plates gone) once solved.
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);
  const [solved, setSolved] = useState(alreadySolved);
  const [revealing, setRevealing] = useState(alreadySolved);
  const [revealAnimated, setRevealAnimated] = useState(false);
  // Plates the player has paid to uncover — seeded from the PERSISTED set, so a
  // face keeps everything already opened when the question is re-entered.
  const [revealedPlates, setRevealedPlates] = useState<Set<number>>(
    () => new Set(question ? revealedPlatesFor(question.id) : []),
  );

  const onTapPlate = useCallback(
    (i: number) => {
      if (!question || solved || revealedPlates.has(i)) return;
      if (!spendCoins(LEGEND_REVEAL_COST)) {
        // Not enough coins to uncover another piece → the shop.
        router.push('/sport-quiz/shop');
        return;
      }
      setRevealedPlates((prev) => new Set(prev).add(i));
      revealPlate(question.id, i); // persist so it stays open after leaving
      Haptics.selectionAsync().catch(() => {});
    },
    [question, solved, revealedPlates, spendCoins, revealPlate],
  );

  const onPick = (option: string) => {
    if (!question || solved || wrongPicked.includes(option)) return;
    // Too poor to risk a wrong answer → straight to the shop, no pick accepted.
    // (Uncovering plates stays allowed — that only costs LEGEND_REVEAL_COST.)
    if (coins < MIN_COINS_TO_ANSWER) {
      router.push('/sport-quiz/shop');
      return;
    }
    if (option === question.correctAnswer) {
      const already = isSolved(question.id);
      setSolved(true);
      setRevealAnimated(true);
      markSolved(question.id);
      if (!already) addCoins(LEGEND_CORRECT_REWARD_COINS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setRevealing(true);
    } else {
      // A wrong pick costs coins (charged once per distinct wrong option).
      setWrongPicked((w) => [...w, option]);
      addCoins(-LEGEND_WRONG_PENALTY_COINS);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    }
  };

  const useSkip = () => {
    if (!question || solved) return;
    if (!spendCoins(HINT_SKIP_COST)) return;
    markSolved(question.id);
    setSolved(true);
    setRevealAnimated(true);
    Haptics.selectionAsync().catch(() => {});
    setRevealing(true);
  };

  // Move to another face of the level BY POSITION, CYCLICALLY, resetting per-question
  // state. Paging is a loop: past the last face wraps to the first, before the first
  // wraps to the last. An already-solved target opens fully revealed (review look);
  // landing on an unanswered face resets to gameplay (Next/Back hide, Skip shows).
  const goToOffset = useCallback(
    (delta: number) => {
      const list = snapshot ? legendsQuestionsForLevel(snapshot, levelNumber) : [];
      if (list.length === 0) return;
      const currentIdx = list.findIndex((qq) => qq.id === activeId);
      const nextIdx = (currentIdx + delta + list.length) % list.length;
      const cand = list[nextIdx];
      const answered = isSolved(cand.id);
      setWrongPicked([]);
      setSolved(answered);
      setRevealing(answered);
      setRevealAnimated(false);
      // Seed from the persisted set so previously bought plates stay open.
      setRevealedPlates(new Set(revealedPlatesFor(cand.id)));
      setActiveId(cand.id);
    },
    [snapshot, levelNumber, activeId, isSolved, revealedPlatesFor],
  );
  // Clearing the final face of the level opens the shared win screen; on a level
  // that was already complete when entered, Next just keeps paging in a loop.
  const goToNext = useCallback(() => {
    const list = snapshot ? legendsQuestionsForLevel(snapshot, levelNumber) : [];
    const allSolved = list.length > 0 && list.every((qq) => isSolved(qq.id));
    if (allSolved && !enteredComplete) {
      router.replace({
        pathname: '/sport-quiz/level-complete',
        params: { level: String(levelNumber), mode: 'legends' },
      });
      return;
    }
    goToOffset(1);
  }, [snapshot, levelNumber, isSolved, enteredComplete, goToOffset]);
  const goToPrev = useCallback(() => goToOffset(-1), [goToOffset]);

  const onShare = useCallback(async () => {
    const { storeUrl } = getStoreLinks(snapshot?.app, Platform.OS);
    const message = t.shareInvite.replace('{url}', storeUrl);
    try {
      await Share.share({ message });
    } catch {
      // cancelled
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

      {/* HUD: back · share · report · coins */}
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

      {/* Question number within the level. */}
      <Text style={styles.progress}>{`${position} / ${total}`}</Text>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Framed photo, hidden under the puzzle plates until uncovered/guessed. */}
        <View style={[styles.imageFrame, neonGlow(SQColors.neon, 10)]}>
          <Image source={{ uri: question.imageUri ?? undefined }} style={styles.image} contentFit="cover" />
          <PuzzleOverlay
            cols={PLATE_COLS}
            rows={PLATE_ROWS}
            revealed={revealedPlates}
            revealAll={solved}
            onTapPlate={onTapPlate}
          />
        </View>

        {/* No prompt / reveal-hint here — just the image, then the answer options
            pulled up by one option-button height. */}

        {/* Options grid — identical behaviour to the Classic quiz. */}
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
                layout={revealAnimated ? LinearTransition.duration(MOVE_MS).easing(Easing.out(Easing.cubic)) : undefined}
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
                  {/* Fixed-size button; the LABEL adapts: 90% → 85% → 80% → 75% … until the
                      text fits whole-word and centred. Never split. */}
                  <FitAnswerText
                    text={option}
                    style={textTone}
                    baseSize={OPTION_BASE_FONT}
                    maxWidth={OPTION_TEXT_W}
                    maxHeight={OPTION_TEXT_H}
                  />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>

        {/* Bio — the athlete's story, shown once solved. */}
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

      {/* Bottom: a "Back" button (when not on the first face) beside the primary
          action — Skip before solving, Next after — so faces page freely both
          backward and forward, including on completed levels. */}
      <View style={styles.bottom}>
        <View style={styles.navRow}>
          {solved && (
            <Pressable
              onPress={goToPrev}
              style={({ pressed }) => [
                styles.nextBtn,
                styles.navPrimary,
                neonGlow(SQColors.neon, 12),
                pressed && { opacity: 0.9 },
              ]}
            >
              <Ionicons name="arrow-back" size={22} color={SQColors.textOnNeon} />
              <Text style={styles.nextText}>{t.back}</Text>
            </Pressable>
          )}
          {solved ? (
            <Pressable
              onPress={goToNext}
              style={({ pressed }) => [
                styles.nextBtn,
                styles.navPrimary,
                neonGlow(SQColors.neon, 12),
                pressed && { opacity: 0.9 },
              ]}
            >
              <Text style={styles.nextText}>{t.next}</Text>
              <Ionicons name="arrow-forward" size={22} color={SQColors.textOnNeon} />
            </Pressable>
          ) : (
            <Pressable
              disabled={coins < HINT_SKIP_COST}
              onPress={useSkip}
              style={({ pressed }) => [
                styles.skipBtn,
                styles.navPrimary,
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
      </View>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} questionId={question.id} locale={locale} />
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

  progress: {
    textAlign: 'center',
    color: SQColors.neonPink,
    fontWeight: '900',
    fontSize: 18,
    marginTop: 6,
    marginBottom: 10,
    textShadowColor: SQColors.neonPink,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 8 },

  imageFrame: {
    alignSelf: 'center',
    width: '74%',
    aspectRatio: 3 / 4,
    borderRadius: SQRadius.md,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    backgroundColor: 'rgba(9,24,40,0.5)',
    overflow: 'hidden',
    marginTop: 2,
    marginBottom: 10,
  },
  image: { width: '100%', height: '100%' },

  revealHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 },
  revealHintText: { color: SQColors.textMuted, fontWeight: '700', fontSize: 12 },

  prompt: {
    fontSize: 20,
    fontWeight: '900',
    color: SQColors.text,
    textAlign: 'center',
    marginTop: 0,
    marginBottom: 16,
  },

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
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  navPrimary: { flexGrow: 1, flexShrink: 1, flexBasis: 0, marginHorizontal: 0 },
  // Fixed height + flexBasis 0 so Back and Next are ALWAYS exactly the same size,
  // in every state (right after answering as well as when paging a solved level).
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SQColors.neon,
    borderRadius: SQRadius.pill,
    height: 56,
    paddingVertical: 0,
  },
  nextText: { color: SQColors.textOnNeon, fontWeight: '900', fontSize: 18, letterSpacing: 0.5 },

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
  skipLabel: { color: '#EAFFF8', fontWeight: '900', fontSize: 28, letterSpacing: 0.5 },
  costTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  costText: { fontSize: 20, fontWeight: '900', color: SQColors.coin },
});
