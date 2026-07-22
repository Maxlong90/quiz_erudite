import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { LogoDisplay } from '@/components/logo-quiz/logo-display';
import { LOGO_CATEGORIES, VIP_CATEGORIES, getCategory, type LogoQuestion } from '@/constants/logo-quiz/mock-data';
import { HINT_5050_COST, HINT_SKIP_COST } from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// How long the green "solved" (or red game-over) state shows before navigating.
const REVEAL_MS = 900;

export default function LogoQuizQuiz() {
  const t = useLQLabels();
  const { category } = useLocalSearchParams<{ category?: string }>();
  const cat = category ?? 'all';
  const {
    coins,
    isPremium,
    livesState,
    awardCorrect,
    spendCoins,
    loseLife,
    getLives,
    getProgress,
    setProgress,
    isCompleted,
    markCompleted,
  } = useLogoQuiz();

  // A category finished once before is replayed as a free practice: no coin
  // rewards, no life loss, and free hints. Captured once for the whole run.
  const practice = useMemo(() => isCompleted(cat), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sequential question list for this category — played in order, never shuffled.
  const questions = useMemo<LogoQuestion[]>(() => {
    if (!category || category === 'all') {
      return LOGO_CATEGORIES.filter((c) => !c.vip || isPremium).flatMap((c) => c.questions);
    }
    return getCategory(category)?.questions ?? [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The level (question index) the player is on. A finished category restarts.
  const index = useMemo(() => {
    const saved = getProgress(cat);
    return saved >= questions.length ? 0 : saved;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const question = questions[index];

  // Back returns to the category picker the round was opened from — VIP list for a
  // VIP category, the regular list otherwise.
  // NB: this picker screen is already sitting in the stack *below* the quiz, so
  // returning to it must POP back to that existing instance (router.dismissTo),
  // never router.replace — a replace would swap the quiz for a *second*
  // categories screen, leaving a duplicate underneath. That duplicate is what
  // made the category screen's back button need two taps to reach Welcome.
  const backRoute = VIP_CATEGORIES.some((c) => c.id === cat)
    ? '/logo-quiz/categories-vip'
    : '/logo-quiz/categories';

  // Wrong picks stay red; the answer turns green only once it is picked (solved).
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  const [solved, setSolved] = useState(false);
  // Game over: lock the board WITHOUT revealing the answer green (unlike `solved`).
  const [over, setOver] = useState(false);

  // Empty pool guard (shouldn't happen with current mock data).
  useEffect(() => {
    if (questions.length === 0) router.back();
  }, [questions.length]);

  const toResult = useCallback(
    (outcome: 'complete' | 'gameover', levelsPassed: number) => {
      router.replace({
        pathname: '/logo-quiz/result',
        params: {
          score: String(levelsPassed),
          total: String(questions.length),
          outcome,
          category: cat,
          // On a game over, remember the current level so "Play again" can resume.
          ...(outcome === 'gameover' ? { failed: question?.id ?? '' } : {}),
        },
      });
    },
    [questions.length, cat, question],
  );

  const onPick = (option: string) => {
    if (solved || over || wrongPicked.includes(option)) return;
    if (option === question.answer) {
      // Level passed: light the answer green, award coins (2× premium) unless this
      // is a practice replay, advance progress, then show the win screen.
      setSolved(true);
      if (!practice) awardCorrect();
      const next = index + 1;
      const lastPassed = next >= questions.length;
      if (lastPassed) markCompleted(cat);
      else setProgress(cat, next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Finishing the category's last question skips the win screen and returns
      // straight to the category list; other levels show the win screen.
      setTimeout(
        () => (lastPassed ? router.dismissTo(backRoute) : toResult('complete', next)),
        REVEAL_MS,
      );
    } else {
      // Wrong: keep this option red and stay on the question so the player can keep
      // trying. A real run loses a life per mistake (game over at zero); a practice
      // replay costs nothing.
      setWrongPicked((w) => [...w, option]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      if (!practice) {
        loseLife();
        // Game over only once every life is spent — progress stays on this level.
        if (getLives() <= 0) {
          setOver(true); // lock the board (no green reveal) while game-over loads
          setTimeout(() => toResult('gameover', index), REVEAL_MS);
        }
      }
    }
  };

  const use5050 = () => {
    if (solved || over || fiftyUsed) return;
    if (!practice && !spendCoins(HINT_5050_COST)) return;
    // Remove three of the still-standing wrong options — those not already
    // eliminated (red wrong-picks or a prior 50/50 removal). With no red picks
    // yet this leaves the answer + two wrong; once some are red, it clears three
    // more of the remaining non-red wrongs (all of them if fewer than three).
    const wrongs = shuffle(
      question.options.filter(
        (o) => o !== question.answer && !removed.includes(o) && !wrongPicked.includes(o),
      ),
    );
    setRemoved((r) => [...r, ...wrongs.slice(0, 3)]);
    setFiftyUsed(true);
    Haptics.selectionAsync().catch(() => {});
  };

  const useSkip = () => {
    if (solved || over) return;
    if (!practice && !spendCoins(HINT_SKIP_COST)) return;
    // Skip-to-next-level: the current level counts as passed. Costs the hint fee
    // only (no coin reward); a practice replay is free.
    const next = index + 1;
    const lastPassed = next >= questions.length;
    if (lastPassed) markCompleted(cat);
    else setProgress(cat, next);
    Haptics.selectionAsync().catch(() => {});
    // Skipping the last question returns to the category list, not the win screen.
    if (lastPassed) router.dismissTo(backRoute);
    else toResult('complete', next);
  };

  if (!question) {
    return <View style={styles.fill} />;
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      {/* HUD: back · lives · coins */}
      <View style={styles.hud}>
        <Pressable
          onPress={() => router.dismissTo(backRoute)}
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, LQShadow.card, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <View style={styles.hudRight}>
          <LivesPill livesState={livesState} isPremium={isPremium} />
          <CoinPill coins={coins} />
        </View>
      </View>

      {/* Progress */}
      <Text style={styles.progress}>
        {index + 1} / {questions.length}
      </Text>

      {/* Logo */}
      <View style={styles.logoArea}>
        <LogoDisplay question={question} size={210} />
        <Text style={styles.prompt}>{t.whichBrand}</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        {question.options.map((option) => {
          const isRemoved = removed.includes(option);
          const isAnswer = option === question.answer;
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
            <Pressable
              key={option}
              disabled={solved || over || isRemoved || isWrong}
              onPress={() => onPick(option)}
              style={({ pressed }) => [
                styles.option,
                LQShadow.card,
                tone,
                isRemoved && styles.optionRemoved,
                pressed && !solved && !over && !isRemoved && !isWrong && { transform: [{ scale: 0.98 }] },
              ]}
            >
              <Text style={[textTone]} numberOfLines={1}>
                {isRemoved ? '' : option}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Hint buttons — text + coin cost; disabled when the player can't pay */}
      <View style={styles.hints}>
        <HintButton
          label={t.fiftyFifty}
          cost={HINT_5050_COST}
          disabled={solved || over || fiftyUsed || (!practice && coins < HINT_5050_COST)}
          onPress={use5050}
        />
        <HintButton
          label={t.skip}
          cost={HINT_SKIP_COST}
          disabled={solved || over || (!practice && coins < HINT_SKIP_COST)}
          onPress={useSkip}
        />
      </View>
    </SafeAreaView>
  );
}

function HintButton({
  label,
  cost,
  disabled,
  onPress,
}: {
  label: string;
  cost: number;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.hint,
        LQShadow.card,
        disabled && styles.hintDisabled,
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      <Text
        style={[styles.hintLabel, disabled && { color: LQColors.disabled }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      <View style={[styles.costTag, disabled && { backgroundColor: LQColors.bgAlt }]}>
        <CoinIcon size={13} style={disabled ? { opacity: 0.5 } : undefined} />
        <Text style={[styles.costText, disabled && { color: LQColors.disabled }]}>{cost}</Text>
      </View>
    </Pressable>
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: LQRadius.pill,
    backgroundColor: LQColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  progress: { textAlign: 'center', color: LQColors.textFaint, fontWeight: '800', fontSize: 13 },

  logoArea: { alignItems: 'center', marginTop: 8, marginBottom: 14 },
  prompt: { fontSize: 17, fontWeight: '800', color: LQColors.text, marginTop: 16 },

  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    rowGap: 12,
  },
  option: {
    width: '48%',
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.md,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionIdle: {},
  optionRemoved: { opacity: 0.25 },
  optionCorrect: { backgroundColor: LQColors.successBg, borderColor: LQColors.success },
  optionWrong: { backgroundColor: LQColors.wrongBg, borderColor: LQColors.wrong },
  optionText: { fontSize: 16, fontWeight: '800', color: LQColors.text },
  optionTextStrong: { fontSize: 16, fontWeight: '900', color: LQColors.text },

  hints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 'auto',
    paddingTop: 14,
    paddingBottom: 8,
  },
  hint: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  hintDisabled: { opacity: 0.7 },
  hintLabel: { fontSize: 15, fontWeight: '900', color: LQColors.text },
  costTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LQColors.bg,
    borderRadius: LQRadius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  costText: { fontSize: 13, fontWeight: '900', color: LQColors.coinDark },
});
