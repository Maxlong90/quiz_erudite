import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { AppBackground } from '@/components/logo-quiz/app-background';
import { CoinPill, LivesPill } from '@/components/logo-quiz/hud';
import { CoinIcon } from '@/components/logo-quiz/coin-icon';
import { LogoDisplay } from '@/components/logo-quiz/logo-display';
import { questionsForCategory, type LogoQuizQuestion } from '@/lib/logo-quiz/content';
import { HINT_5050_COST, HINT_SKIP_COST } from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLogoQuizContent } from '@/hooks/logo-quiz/use-logo-quiz-content';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// How long the red game-over state shows before the Game-over screen loads.
const GAMEOVER_MS = 900;
// Answer-reveal timings: the wrong options fade out over ~1s while the correct
// answer simultaneously glides up under the question over ~1.7s; once it lands,
// the Explanation panel + "Next" button fade in.
const FADE_MS = 1000;
const MOVE_MS = 1700;
const UI_FADE_MS = 300;

export default function LogoQuizQuiz() {
  const t = useLQLabels();
  const { category, vip } = useLocalSearchParams<{ category?: string; vip?: string }>();
  const cat = category ?? '';
  const { snapshot } = useLogoQuizContent();
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

  // Sequential question list for this category from the backend snapshot cache —
  // played in order, never shuffled. Frozen for the whole run at mount.
  const questions = useMemo<LogoQuizQuestion[]>(() => {
    if (!snapshot || !category) return [];
    return questionsForCategory(snapshot, category);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The level (question index) the player is on. A finished category restarts.
  // Stateful so a completed-category practice replay can page between levels.
  const [index, setIndex] = useState(() => {
    const saved = getProgress(cat);
    return saved >= questions.length ? 0 : saved;
  });

  const question = questions[index];

  // Back returns to the category picker the round was opened from — VIP list for a
  // VIP category, the regular list otherwise.
  // NB: this picker screen is already sitting in the stack *below* the quiz, so
  // returning to it must POP back to that existing instance (router.dismissTo),
  // never router.replace — a replace would swap the quiz for a *second*
  // categories screen, leaving a duplicate underneath. That duplicate is what
  // made the category screen's back button need two taps to reach Welcome.
  const isVip = vip === '1';
  const backRoute = isVip ? '/logo-quiz/categories-vip' : '/logo-quiz/categories';

  // Wrong picks stay red; the answer turns green only once it is picked (solved).
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  const [solved, setSolved] = useState(false);
  // Game over: lock the board WITHOUT revealing the answer green (unlike `solved`).
  const [over, setOver] = useState(false);
  // Answer reveal in progress: the wrong options unmount (fading out) while the
  // correct green answer — the same mounted component — glides up and centers via
  // Reanimated layout animations. Drives the whole in-place reveal (see below).
  const [revealing, setRevealing] = useState(false);

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
          vip: vip ?? '',
          // On a game over, remember the current level so "Play again" can resume.
          ...(outcome === 'gameover' ? { failed: String(question?.id ?? '') } : {}),
        },
      });
    },
    [questions.length, cat, vip, question],
  );

  // Play the in-place answer reveal. Flipping `revealing` drives everything via
  // Reanimated layout animations: the wrong options unmount and fade out (~1s,
  // FadeOut), the correct green answer — the same mounted component — glides up
  // and centers as the layout reflows (~1.7s, LinearTransition), and once it
  // lands the Explanation + "Next" panel fades in (FadeIn.delay(MOVE_MS)).
  const startReveal = useCallback(() => {
    setRevealing(true);
  }, []);

  const onPick = (option: string) => {
    if (solved || over || wrongPicked.includes(option)) return;
    if (option === question.brand) {
      // Level passed: light the answer green, award coins (2× premium) unless this
      // is a practice replay, advance progress, then play the in-place reveal.
      setSolved(true);
      if (!practice) awardCorrect();
      const next = index + 1;
      const lastPassed = next >= questions.length;
      if (lastPassed) markCompleted(cat);
      else setProgress(cat, next);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      startReveal();
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
          setTimeout(() => toResult('gameover', index), GAMEOVER_MS);
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
        (o) => o !== question.brand && !removed.includes(o) && !wrongPicked.includes(o),
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
    // A skip reveals the brand green and runs the same in-place reveal (answer
    // glides up, then Explanation + "Next") as a normal solve.
    setSolved(true);
    Haptics.selectionAsync().catch(() => {});
    startReveal();
  };

  // Reset every per-question flag (incl. the reveal animation) and show `nextIndex`
  // in place — used by "Next" during a real run and by prev/next in a practice replay.
  const goToLevel = useCallback((nextIndex: number) => {
    setWrongPicked([]);
    setRemoved([]);
    setFiftyUsed(false);
    setSolved(false);
    setOver(false);
    setRevealing(false);
    setIndex(nextIndex);
    Haptics.selectionAsync().catch(() => {});
  }, []);
  const goPrev = () => goToLevel((index - 1 + questions.length) % questions.length);
  const goNext = () => goToLevel((index + 1) % questions.length);

  // "Next" after a reveal: advance to the following question in place, or — on a
  // real run's last question — open the Victory screen (the whole category is
  // cleared). A practice replay just wraps back to the first level, no Victory.
  const advance = () => {
    const next = index + 1;
    if (next >= questions.length) {
      if (!practice) toResult('complete', questions.length);
      else goToLevel(0);
      return;
    }
    goToLevel(next);
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
          <LivesPill
            livesState={livesState}
            isPremium={isPremium}
            onZeroPress={() => router.push('/logo-quiz/shop')}
          />
          <CoinPill coins={coins} onPress={() => router.push('/logo-quiz/shop')} />
        </View>
      </View>

      {/* Progress */}
      <Text style={styles.progress}>
        {index + 1} / {questions.length}
      </Text>

      {/* Logo */}
      <View style={styles.logoArea}>
        <LogoDisplay imageUri={question.imageUri} size={210} />
        <Text style={styles.prompt}>{t.whichBrand}</Text>
      </View>

      {/* Options — the answer grid. On a correct reveal the wrong options unmount
          (FadeOut) while the correct answer, kept mounted with a stable key,
          glides up and centers (LinearTransition) as the container re-centers the
          lone survivor. No layout swap, so it animates smoothly from any position.
          The container is keyed by question id so a level change remounts the whole
          grid as a unit — Reanimated skips child exit animations when their parent
          unmounts, keeping "Next"/practice paging instant (only the in-reveal
          per-item removal, where the container persists, plays FadeOut). */}
      <View key={question.id} style={[styles.options, revealing && styles.optionsRevealing]}>
        {question.options.map((option) => {
          const isAnswer = option === question.brand;
          // During the reveal the wrong options leave the tree; unmounting is what
          // fires their exiting FadeOut and frees the layout for the answer's glide.
          if (revealing && !isAnswer) return null;
          const isRemoved = removed.includes(option);
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
              layout={LinearTransition.duration(MOVE_MS).easing(Easing.out(Easing.cubic))}
              // Only wrong options fade out (on reveal). The answer never exits — it
              // stays mounted and glides — so it can't flash a fade when the level changes.
              exiting={isAnswer ? undefined : FadeOut.duration(FADE_MS)}
              style={styles.optionWrap}
            >
              <Pressable
                disabled={solved || over || revealing || isRemoved || isWrong}
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
            </Animated.View>
          );
        })}
      </View>

      {/* Reveal panel — Explanation (localized `question.explanation`, omitted when
          blank) + "Next", rendered below the centered answer. Fades in only after
          the answer's glide lands (FadeIn.delay(MOVE_MS)); it sits below the answer
          in normal flow, so mounting it never shifts the answer. */}
      {revealing && (
        <Animated.View
          entering={FadeIn.delay(MOVE_MS).duration(UI_FADE_MS)}
          style={[styles.revealArea, styles.revealUi]}
        >
          {!!question.explanation && question.explanation.trim().length > 0 && (
            <View style={styles.explBlock}>
              <Text style={styles.explHeading}>{t.explanations}</Text>
              <ScrollView
                style={styles.explScroll}
                contentContainerStyle={styles.explContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={[styles.explCard, LQShadow.card]}>
                  <Text style={styles.explText}>{question.explanation}</Text>
                </View>
              </ScrollView>
            </View>
          )}
          <Pressable
            onPress={advance}
            style={({ pressed }) => [styles.nextBtn, LQShadow.card, pressed && { opacity: 0.9 }]}
          >
            <Text style={styles.nextText}>{t.next}</Text>
          </Pressable>
        </Animated.View>
      )}

      {/* Bottom row: hint buttons during a real run; in a completed-category
          practice replay they become level navigation (prev / next) that pages
          through the questions without ever showing a Result screen. */}
      <View style={styles.hints}>
        {practice ? (
          <>
            <NavButton label={t.prevLevel} icon="arrow-back" onPress={goPrev} />
            <NavButton label={t.nextLevel} icon="arrow-forward" iconRight onPress={goNext} />
          </>
        ) : (
          <>
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
          </>
        )}
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

// Level-navigation button used in a completed-category practice replay. `iconRight`
// puts the arrow after the label (for "next"), otherwise before it (for "prev").
function NavButton({
  label,
  icon,
  iconRight,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconRight?: boolean;
  onPress: () => void;
}) {
  const arrow = <Ionicons name={icon} size={20} color={LQColors.text} />;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.navBtn, LQShadow.card, pressed && { transform: [{ scale: 0.98 }] }]}
    >
      {!iconRight && arrow}
      <Text style={styles.navLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
      {iconRight && arrow}
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
  // While revealing only the correct answer remains — center the lone 48%-wide
  // survivor so its LinearTransition glides it to the middle under the question.
  optionsRevealing: { justifyContent: 'center' },
  // Grid slot (the flex-wrapped, animated child). The button fills it so the
  // per-option translate/opacity animation runs on the slot, not the layout.
  optionWrap: { width: '48%' },
  option: {
    width: '100%',
    backgroundColor: LQColors.surfaceAlt,
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

  // Reveal panel (below the glided-up green answer): the Explanation card, then
  // the "Next" button — horizontally padded and centered.
  revealArea: { paddingHorizontal: 16 },
  revealUi: { marginTop: 16, alignItems: 'center' },
  explBlock: { width: '100%', marginBottom: 4 },
  explHeading: {
    fontSize: 14,
    fontWeight: '900',
    color: LQColors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  explScroll: { maxHeight: 170, width: '100%' },
  explContent: { paddingBottom: 2 },
  explCard: {
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: LQColors.border,
  },
  explText: { fontSize: 14, fontWeight: '600', color: LQColors.textMuted, lineHeight: 20, textAlign: 'center' },
  nextBtn: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: LQColors.primary,
    borderRadius: LQRadius.pill,
    paddingVertical: 14,
    paddingHorizontal: 44,
  },
  nextText: { color: '#fff', fontWeight: '900', fontSize: 17 },

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
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  hintDisabled: { opacity: 0.7 },
  hintLabel: { fontSize: 15, fontWeight: '900', color: LQColors.text },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: LQColors.surface,
    borderRadius: LQRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  navLabel: { fontSize: 15, fontWeight: '900', color: LQColors.text, flexShrink: 1 },
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
