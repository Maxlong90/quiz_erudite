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
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';
import { useFlagsQuizContent } from '@/hooks/flags-quiz/use-flags-quiz-content';
import { useRunProgress } from '@/hooks/flags-quiz/use-run-progress';
import { getStoreLinks } from '@/lib/store-links';
import { shareQuestionImage } from '@/lib/flags-quiz/share-image';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;

// Answer-reveal timings (mirrors Logo Quiz): the wrong options clear while the
// correct flag glides up and centers under the country name; once it lands, the
// flag note + "Next" button fade in.
const MOVE_MS = 900;
const UI_FADE_MS = 300;
// The flag note is height-capped (it scrolls internally when long) so the answer +
// "Next" button always fit one screen — identical layout on tall and short phones.
const NOTE_MAX_H = 160;

// Option flag box sized to fit two columns uniformly. Around each flag sit three
// concentric edges that all eat horizontal space: the frame's 3px navy border,
// the wrapper's 3px padding, and the wrapper's 4px reveal ring — 10px per side,
// 20px total. The flag itself must be that much narrower for two to fit the row.
const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 20; // options paddingHorizontal
const WRAP_EXTRA = 20; // frame border (3×2) + padding (3×2) + ring (4×2)
const OPT_W = Math.floor((SCREEN_W - GRID_PAD * 2 - WRAP_EXTRA * 2 - 8) / 2);
const OPT_H = Math.round(OPT_W * 0.62);

const CONTINENT_KEYS: ContinentKey[] = [
  'africa',
  'northAmerica',
  'southAmerica',
  'asia',
  'europe',
  'oceania',
];

type OptionState = 'idle' | 'correct' | 'wrong';

/**
 * Flags Quiz "By continent" gameplay screen (App Template: Geography). Opens from
 * a continent button. The QUESTION is a country name; the four answer options are
 * flag PICTURES (one correct). Content is the backend's `image_answer_questions`
 * for the chosen continent, shared via the content provider.
 *
 * The run order is SHUFFLED and PERSISTED per continent (see useRunProgress):
 * exiting mid-run and returning resumes at the same question with the same score,
 * and only a finished (or brand-new) run reshuffles. A `retry` run replays ONLY
 * the passed missed-question indices and is not persisted.
 *
 * Answer flow:
 * - WRONG pick → flashes red, is recorded, then skips to the next question.
 * - CORRECT pick → the wrong flags fade out, the correct flag glides to the centre
 *   under the country name, the flag note appears below it and a "Next" button
 *   advances the run (mirrors Logo Quiz).
 * - After the last question → the result screen (score + retry-mistakes).
 */
export default function FlagsQuizContinentGame() {
  const t = useFQLabels();
  const { locale } = useLocale();
  const { continent, retry } = useLocalSearchParams<{ continent?: string; retry?: string }>();
  const { pictureByContinent, status } = useFlagsQuizContent();
  const key = (CONTINENT_KEYS.includes(continent as ContinentKey) ? continent : 'africa') as ContinentKey;
  const questions = useMemo(() => pictureByContinent[key] ?? [], [pictureByContinent, key]);
  const [reportOpen, setReportOpen] = useState(false);
  // Off-screen composition (country name + flag options) captured to a PNG for Share.
  const shareCardRef = useRef<View>(null);
  // The game page only scrolls when its content actually exceeds the viewport
  // (small phones); on tall phones it fits, so scrolling stays off and the page
  // never rubber-bands. Measured via onLayout / onContentSizeChange below.
  const [viewportH, setViewportH] = useState(0);
  const [contentH, setContentH] = useState(0);
  const pageScrolls = contentH > viewportH + 1;

  // On a retry we replay only the missed indices (in order); otherwise the run is
  // resumed-or-freshly-shuffled and persisted per continent by useRunProgress.
  const retryIdxs = useMemo(() => {
    if (!retry) return null;
    const idxs = retry
      .split(',')
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < questions.length);
    return idxs.length > 0 ? idxs : null;
  }, [retry, questions.length]);

  const { hydrated, order, pos, wrong, setPos, addWrong, clear } = useRunProgress({
    key: `flags.progress.continent.${key}.v1`,
    count: questions.length,
    retry: retryIdxs,
    ready: questions.length > 0,
  });

  const [picked, setPicked] = useState<number | null>(null);

  const questionIdx = order[pos];
  const q = questions[questionIdx];
  const answered = picked !== null;
  const isCorrectPick = answered && q != null && picked === q.correctIndex;

  const finish = useCallback(
    (finalWrong: number[]) => {
      clear();
      const total = order.length;
      const correctCount = total - finalWrong.length;
      router.replace({
        pathname: '/flags-quiz/result',
        params: {
          mode: 'continent',
          continent: key,
          correct: String(correctCount),
          total: String(total),
          wrong: finalWrong.join(','),
        },
      });
    },
    [order.length, key, clear],
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

  const onPick = (optIdx: number) => {
    if (answered || !q) return;
    setPicked(optIdx);
    const correct = optIdx === q.correctIndex;
    Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
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

  const stateFor = (optIdx: number): OptionState => {
    if (!answered || !q) return 'idle';
    // Only the option the player tapped changes colour: green if right, red if
    // wrong. A wrong pick never reveals the correct flag.
    if (optIdx === picked) return picked === q.correctIndex ? 'correct' : 'wrong';
    return 'idle';
  };

  // Share the question: capture the off-screen ShareCard to a PNG and share it
  // with the invite (mirrors Logo Quiz's "Share a logo").
  const onShare = () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    const message = t.shareInvite.replace('{url}', storeUrl);
    shareQuestionImage(shareCardRef, message);
  };

  // Content or saved progress still loading — light loader.
  if (!hydrated || !q) {
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

  const historyText = q.explanation;
  const revealing = isCorrectPick;

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
            >
              <GlossyIconButton glyph="flag" size={44} />
            </Pressable>
            <Pressable
              onPress={onShare}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <GlossyIconButton glyph="share-social" size={44} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          scrollEnabled={pageScrolls}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, h) => setContentH(h)}
        >
          {/* Progress + the country name (the question). */}
          <View style={styles.head}>
            <Text style={styles.progress}>{`${pos + 1}/${order.length}`}</Text>
            <Text style={styles.country}>{q.title}</Text>
          </View>

          {/* 2×2 flag-picture options. On a correct reveal the wrong flags unmount
              (FadeOut) while the correct flag — kept mounted — glides up and centers. */}
          <View key={q.id} style={[styles.options, revealing && styles.optionsRevealing]}>
            {q.optionImageUris.map((uri, optIdx) => {
              if (revealing && optIdx !== q.correctIndex) return null;
              const s = stateFor(optIdx);
              const ring =
                s === 'correct' ? '#37B24D' : s === 'wrong' ? '#E03131' : 'transparent';
              return (
                <Animated.View
                  key={optIdx}
                  layout={LinearTransition.duration(MOVE_MS).easing(Easing.out(Easing.cubic))}
                >
                  <Pressable
                    onPress={() => onPick(optIdx)}
                    disabled={answered}
                    style={({ pressed }) => [
                      styles.optionWrap,
                      { borderColor: ring },
                      pressed && !answered && styles.pressed,
                    ]}
                  >
                    <View style={styles.optionFrame}>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={{ width: OPT_W, height: OPT_H }}
                          contentFit="cover"
                          transition={0}
                        />
                      ) : (
                        <View style={[{ width: OPT_W, height: OPT_H }, styles.optionFallback]} />
                      )}
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>

          {/* Reveal panel — the flag note (when present) then a "Next" button, in
              the Flags Quiz button style. Fades in once the flag glide lands. */}
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

      {/* Report — real backend question id. */}
      <QuizMenuModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        question={{ id: q.id } as unknown as LogoQuizQuestion}
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
          variant="continent"
          title={t.appName}
          prompt={q.title}
          imageOptions={q.optionImageUris}
        />
      </View>
    </View>
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

  scroll: { flex: 1 },
  body: { paddingBottom: 32 },

  // Progress (1/6) + country name, sitting right below the top bar.
  head: { alignItems: 'center', marginTop: 16 },
  progress: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    // Equal to the options' top margin so the country name sits centered in the
    // gap between the progress counter and the answer flags.
    marginBottom: 44,
    textShadowColor: 'rgba(4, 40, 96, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  country: {
    color: '#FFFFFF',
    fontSize: 41,
    fontWeight: '900',
    textAlign: 'center',
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
    rowGap: 16,
    // Matches the progress counter's bottom margin so the country name is centered
    // between the counter and the answer flags.
    marginTop: 44,
  },
  // While revealing only the correct flag remains — center the lone survivor so
  // its glide lands under the country name, and pull the block up to make room for
  // the note + "Next" button within one screen.
  optionsRevealing: { justifyContent: 'center', marginTop: 24 },
  // Colored ring appears (green/red) on reveal; transparent otherwise.
  optionWrap: {
    borderWidth: 4,
    borderColor: 'transparent',
    borderRadius: 12,
    padding: 3,
  },
  // Same navy rim frame as the flag on the "All countries" screen.
  optionFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 6,
    overflow: 'hidden',
  },
  optionFallback: { backgroundColor: 'rgba(255,255,255,0.12)' },

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
  // "Next" matches an answer button's width, centered under the answer.
  nextWrap: { width: '48%', alignSelf: 'center', marginTop: 18 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
