import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
  TurboModuleRegistry,
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
import { ShareCard } from '@/components/logo-quiz/share-card';
import { questionsForLevel, type LogoQuizQuestion } from '@/lib/logo-quiz/content';
import { HINT_5050_COST, HINT_SKIP_COST } from '@/lib/logo-quiz/economy';
import { LQColors, LQRadius, LQShadow } from '@/constants/logo-quiz/theme';
import { useLQLabels } from '@/constants/logo-quiz/labels';
import { useLogoQuiz } from '@/hooks/logo-quiz/use-logo-quiz';
import { useLogoQuizContent } from '@/hooks/logo-quiz/use-logo-quiz-content';
import { useLocale } from '@/hooks/use-locale';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';

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
  const { locale } = useLocale();
  const { level, q } = useLocalSearchParams<{ level?: string; q?: string }>();
  const levelNumber = Number(level ?? 0);
  const { snapshot } = useLogoQuizContent();
  const [menuOpen, setMenuOpen] = useState(false);
  // Off-screen composition (logo + neutral options grid) captured to a temp PNG
  // for the "Share a logo" action — see ShareCard + captureShareImage below.
  const shareCardRef = useRef<View>(null);
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

  // Every question of this level from the backend snapshot, frozen at mount.
  const levelQuestions = useMemo<LogoQuizQuestion[]>(() => {
    if (!snapshot || !level) return [];
    return questionsForLevel(snapshot, levelNumber);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The level's ACCESSIBLE questions in play order — a non-subscriber only ever
  // traverses the 9 free ones (premium logos are gated in the grid), a
  // subscriber traverses all 15. Frozen for the whole run; ◀/▶ page within it.
  const runList = useMemo<LogoQuizQuestion[]>(
    () => (isPremium ? levelQuestions : levelQuestions.filter((question) => !question.premium)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Start on the tapped question when given, else the first unsolved one.
  const initialIndex = useMemo(() => {
    if (q) {
      const target = runList.findIndex((question) => String(question.id) === String(q));
      if (target >= 0) return target;
    }
    const firstUnsolved = runList.findIndex((question) => !isSolved(question.id));
    return firstUnsolved >= 0 ? firstUnsolved : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(initialIndex);

  const question = runList[index];

  // Whether the question we open on is already answered: an answered question
  // opens revealed (green + Explanation + ◀/▶ nav), an unanswered one plays.
  const initialAnswered = useMemo(() => {
    const first = runList[initialIndex];
    return first ? isSolved(first.id) : false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Wrong picks stay red; the answer turns green only once it is picked (solved).
  const [wrongPicked, setWrongPicked] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [fiftyUsed, setFiftyUsed] = useState(false);
  // `solved` tracks the CURRENT question's answered state: true for an already-
  // solved logo (opens as review) and flipped true in place when the player
  // answers. It drives the green reveal, the Explanation panel and ◀/▶ nav.
  const [solved, setSolved] = useState(initialAnswered);
  // Game over: lock the board WITHOUT revealing the answer green (unlike `solved`).
  const [over, setOver] = useState(false);
  // Answer reveal in progress: the wrong options unmount (fading out) while the
  // correct green answer — the same mounted component — glides up and centers via
  // Reanimated layout animations. Drives the whole in-place reveal (see below).
  const [revealing, setRevealing] = useState(initialAnswered);
  // Whether the current reveal should ANIMATE in (a fresh correct answer/skip:
  // the Explanation + ◀/▶ nav fade in together once the answer glide lands) or
  // appear INSTANTLY (opening an already-solved logo in review). Starts false:
  // an initial answered question is review (instant), an unanswered one isn't
  // revealing at all.
  const [revealAnimated, setRevealAnimated] = useState(false);

  // Defense-in-depth premium gate: a review/deep link that targets a premium
  // logo the current user can't play is bounced to the paywall (the grid already
  // gates taps, but a stale link could arrive here directly).
  useEffect(() => {
    if (!q) return;
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

  // Whether solving `currentId` clears the level's whole accessible set (9 free
  // for a non-subscriber, all 15 for a subscriber). `isSolved` reflects state
  // before this solve is committed, so the current id is counted via the guard.
  const completesLevel = useCallback(
    (currentId: number) => runList.every((qq) => qq.id === currentId || isSolved(qq.id)),
    [runList, isSolved],
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
      setRevealAnimated(true);
      awardCorrect();
      markSolved(question.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      startReveal();
      // Clearing the level's last accessible logo (9/9 free or 15/15 premium)
      // wins the round → Victory screen immediately, no delay.
      if (completesLevel(question.id)) {
        toResult('complete', runList.length);
      }
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
    setRevealAnimated(true);
    Haptics.selectionAsync().catch(() => {});
    startReveal();
    // A skip that clears the level's last accessible logo still wins the round —
    // Victory opens immediately, no delay.
    if (completesLevel(question.id)) {
      toResult('complete', runList.length);
    }
  };

  // Reset every per-question flag and show `nextIndex` in place. In review the
  // question opens already solved & revealed so the Explanation stays visible.
  const goToIndex = useCallback(
    (nextIndex: number) => {
      const target = runList[nextIndex];
      const targetAnswered = target ? isSolved(target.id) : false;
      setWrongPicked([]);
      setRemoved([]);
      setFiftyUsed(false);
      setOver(false);
      // An already-answered target opens revealed (review look); an unanswered
      // one resets to normal gameplay with hints. Review shows the reveal UI
      // INSTANTLY — no delayed fade — so paging onto a solved logo isn't laggy.
      setSolved(targetAnswered);
      setRevealing(targetAnswered);
      setRevealAnimated(false);
      setIndex(nextIndex);
      Haptics.selectionAsync().catch(() => {});
    },
    [runList, isSolved],
  );
  // ◀/▶ cycle within the level's accessible set (9 free / 15 premium),
  // wrapping around: Next from the last → the first, Prev from the first → the
  // last. Landing on an unanswered logo re-enables gameplay via goToIndex.
  const goPrev = () => {
    if (runList.length > 0) goToIndex((index - 1 + runList.length) % runList.length);
  };
  const goNext = () => {
    if (runList.length > 0) goToIndex((index + 1) % runList.length);
  };

  // Capture the off-screen ShareCard (logo + neutral options) to a temp PNG the
  // "…" menu shares. Returns the file uri, or null if the capture failed so the
  // menu can fall back to a text-only invite. react-native-view-shot is a native
  // module bundled in Expo Go, but a standalone binary built before the dependency
  // was added won't have it. Probe the TurboModule registry FIRST (get() returns
  // null without throwing) so we never trigger the library's throwing getEnforcing
  // init — that would surface a dev error overlay even though we catch it. When the
  // module is absent we simply fall back to sharing the text-only invite.
  const captureShareImage = useCallback(async (): Promise<string | null> => {
    if (!shareCardRef.current) return null;
    if (!TurboModuleRegistry.get('RNViewShot')) return null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy so the native module only loads when it is actually present
      const { captureRef } = require('react-native-view-shot');
      return await captureRef(shareCardRef, { format: 'png', quality: 0.95 });
    } catch {
      return null;
    }
  }, []);

  if (!question) {
    return <View style={styles.fill} />;
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground />
      <StatusBar style="dark" />

      {/* HUD: back on the left; ⋯ · lives · coins on the right — the same lives +
          coins placement as the level-select and grid headers, with the ⋯ menu
          sitting just left of the lives pill. */}
      <View style={styles.hud}>
        <Pressable
          onPress={() =>
            router.dismissTo({
              pathname: '/logo-quiz/level',
              params: { level: String(levelNumber) },
            })
          }
          hitSlop={8}
          style={({ pressed }) => [styles.backBtn, LQShadow.card, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="chevron-back" size={22} color={LQColors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [styles.backBtn, LQShadow.card, pressed && { opacity: 0.85 }]}
            testID="quiz-menu-button"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={LQColors.text} />
          </Pressable>
          <LivesPill
            livesState={livesState}
            isPremium={isPremium}
            onZeroPress={() => router.push('/logo-quiz/shop')}
          />
          <CoinPill coins={coins} onPress={() => router.push('/logo-quiz/shop')} />
        </View>
      </View>

      {/* Progress — position within the level. */}
      <Text style={styles.progress}>{`${index + 1} / ${runList.length}`}</Text>

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
              // The glide-to-center only animates on a fresh solve (revealAnimated).
              // In review — opening an already-solved logo, or paging onto one — the
              // answer snaps straight to its final centered position with no transition.
              layout={
                revealAnimated ? LinearTransition.duration(MOVE_MS).easing(Easing.out(Easing.cubic)) : undefined
              }
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
                <Text
                  style={[textTone]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {isRemoved ? '' : option}
                </Text>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* Reveal panel — Explanation (localized `question.explanation`, omitted when
          blank), rendered below the centered answer. On a fresh solve it fades in
          only after the answer's glide lands (FadeIn.delay(MOVE_MS)) — in sync with
          the ◀/▶ nav below; in review it appears instantly (no delayed fade). It
          sits below the answer in normal flow, so mounting it never shifts the answer. */}
      {revealing && (
        <Animated.View
          entering={revealAnimated ? FadeIn.delay(MOVE_MS).duration(UI_FADE_MS) : undefined}
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
        </Animated.View>
      )}

      {/* Bottom row: on an answered logo, ◀/▶ paging (clamped to the level's
          first/last); on an unanswered one, the hint buttons + normal gameplay. */}
      <View style={styles.hints}>
        {solved ? (
          // ◀/▶ paging. Uses the SAME entering animation as the Explanation panel,
          // so on a fresh solve Next/Previous become visible at the exact same
          // moment the Explanation does (after the answer glide); in review they
          // show instantly alongside the instant Explanation.
          <Animated.View
            entering={revealAnimated ? FadeIn.delay(MOVE_MS).duration(UI_FADE_MS) : undefined}
            style={styles.navRow}
          >
            <NavButton label={t.prevLogo} icon="arrow-back" onPress={goPrev} />
            <NavButton label={t.nextLogo} icon="arrow-forward" iconRight onPress={goNext} />
          </Animated.View>
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

      <QuizMenuModal
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        question={question}
        appConfig={snapshot?.app}
        locale={locale}
        onCaptureShareImage={captureShareImage}
      />

      {/* Off-screen composition captured for the "Share a logo" image. Rendered
          outside the visible viewport (never affects layout) but kept mounted so
          react-native-view-shot can snapshot it on demand. */}
      <View style={styles.shareCardHost} pointerEvents="none">
        <ShareCard
          ref={shareCardRef}
          imageUri={question.imageUri}
          options={question.options}
          prompt={t.whichBrand}
          title="Logo Quiz"
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

// Prev/next paging button used while reviewing a solved logo. `iconRight` puts
// the arrow after the label (for "next"), otherwise before it (for "prev").
function NavButton({
  label,
  icon,
  iconRight,
  onPress,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconRight?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const arrow = <Ionicons name={icon} size={20} color={disabled ? LQColors.disabled : LQColors.text} />;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.navBtn,
        LQShadow.card,
        disabled && styles.navBtnDisabled,
        pressed && !disabled && { transform: [{ scale: 0.98 }] },
      ]}
    >
      {!iconRight && arrow}
      <Text
        style={[styles.navLabel, disabled && { color: LQColors.disabled }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
      {iconRight && arrow}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  // Parks the capture composition off-screen — laid out (so it can be snapshotted)
  // but never visible or interactive.
  shareCardHost: { position: 'absolute', left: -9999, top: 0 },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

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
  // Fixed-size answer button: a constant height keeps every button identical
  // regardless of its label length. Long text is shrunk by font only (see the
  // <Text> below) so the button geometry never changes.
  option: {
    width: '100%',
    height: 56,
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.md,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Grey "quiet" card — the same calm grey as the hint/nav buttons, borderless.
  explCard: {
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.md,
    padding: 14,
  },
  explText: { fontSize: 14, fontWeight: '600', color: LQColors.text, lineHeight: 20, textAlign: 'center' },
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
  // Wraps the two ◀/▶ buttons so they can fade in as one unit (synced with the
  // Explanation). Fills the hints row and lays the buttons side-by-side.
  navRow: { flex: 1, flexDirection: 'row', gap: 12 },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: LQColors.surfaceAlt,
    borderRadius: LQRadius.md,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  navBtnDisabled: { opacity: 0.5 },
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
