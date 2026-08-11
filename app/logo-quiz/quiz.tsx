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
import { questionsForLevel, type LogoQuizQuestion } from '@/lib/logo-quiz/content';
import { HINT_5050_COST, HINT_SKIP_COST } from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLogoQuizContent } from '@/hooks/logo-quiz/use-logo-quiz-content';

// The player always returns to the level-select list from a round.
const BACK_ROUTE = '/logo-quiz/categories';

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
  const { level, q, mode } = useLocalSearchParams<{ level?: string; q?: string; mode?: string }>();
  const levelNumber = Number(level ?? 0);
  const { snapshot } = useLogoQuizContent();
  const {
    coins,
    isPremium,
    livesState,
    awardCorrect,
    spendCoins,
    loseLife,
    getLives,
    isSolved,
    markSolved,
  } = useLogoQuiz();

  // Review = browsing an already-solved logo: no economy, the Explanation is
  // always shown, and ◀/▶ page through the level's solved questions. Captured
  // once for the whole run.
  const review = useMemo(() => mode === 'review', []); // eslint-disable-line react-hooks/exhaustive-deps

  // Every question of this level from the backend snapshot, frozen at mount.
  const levelQuestions = useMemo<LogoQuizQuestion[]>(() => {
    if (!snapshot || !level) return [];
    return questionsForLevel(snapshot, levelNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The list the run actually walks:
  //  - review  → the solved questions of this level (what ◀/▶ pages through)
  //  - play    → the playable questions: a non-subscriber only ever traverses
  //              the 9 free ones (premium logos are gated in the grid), a
  //              subscriber traverses all 15. Frozen for the whole run.
  const runList = useMemo<LogoQuizQuestion[]>(() => {
    if (review) return levelQuestions.filter((question) => isSolved(question.id));
    return isPremium ? levelQuestions : levelQuestions.filter((question) => !question.premium);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start on the tapped question when given, else the first unsolved playable one.
  const [index, setIndex] = useState(() => {
    if (q) {
      const target = runList.findIndex((question) => String(question.id) === String(q));
      if (target >= 0) return target;
    }
    if (!review) {
      const firstUnsolved = runList.findIndex((question) => !isSolved(question.id));
      if (firstUnsolved >= 0) return firstUnsolved;
    }
    return 0;
  });

  const question = runList[index];

  // Wrong picks stay red; the answer turns green only once it is picked (solved).
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  // A review question opens already solved & revealed so the Explanation shows.
  const [solved, setSolved] = useState(review);
  // Game over: lock the board WITHOUT revealing the answer green (unlike `solved`).
  const [over, setOver] = useState(false);
  // Answer reveal in progress: the wrong options unmount (fading out) while the
  // correct green answer — the same mounted component — glides up and centers via
  // Reanimated layout animations. Drives the whole in-place reveal (see below).
  const [revealing, setRevealing] = useState(review);

  // Defense-in-depth premium gate: a review/deep link that targets a premium
  // logo the current user can't play is bounced to the paywall (the grid already
  // gates taps, but a stale link could arrive here directly).
  useEffect(() => {
    if (review || !q) return;
    const target = levelQuestions.find((question) => String(question.id) === String(q));
    if (target?.premium && !isPremium) router.replace('/logo-quiz/shop');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Empty pool guard (bad link, or backend not emitting `order` yet).
  useEffect(() => {
    if (runList.length === 0) router.back();
  }, [runList.length]);

  const toResult = useCallback(
    (outcome: 'complete' | 'gameover', score: number) => {
      router.replace({
        pathname: '/logo-quiz/result',
        params: {
          score: String(score),
          total: String(runList.length),
          outcome,
        },
      });
    },
    [runList.length],
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
      // Correct: light the answer green, award coins (2× premium), mark the
      // question solved, then play the in-place reveal.
      setSolved(true);
      awardCorrect();
      markSolved(question.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      startReveal();
    } else {
      // Wrong: keep this option red and stay on the question so the player can keep
      // trying. Each mistake loses a life (game over at zero).
      setWrongPicked((w) => [...w, option]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      loseLife();
      // Game over only once every life is spent — the question stays unsolved.
      if (getLives() <= 0) {
        setOver(true); // lock the board (no green reveal) while game-over loads
        setTimeout(() => toResult('gameover', index), GAMEOVER_MS);
      }
    }
  };

  const use5050 = () => {
    if (solved || over || fiftyUsed) return;
    if (!spendCoins(HINT_5050_COST)) return;
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
    if (!spendCoins(HINT_SKIP_COST)) return;
    // Skip reveals the brand green, marks it solved (counts as passed) and runs
    // the same in-place reveal as a normal solve — costs the hint fee, no reward.
    markSolved(question.id);
    setSolved(true);
    Haptics.selectionAsync().catch(() => {});
    startReveal();
  };

  // Reset every per-question flag and show `nextIndex` in place. In review the
  // question opens already solved & revealed so the Explanation stays visible.
  const goToIndex = useCallback(
    (nextIndex: number) => {
      setWrongPicked([]);
      setRemoved([]);
      setFiftyUsed(false);
      setOver(false);
      setSolved(review);
      setRevealing(review);
      setIndex(nextIndex);
      Haptics.selectionAsync().catch(() => {});
    },
    [review],
  );
  // Review paging — wraps around the level's solved questions.
  const goPrev = () => goToIndex((index - 1 + runList.length) % runList.length);
  const goNext = () => goToIndex((index + 1) % runList.length);

  // "Next" after a reveal (play only): advance to the following question in the
  // run, or — on the last one — open the Result screen. A level never rolls into
  // the next one automatically.
  const advance = () => {
    const next = index + 1;
    if (next >= runList.length) {
      toResult('complete', runList.length);
      return;
    }
    goToIndex(next);
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
          onPress={() => router.dismissTo(BACK_ROUTE)}
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

      {/* Progress — position within the run, or a Review tag when browsing. */}
      <Text style={styles.progress}>
        {review ? t.review : `${index + 1} / ${runList.length}`}
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
          unmounts, keeping "Next"/review paging instant (only the in-reveal
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
          blank) + "Next" (play only), rendered below the centered answer. Fades in
          only after the answer's glide lands (FadeIn.delay(MOVE_MS)); it sits below
          the answer in normal flow, so mounting it never shifts the answer. */}
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
          {!review && (
            <Pressable
              onPress={advance}
              style={({ pressed }) => [styles.nextBtn, LQShadow.card, pressed && { opacity: 0.9 }]}
            >
              <Text style={styles.nextText}>{t.next}</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* Bottom row: hint buttons during a real run; while reviewing a solved logo
          they become prev / next paging through the level's solved questions. */}
      <View style={styles.hints}>
        {review ? (
          <>
            <NavButton label={t.prevLogo} icon="arrow-back" onPress={goPrev} />
            <NavButton label={t.nextLogo} icon="arrow-forward" iconRight onPress={goNext} />
          </>
        ) : (
          <>
            <HintButton
              label={t.fiftyFifty}
              cost={HINT_5050_COST}
              disabled={solved || over || fiftyUsed || coins < HINT_5050_COST}
              onPress={use5050}
            />
            <HintButton
              label={t.skip}
              cost={HINT_SKIP_COST}
              disabled={solved || over || coins < HINT_SKIP_COST}
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

// Prev/next paging button used while reviewing a solved logo. `iconRight` puts
// the arrow after the label (for "next"), otherwise before it (for "prev").
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
