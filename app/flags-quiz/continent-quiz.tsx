import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import type { ContinentKey } from '@/constants/flags-quiz/continent-flags';
import { useLocale } from '@/hooks/use-locale';
import { useFlagsQuizContent } from '@/hooks/flags-quiz/use-flags-quiz-content';
import { getStoreLinks } from '@/lib/store-links';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;

// Option flag box sized to fit two columns uniformly. Each option's wrapper adds
// a 4px ring + 3px padding on every side (14px total), so the flag itself must be
// that much narrower for two to fit the row.
const SCREEN_W = Dimensions.get('window').width;
const GRID_PAD = 20; // options paddingHorizontal
const WRAP_EXTRA = 14; // ring (4×2) + padding (3×2)
const OPT_W = Math.floor((SCREEN_W - GRID_PAD * 2 - WRAP_EXTRA * 2 - 8) / 2);
const OPT_H = Math.round(OPT_W * 0.62);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
 * for the chosen continent — each question already carries its four pre-baked
 * image options and the correct index, shared via the content provider.
 *
 * Answer flow:
 * - WRONG pick → flashes red, is recorded, then skips to the next question.
 * - CORRECT pick → flashes green and reveals the flag's note beneath the options;
 *   tapping it advances to the next question.
 * - After the last question → the result screen (score + retry-mistakes).
 *
 * With a `retry` param the run is rebuilt from ONLY the passed question indices,
 * so the player can re-attempt the flags they missed.
 */
export default function FlagsQuizContinentGame() {
  const t = useFQLabels();
  const { locale } = useLocale();
  const { continent, retry } = useLocalSearchParams<{ continent?: string; retry?: string }>();
  const { pictureByContinent, status } = useFlagsQuizContent();
  const key = (CONTINENT_KEYS.includes(continent as ContinentKey) ? continent : 'africa') as ContinentKey;
  const questions = useMemo(() => pictureByContinent[key] ?? [], [pictureByContinent, key]);

  // Which questions are asked this run: all of the continent (shuffled), or — on
  // a retry — only the ones the player got wrong last time (indices into
  // `questions`, kept in the passed order).
  const askIdxs = useMemo(() => {
    if (retry) {
      const idxs = retry
        .split(',')
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < questions.length);
      if (idxs.length > 0) return idxs;
    }
    return shuffle(questions.map((_, i) => i));
  }, [retry, questions]);

  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);
  const [reportOpen, setReportOpen] = useState(false);

  // Restart a fresh run whenever the continent (or the retry set) changes.
  useEffect(() => {
    setPos(0);
    setPicked(null);
    setWrong([]);
  }, [askIdxs]);

  const questionIdx = askIdxs[pos];
  const q = questions[questionIdx];
  const answered = picked !== null;
  const isCorrectPick = answered && q != null && picked === q.correctIndex;

  const finish = useCallback(
    (finalWrong: number[]) => {
      const total = askIdxs.length;
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
    [askIdxs.length, key],
  );

  const advance = useCallback(
    (finalWrong: number[]) => {
      const next = pos + 1;
      if (next >= askIdxs.length) {
        finish(finalWrong);
        return;
      }
      setPicked(null);
      setPos(next);
    },
    [pos, askIdxs.length, finish],
  );

  const onPick = (optIdx: number) => {
    if (answered || !q) return;
    setPicked(optIdx);
    const correct = optIdx === q.correctIndex;
    Haptics.notificationAsync(
      correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    if (correct) {
      // Stay put and show the flag note; the player taps it to continue.
      return;
    }
    // Wrong → record the missed question and skip to the next.
    const newWrong = [...wrong, questionIdx];
    setWrong(newWrong);
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

  const onShare = async () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    try {
      await Share.share({ message: t.shareInvite.replace('{url}', storeUrl) });
    } catch {
      // cancelled / unavailable
    }
  };

  // Content still loading (no questions for this continent yet) — light loader.
  if (!q) {
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
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress + the country name (the question). */}
          <View style={styles.head}>
            <Text style={styles.progress}>{`${pos + 1}/${askIdxs.length}`}</Text>
            <Text style={styles.country}>{q.title}</Text>
          </View>

          {/* 2×2 flag-picture options, one correct. */}
          <View style={styles.options}>
            {q.optionImageUris.map((uri, optIdx) => {
              const s = stateFor(optIdx);
              const ring =
                s === 'correct' ? '#37B24D' : s === 'wrong' ? '#E03131' : 'transparent';
              return (
                <Pressable
                  key={optIdx}
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
              );
            })}
          </View>

          {/* Flag note — revealed under the options only on a CORRECT answer.
              White fill, blue rim and navy text (like the Play button). Tapping
              it advances to the next question. */}
          {isCorrectPick && historyText ? (
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.historyBox, FQShadow.card, pressed && styles.pressed]}
            >
              <Text style={styles.historyText}>{historyText}</Text>
              <Text style={styles.historyHint}>{t.tapToContinue}</Text>
            </Pressable>
          ) : isCorrectPick ? (
            <Pressable
              onPress={onContinue}
              style={({ pressed }) => [styles.historyBox, FQShadow.card, pressed && styles.pressed]}
            >
              <Text style={styles.historyHint}>{t.tapToContinue}</Text>
            </Pressable>
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
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
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

  // Progress (1/6) + country name, sitting right below the top bar.
  head: { alignItems: 'center', marginTop: 16 },
  progress: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
    marginBottom: 12,
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
    // Wider gap between the question and the answer flags.
    marginTop: 76,
  },
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

  // White card, blue rim, navy text — the flag-note reveal.
  historyBox: {
    marginTop: 28,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: FQColors.tileRim,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  historyText: {
    color: FQColors.tileGlyph,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },
  historyHint: {
    color: FQColors.tileGlyph,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    alignSelf: 'center',
    marginTop: 14,
    borderWidth: 1.5,
    borderColor: '#3FA9F5',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 16,
    overflow: 'hidden',
  },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
