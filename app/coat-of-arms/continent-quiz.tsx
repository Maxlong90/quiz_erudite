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
import { CoatShareCard } from '@/components/coat-of-arms/share-card';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';
import { useCoatContent } from '@/hooks/coat-of-arms/use-coat-content';
import { useRunProgress } from '@/hooks/flags-quiz/use-run-progress';
import { getStoreLinks } from '@/lib/store-links';
import { shareQuestionImage } from '@/lib/flags-quiz/share-image';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;
const MOVE_MS = 900;
const UI_FADE_MS = 300;
const NOTE_MAX_H = 160;

// Coat option box: two per row, SQUARE (coats are portrait/square, unlike a wide
// flag), each on a white plate with the coat CONTAINED (never cropped).
const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 20;
// Per-option chrome that eats horizontal space: the wrapper's 4px reveal ring
// (8) + 3px padding (6), plus the frame's 3px navy border (6) + 6px white-plate
// padding (12) = 32 per option. Subtract both + an inter-column gap so two
// squares fit one row (a smaller value made each option >50% and wrapped them
// into a single column).
const WRAP_EXTRA = 32;
const OPT_W = Math.floor((SCREEN_W - GRID_PAD * 2 - WRAP_EXTRA * 2 - 8) / 2);
const OPT_H = OPT_W;

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
 * Coat of Arms "By continent" gameplay screen. Same technology as the Flags Quiz
 * continent game — only the answer pictures are COATS OF ARMS. The QUESTION is a
 * country name; the four answer options are coat PICTURES (one correct). Content
 * is the backend's `image_answer_questions` for the chosen continent.
 *
 * The run order is SHUFFLED and PERSISTED per continent (see useRunProgress):
 * exiting mid-run and returning resumes at the same question with the same score.
 * A `retry` run replays ONLY the passed missed indices and is not persisted.
 * Only the tapped option lights up (green/red) — a wrong pick never reveals the
 * correct coat. After the last question → the result screen.
 */
export default function CoatOfArmsContinentGame() {
  const t = useFQLabels();
  const c = useCoaLabels();
  const { locale } = useLocale();
  const { continent, retry } = useLocalSearchParams<{ continent?: string; retry?: string }>();
  const { pictureByContinent, status } = useCoatContent();
  const key = (CONTINENT_KEYS.includes(continent as ContinentKey) ? continent : 'africa') as ContinentKey;
  const questions = useMemo(() => pictureByContinent[key] ?? [], [pictureByContinent, key]);
  const [reportOpen, setReportOpen] = useState(false);
  // Off-screen composition (country name + coat options) captured to a PNG for Share.
  const shareCardRef = useRef<View>(null);

  const retryIdxs = useMemo(() => {
    if (!retry) return null;
    const idxs = retry
      .split(',')
      .map((s) => Number.parseInt(s, 10))
      .filter((n) => Number.isInteger(n) && n >= 0 && n < questions.length);
    return idxs.length > 0 ? idxs : null;
  }, [retry, questions.length]);

  const { hydrated, order, pos, wrong, setPos, addWrong, clear } = useRunProgress({
    key: `coat.progress.continent.${key}.v1`,
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
        pathname: '/coat-of-arms/result',
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
    if (optIdx === picked) return picked === q.correctIndex ? 'correct' : 'wrong';
    return 'idle';
  };

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

        {/* Non-scrolling page: everything fixed EXCEPT the history note, which is
            the one flexible region and scrolls INTERNALLY. Keeps the page still
            on roomy screens while guaranteeing the full note is reachable on
            every screen — and avoids the broken ScrollView-inside-ScrollView
            nesting that stopped the note scrolling. */}
        <View style={styles.page}>
          {/* Progress + the country name (the question). */}
          <View style={styles.head}>
            <Text style={styles.progress}>{`${pos + 1}/${order.length}`}</Text>
            <Text style={styles.country}>{q.title}</Text>
          </View>

          {/* 2×2 coat-picture options. On a correct reveal the wrong coats unmount
              (FadeOut) while the correct coat — kept mounted — glides up and centers. */}
          <View key={q.id} style={[styles.options, revealing && styles.optionsRevealing]}>
            {q.optionImageUris.map((uri, optIdx) => {
              if (revealing && optIdx !== q.correctIndex) return null;
              const s = stateFor(optIdx);
              const ring = s === 'correct' ? '#37B24D' : s === 'wrong' ? '#E03131' : 'transparent';
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
                          contentFit="contain"
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

          {/* Reveal panel — the note (when present) then a "Next" button. */}
          {revealing ? (
            <Animated.View style={styles.reveal} entering={FadeIn.delay(MOVE_MS).duration(UI_FADE_MS)}>
              {historyText ? (
                <View style={[styles.historyBox, FQShadow.card]}>
                  <ScrollView
                    style={styles.historyScroll}
                    showsVerticalScrollIndicator
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
        </View>
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

      {/* Off-screen composition captured for the Share image. */}
      <View style={styles.shareCardHost} pointerEvents="none">
        <CoatShareCard
          ref={shareCardRef}
          variant="continent"
          title={c.appName}
          prompt={q.title}
          imageOptions={q.optionImageUris}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
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

  page: { flex: 1, paddingBottom: 16 },
  // Reveal panel takes the space left under the options; its note shrinks to fit
  // and scrolls internally, so the "Next" button stays on screen everywhere.
  reveal: { flex: 1, minHeight: 0, width: '100%' },

  head: { alignItems: 'center', marginTop: 16 },
  progress: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 40,
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
    marginTop: 40,
  },
  optionsRevealing: { justifyContent: 'center', marginTop: 24 },
  optionWrap: {
    borderWidth: 4,
    borderColor: 'transparent',
    borderRadius: 14,
    padding: 3,
  },
  // Navy rim frame with a white inner plate so a transparent coat reads clearly.
  optionFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    padding: 6,
  },
  optionFallback: { backgroundColor: 'rgba(11, 58, 135, 0.08)' },

  historyBox: {
    marginTop: 20,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexShrink: 1,
  },
  historyScroll: { maxHeight: NOTE_MAX_H, flexShrink: 1 },
  historyText: {
    color: FQColors.tileGlyph,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  nextWrap: { width: '48%', alignSelf: 'center', marginTop: 18 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
