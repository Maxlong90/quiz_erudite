import { useState } from 'react';
import { Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/football-quiz/app-background';
import { FQReportSheet } from '@/components/football-quiz/report-sheet';
import { CoinPill, FQIconButton, GoldCta } from '@/components/football-quiz/ui';
import { FQColors, FQRadius } from '@/constants/football-quiz/theme';
import { useSQLabels } from '@/constants/sport-quiz/labels';
import { useLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';
import { MOCK_COINS, MOCK_QUESTIONS, SKIP_COST } from '@/lib/football-quiz/mock';

/**
 * Football Quiz question screen — same structure as app/sport-quiz/quiz.tsx:
 * HUD (back · share · report · coins), the position counter, the prompt, a 2x2
 * answer grid (48% wide, 64 tall) and the bottom action row.
 *
 * Bottom-row behaviour follows Sport Quiz exactly:
 *   - before the question is answered there is ONE action — Skip (it costs coins)
 *   - Back and Next appear only after the answer is revealed, i.e. alongside the
 *     explanation. Back is hidden on the first question, so question 1 shows just
 *     Next.
 * Unlike Sport Quiz (glass Back + filled Next) BOTH are solid gold here, per the
 * design review, so the pair reads as one control.
 */
export default function FootballQuizQuiz() {
  const t = useSQLabels();
  const { locale } = useLocale();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const question = MOCK_QUESTIONS[index];
  const revealed = picked != null;

  const goNext = () => {
    if (index < MOCK_QUESTIONS.length - 1) {
      setIndex(index + 1);
      setPicked(null);
    } else {
      router.back();
    }
  };
  const goPrev = () => {
    if (index > 0) {
      setIndex(index - 1);
      setPicked(null);
    }
  };

  // Sport Quiz shares a rendered picture of the question; the prototype has no
  // share-card yet, so it shares the invite text + store link instead.
  const onShare = () => {
    const { storeUrl } = getStoreLinks(undefined, Platform.OS);
    const invite = t.shareInvite.replace('{url}', storeUrl).replace('Sport Quiz', 'Football Quiz');
    Share.share({ message: `${question.question}\n\n${invite}` }).catch(() => {});
  };

  return (
    <View style={styles.fill}>
      <AppBackground variant="deep" />
      <StatusBar style="light" />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.hud}>
          <FQIconButton glyph="chevron-back" size={44} onPress={() => router.back()} />
          <View style={styles.headerRight}>
            <FQIconButton glyph="share-social" size={44} onPress={onShare} />
            <FQIconButton glyph="flag" size={44} onPress={() => setReportOpen(true)} />
            <Pressable onPress={() => router.push('/football-quiz/shop')} hitSlop={8}>
              <CoinPill coins={MOCK_COINS} size="lg" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.progress}>{`${index + 1} / ${MOCK_QUESTIONS.length}`}</Text>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.prompt}>{question.question}</Text>

          <View style={styles.options}>
            {question.options.map((option) => {
              const isAnswer = option === question.correctAnswer;
              const isWrongPick = picked === option && !isAnswer;
              let tone = styles.optionIdle;
              if (revealed && isAnswer) tone = styles.optionCorrect;
              else if (isWrongPick) tone = styles.optionWrong;
              return (
                <View key={option} style={styles.optionWrap}>
                  <Pressable
                    disabled={revealed}
                    onPress={() => setPicked(option)}
                    style={({ pressed }) => [styles.option, tone, pressed && !revealed && { transform: [{ scale: 0.98 }] }]}
                  >
                    <Text style={styles.optionText} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {option}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {revealed && !!question.explanation && (
            <View style={styles.revealArea}>
              <Text style={styles.explHeading}>{t.explanationHeading}</Text>
              <View style={styles.explCard}>
                <Text style={styles.explText}>{question.explanation}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.bottom}>
          <View style={styles.navRow}>
            {!revealed ? (
              <GoldCta label={`${t.skip} · ${SKIP_COST}`} onPress={goNext} style={styles.navPrimary} />
            ) : (
              <>
                {index > 0 && <GoldCta label={t.back} icon="arrow-back" onPress={goPrev} style={styles.navPrimary} />}
                <GoldCta label={t.next} icon="arrow-forward" iconRight onPress={goNext} style={styles.navPrimary} />
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      <FQReportSheet
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
        questionId={question.id}
        locale={locale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: FQColors.bgDeep },
  safe: { flex: 1 },
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
    color: FQColors.goldLight,
    fontWeight: '900',
    fontSize: 18,
    marginTop: 20,
    textShadowColor: FQColors.gold,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 8, paddingTop: 45 },
  prompt: { fontSize: 20, fontWeight: '900', color: FQColors.text, textAlign: 'center', marginBottom: 18 },

  options: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  optionWrap: { width: '48%' },
  option: {
    width: '100%',
    height: 64,
    backgroundColor: 'rgba(12,14,16,0.72)',
    borderRadius: FQRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
  },
  optionIdle: {},
  optionCorrect: { backgroundColor: 'rgba(255,201,60,0.22)', borderColor: FQColors.gold },
  optionWrong: { backgroundColor: 'rgba(255,59,87,0.20)', borderColor: FQColors.wrong },
  optionText: { fontSize: 15, fontWeight: '800', color: FQColors.text, textAlign: 'center' },

  revealArea: { marginTop: 18, alignItems: 'center' },
  explHeading: {
    fontSize: 15,
    fontWeight: '900',
    color: FQColors.goldLight,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: FQColors.gold,
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  explCard: {
    backgroundColor: 'rgba(12,14,16,0.72)',
    borderRadius: FQRadius.md,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
    padding: 14,
    width: '100%',
  },
  explText: { fontSize: 14, fontWeight: '600', color: FQColors.text, lineHeight: 20, textAlign: 'center' },

  bottom: { marginTop: 'auto', paddingTop: 12, paddingBottom: 10 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  navPrimary: { flexGrow: 1, flexShrink: 1, flexBasis: 0, height: 56 },
});
