import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { GradientBackground } from '@/components/flags-quiz/app-background';
import { GlossyIconButton } from '@/components/flags-quiz/glossy-icon-button';
import { Flag } from '@/components/flags-quiz/flag';
import { FQColors, FQShadow } from '@/constants/flags-quiz/theme';
import { useFQLabels } from '@/constants/flags-quiz/labels';
import { FLAG_HISTORY } from '@/constants/flags-quiz/flag-history';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// A wrong pick flashes red this long before skipping to the next question.
const REVEAL_MS = 900;
// Fixed answer-button height.
const OPTION_H = 68;

// Country name per app language + the FLAG_HISTORY slug (they line up 1:1).
type CountryKey =
  | 'russia'
  | 'spain'
  | 'germany'
  | 'france'
  | 'italy'
  | 'portugal'
  | 'usa'
  | 'australia'
  | 'uk'
  | 'canada';
const COUNTRY: Record<CountryKey, Record<SupportedLocale, string>> = {
  russia: { ru: 'Россия', en: 'Russia', es: 'Rusia' },
  spain: { ru: 'Испания', en: 'Spain', es: 'España' },
  germany: { ru: 'Германия', en: 'Germany', es: 'Alemania' },
  france: { ru: 'Франция', en: 'France', es: 'Francia' },
  italy: { ru: 'Италия', en: 'Italy', es: 'Italia' },
  portugal: { ru: 'Португалия', en: 'Portugal', es: 'Portugal' },
  usa: { ru: 'США', en: 'USA', es: 'EE. UU.' },
  australia: { ru: 'Австралия', en: 'Australia', es: 'Australia' },
  uk: { ru: 'Великобритания', en: 'United Kingdom', es: 'Reino Unido' },
  canada: { ru: 'Канада', en: 'Canada', es: 'Canadá' },
};

// Placeholder question set for the "All countries" mode — a few real flags drawn
// with the vector Flag component (ru/es/en). Real content (all ~200 flags) will
// come from the backend.
interface SampleQuestion {
  id: number;
  flag: SupportedLocale;
  answer: CountryKey;
  options: CountryKey[];
}
const SAMPLE: SampleQuestion[] = [
  { id: 1, flag: 'ru', answer: 'russia', options: ['russia', 'spain', 'germany', 'france'] },
  { id: 2, flag: 'es', answer: 'spain', options: ['france', 'spain', 'italy', 'portugal'] },
  { id: 3, flag: 'en', answer: 'uk', options: ['usa', 'australia', 'uk', 'canada'] },
];

type OptionState = 'idle' | 'correct' | 'wrong';

/**
 * Flags Quiz "All countries" gameplay screen (App Template: Geography). A flag,
 * the question, and a 2×2 grid of glossy-blue answer buttons.
 *
 * Answer flow (shared with the "By continent" mode):
 * - WRONG pick → flashes red, is recorded, then skips to the next question.
 * - CORRECT pick → flashes green and reveals the flag HISTORY below the options;
 *   tapping it advances.
 * - After the last question → the result screen (score + retry-mistakes).
 *
 * Content is a small placeholder set; the real catalogue comes from the backend.
 */
export default function FlagsQuizGame() {
  const t = useFQLabels();
  const { locale } = useLocale();
  const { retry } = useLocalSearchParams<{ retry?: string }>();
  const [reportOpen, setReportOpen] = useState(false);

  // Which SAMPLE questions to ask: all of them, or — on a retry — only the ones
  // the player got wrong last time.
  const askIdxs = useMemo(() => {
    if (retry) {
      const idxs = retry
        .split(',')
        .map((s) => Number.parseInt(s, 10))
        .filter((n) => Number.isInteger(n) && n >= 0 && n < SAMPLE.length);
      if (idxs.length > 0) return idxs;
    }
    return SAMPLE.map((_, i) => i);
  }, [retry]);

  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<CountryKey | null>(null);
  const [wrong, setWrong] = useState<number[]>([]);

  useEffect(() => {
    setPos(0);
    setPicked(null);
    setWrong([]);
  }, [askIdxs]);

  const sampleIdx = askIdxs[pos];
  const question = SAMPLE[sampleIdx];
  const answered = picked !== null;
  const isCorrectPick = answered && picked === question.answer;

  function finish(finalWrong: number[]) {
    const total = askIdxs.length;
    const correct = total - finalWrong.length;
    router.replace({
      pathname: '/flags-quiz/result',
      params: {
        mode: 'all',
        correct: String(correct),
        total: String(total),
        wrong: finalWrong.join(','),
      },
    });
  }

  function advance(finalWrong: number[]) {
    const next = pos + 1;
    if (next >= askIdxs.length) {
      finish(finalWrong);
      return;
    }
    setPicked(null);
    setPos(next);
  }

  const onPick = (option: CountryKey) => {
    if (answered) return;
    setPicked(option);
    const correct = option === question.answer;
    Haptics.notificationAsync(
      correct
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    if (correct) {
      // Stay put and show the flag history; the player taps it to continue.
      return;
    }
    const newWrong = [...wrong, sampleIdx];
    setWrong(newWrong);
    setTimeout(() => advance(newWrong), REVEAL_MS);
  };

  const onContinue = () => {
    if (!isCorrectPick) return;
    advance(wrong);
  };

  const stateFor = (option: CountryKey): OptionState => {
    if (!answered) return 'idle';
    // Only the tapped option lights up: green if correct, red if wrong. A wrong
    // pick never reveals the correct answer.
    if (option === picked) return picked === question.answer ? 'correct' : 'wrong';
    return 'idle';
  };

  const onShare = async () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    try {
      await Share.share({ message: t.shareInvite.replace('{url}', storeUrl) });
    } catch {
      // cancelled / unavailable — nothing to do
    }
  };

  const historyText = FLAG_HISTORY[question.answer]?.[locale] ?? null;

  return (
    <View style={styles.fill}>
      <GradientBackground />
      <StatusBar style="light" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {/* Top bar: back (left) · report + share (right). No lives / coins / ⋯. */}
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
              testID="quiz-report-button"
            >
              <GlossyIconButton glyph="flag" size={44} />
            </Pressable>
            <Pressable
              onPress={onShare}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.pressed}
              testID="quiz-share-button"
            >
              <GlossyIconButton glyph="share-social" size={44} />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {/* Flag block: progress right above the flag, then the flag, then the question. */}
          <View style={styles.imageArea}>
            <Text style={styles.progress}>{`${pos + 1}/${askIdxs.length}`}</Text>
            <View style={styles.imageFrame}>
              <Flag locale={question.flag} width={216} height={144} />
            </View>
            <Text style={styles.prompt}>{t.whichCountry}</Text>
          </View>

          {/* 2×2 answer grid — options localized to the active language. */}
          <View style={styles.options}>
            {question.options.map((option) => (
              <OptionButton
                key={option}
                label={COUNTRY[option][locale]}
                state={stateFor(option)}
                disabled={answered}
                onPress={() => onPick(option)}
              />
            ))}
          </View>

          {/* Flag history — revealed under the options only on a CORRECT answer.
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
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {/* Report form — opened straight from the Report button (mirrors Logo Quiz). */}
      <QuizMenuModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        question={{ id: question.id } as unknown as LogoQuizQuestion}
        appConfig={undefined}
        locale={locale}
        initialView="report"
        primaryGradient={['#A6E1FF', '#3FA9F5']}
        sheetGradient={['#C2E4FF', '#7FBDF3']}
      />
    </View>
  );
}

/** A glossy-blue answer button (same design as the home buttons) that tints green
 *  when it's the correct answer and red when it's a wrong pick, once answered. */
function OptionButton({
  label,
  state,
  onPress,
  disabled,
}: {
  label: string;
  state: OptionState;
  onPress: () => void;
  disabled: boolean;
}) {
  const gradient =
    state === 'correct'
      ? (['#7BE495', '#37B24D'] as const)
      : state === 'wrong'
        ? (['#FF9A9A', '#E03131'] as const)
        : ([FQColors.tileLight, FQColors.tileDark] as const);
  const rim = state === 'correct' ? '#2B8A3E' : state === 'wrong' ? '#C92A2A' : FQColors.tileRim;
  const textColor = state === 'idle' ? FQColors.tileGlyph : '#FFFFFF';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [styles.optionWrap, pressed && !disabled && styles.pressed]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.option, { borderColor: rim }, FQShadow.card]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
          style={styles.optionGloss}
          pointerEvents="none"
        />
        <Text
          style={[styles.optionText, { color: textColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {label}
        </Text>
      </LinearGradient>
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
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  body: { paddingBottom: 32 },

  // Sits right above the flag inside the flag block.
  progress: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontWeight: '900',
    // +20% over the previous 18 → ~22.
    fontSize: 22,
    marginBottom: 10,
    textShadowColor: 'rgba(4, 40, 96, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Progress + flag + question, sitting right below the top bar (raised like the
  // "By continent" screen).
  imageArea: { alignItems: 'center', marginTop: 16 },
  // Rim frame like the buttons — navy border hugging the flag with no gap.
  imageFrame: {
    borderWidth: 3,
    borderColor: FQColors.tileRim,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // +30% over the previous 20 → 26, centred.
  prompt: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900',
    marginTop: 22,
    textAlign: 'center',
    alignSelf: 'center',
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
    rowGap: 14,
    // Two button-heights below the question, then raised half a button back up.
    marginTop: OPTION_H * 1.5,
  },
  optionWrap: { width: '48%' },
  option: {
    height: OPTION_H,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  optionGloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '50%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  // +20% over the previous 19 → ~23. Single line; long labels shrink to fit.
  optionText: { fontSize: 23, fontWeight: '900', textAlign: 'center' },

  // White card, blue rim, navy text — the flag-history reveal (task 4).
  historyBox: {
    marginTop: 24,
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
  // "Tap to continue" — a light-blue outlined pill so it stands out on the white card.
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
