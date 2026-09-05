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
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/flags-quiz/glossy-button';
import { CoatShareCard } from '@/components/coat-of-arms/share-card';
import { CoatHelpModal, useCoatHelp } from '@/components/coat-of-arms/help-modal';
import { CoatOriginalReveal } from '@/components/coat-of-arms/original-reveal';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { useCoaLabels } from '@/constants/coat-of-arms/labels';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';
import { useCoatContent } from '@/hooks/coat-of-arms/use-coat-content';
import { useRunProgress } from '@/hooks/flags-quiz/use-run-progress';
import { getStoreLinks } from '@/lib/store-links';
import { wrapLabel, fitTitleFontSize } from '@/lib/flags-quiz/label';
import { shareQuestionImage } from '@/lib/flags-quiz/share-image';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;
// On a correct answer the wrong coats unmount while the correct one glides up
// and centers over this long; the note + "Next" button then fade in over
// UI_FADE_MS once the glide lands. Matches Flags Quiz exactly.
const MOVE_MS = 900;
const UI_FADE_MS = 300;

// The reward: once the answer glide lands, the ORIGINAL coat — the one that still
// shows the country name on its banner — dissolves in on top of the played one
// (see CoatOriginalReveal). Only fires where the backend ships an original, which
// is ~32% of the time.
const COAT_REVEAL_DELAY_MS = MOVE_MS;

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
  // Help sheet: auto-opens once on the first reached question (any category),
  // and the "?" tile opens it manually anytime.
  const { helpOpen, setHelpOpen } = useCoatHelp(!!q);
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
  // Wrap the country name at word boundaries and shrink the font until the longest
  // whole word fits — a long single word never splits across letters.
  const titleDisplay = wrapLabel(q.title);
  const titleLines = titleDisplay.split('\n');

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
              onPress={() => setHelpOpen(true)}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              testID="quiz-help-button"
            >
              <GlossyIconButton glyph="help" size={44} />
            </Pressable>
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
          {/* Progress + the country name (the question). The name is hidden once
              answered — on reveal we show only the correct coat + explanation. */}
          <View style={styles.head}>
            <Text style={styles.progress}>{`${pos + 1}/${order.length}`}</Text>
            {!revealing ? (
              <Text
                style={[styles.country, { fontSize: fitTitleFontSize(titleLines) }]}
                numberOfLines={titleLines.length}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {titleDisplay}
              </Text>
            ) : null}
          </View>

          {/* 2×2 coat-picture options. STATIC on question open — plain Views, no
              layout animator, so nothing slides/reflows in. On a correct reveal the
              wrong coats unmount and ONLY the correct one floats up into the centre
              (its key changes, so it remounts with an entering animation). */}
          <View key={q.id} style={[styles.options, revealing && styles.optionsRevealing]}>
            {q.optionImageUris.map((uri, optIdx) => {
              if (revealing && optIdx !== q.correctIndex) return null;
              const s = stateFor(optIdx);
              const ring = s === 'correct' ? '#37B24D' : s === 'wrong' ? '#E03131' : 'transparent';
              const cell = (
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
                    {/* Plate sized to the picture box itself (NOT the padded
                        frame), so the reveal overlay lines up with the played
                        coat exactly — an absolutely positioned child resolves
                        against the padding box and would otherwise come out
                        12pt larger than the image underneath it. */}
                    <View style={styles.coatPlate}>
                      {uri ? (
                        <Image
                          source={{ uri }}
                          style={styles.coatImg}
                          contentFit="contain"
                          transition={0}
                          testID={`coat-option-${optIdx}`}
                        />
                      ) : (
                        <View style={[styles.coatImg, styles.optionFallback]} />
                      )}
                      {/* Reward: the ORIGINAL coat (country name still on the
                          banner) dissolves in ON TOP of the played one once the
                          glide lands. Only the correct option survives to here
                          (see the early return above), and ~68% of coats ship no
                          original — those simply never reveal. */}
                      {revealing && q.correctOriginalImageUri ? (
                        <CoatOriginalReveal
                          key={`coat-reveal-${q.id}`}
                          uri={q.correctOriginalImageUri}
                          size={OPT_W}
                          delayMs={COAT_REVEAL_DELAY_MS}
                        />
                      ) : null}
                    </View>
                  </View>
                </Pressable>
              );
              return revealing ? (
                <Animated.View
                  key={`reveal-${optIdx}`}
                  entering={FadeInUp.duration(MOVE_MS).easing(Easing.out(Easing.cubic))}
                >
                  {cell}
                </Animated.View>
              ) : (
                <View key={optIdx}>{cell}</View>
              );
            })}
          </View>

          {/* Reveal panel — the expanded note then a "Next" button. Fades in
              once the answer glide lands. */}
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

      {/* Help: explains the review-your-mistakes flow (opened from the "?" tile). */}
      <CoatHelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />

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
  // Sized to the PICTURE box, not the padded frame, so the reveal overlay
  // registers pixel-for-pixel with the played coat.
  coatPlate: { width: OPT_W, height: OPT_H },
  coatImg: { width: OPT_W, height: OPT_H },
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
    // Hug the text: the box is only as tall as its content, so short notes have
    // no empty white space. It never GROWS; it only SHRINKS (and its inner
    // ScrollView scrolls) when a long note would exceed the space available.
    flexShrink: 1,
  },
  historyScroll: { flexShrink: 1 },
  historyText: {
    color: FQColors.tileGlyph,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  nextWrap: { width: '48%', alignSelf: 'center', marginTop: 18 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
