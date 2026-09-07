import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { HelpModal } from '@/components/italy-quiz/help-modal';
import { ReportModal } from '@/components/quiz/report-modal';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { useItalyLabels } from '@/constants/italy-quiz/labels';
import { useItalyCategory, RUN_PHOTO_MIX } from '@/constants/italy-quiz/categories';
import { useFirstRunHelp } from '@/hooks/italy-quiz/use-first-run-help';
import { useRunProgress } from '@/hooks/italy-quiz/use-run-progress';
import { useContentCache } from '@/hooks/use-content-cache';
import { useLocale } from '@/hooks/use-locale';
import { resolveLocalImage } from '@/lib/content-cache';
import { getStoreLinks } from '@/lib/store-links';

/** Questions drawn per run. */
const RUN_LENGTH = 50;

/**
 * How long a WRONG pick stays lit before the run moves on. A wrong pick never
 * reveals the correct answer (mirrors Flags Quiz / Coat of Arms) — the missed
 * question simply comes back in the end-of-run mistakes review. A CORRECT pick
 * does not auto-advance: it shows the explanation and waits for "Next".
 */
const WRONG_ADVANCE_MS = 700;

/** Answer-state colours — green for a correct pick, red for a wrong one. */
const CORRECT = { light: '#3FBF6A', dark: '#12703B', rim: '#0A4223' };
const WRONG = { light: '#E2606A', dark: '#8E1B27', rim: '#4E0D14' };

/**
 * Italy Quiz gameplay (subcategory → here). Mixed text/photo multiple choice: a
 * question carries an image only when the backend generated an `image_questions`
 * item, so the card shows the photo when there is one and reads as a plain text
 * question otherwise.
 *
 * Answer flow: only the TAPPED option lights up. A wrong pick never reveals the
 * right answer and moves on by itself; a correct pick reveals the explanation and
 * waits for the "Next" button. Missed questions are collected and replayable from
 * the result screen ("Review mistakes").
 *
 * The run's order/position/mistakes live in useRunProgress, so leaving the app
 * mid-run and coming back resumes on the same question with the same score — and
 * a background content re-sync can never reshuffle the run underfoot.
 */
export default function ItalyQuizGame() {
  const { cat, sub } = useLocalSearchParams<{ cat?: string; sub?: string }>();
  const t = useItalyLabels();
  const { locale } = useLocale();
  const category = useItalyCategory(cat);
  const { snapshot, status } = useContentCache();

  const [helpOpen, setHelpOpen] = useFirstRunHelp();
  const [reportOpen, setReportOpen] = useState(false);

  // `epoch` forces a brand-new run (Play again / Review mistakes); `retryIds`
  // restricts that run to the questions just missed.
  const [epoch, setEpoch] = useState(0);
  const [retryIds, setRetryIds] = useState<number[] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  // `sub` is the backend category slug — the same value the snapshot puts on
  // each question's `category_slug`, so it doubles as the run's filter key.
  const subcategory = useMemo(
    () => category?.subcategories.find((s) => s.slug === sub) ?? null,
    [category, sub],
  );

  /** Every question of this subcategory, keyed by id for O(1) lookup. */
  const pool = useMemo(() => {
    if (!snapshot || !sub) return [];
    return snapshot.questions.filter((q) => q.category_slug === sub);
  }, [snapshot, sub]);

  // Only id + hasImage reach the run builder, so it can compose a fixed
  // text/photo ratio for the subcategories that ask for one.
  const poolMeta = useMemo(
    () => pool.map((q) => ({ id: q.id, hasImage: !!q.image_url })),
    [pool],
  );
  const byId = useMemo(() => new Map(pool.map((q) => [q.id, q])), [pool]);

  const {
    hydrated,
    ids,
    pos,
    wrong,
    setPos,
    addWrong,
    clear,
  } = useRunProgress({
    key: retryIds ? null : sub ? `italy.run.${sub}` : null,
    pool: poolMeta,
    limit: RUN_LENGTH,
    photoMix: sub ? (RUN_PHOTO_MIX[sub] ?? null) : null,
    retry: retryIds,
    ready: pool.length > 0,
    epoch,
  });

  const raw = ids[pos] != null ? byId.get(ids[pos]) : undefined;
  const question = raw
    ? {
        id: raw.id,
        question: raw.question,
        options: raw.options,
        correct_option: raw.correct_option,
        explanation: raw.explanation,
        imageUri: resolveLocalImage(snapshot, raw.image_url),
      }
    : null;

  // Every answered question is either right or wrong, so the score is derived.
  const score = Math.max(0, pos - wrong.length);

  const goNext = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (pos + 1 >= ids.length) {
      setDone(true);
      clear();
      return;
    }
    setPos(pos + 1);
    setPicked(null);
  }, [pos, ids.length, setPos, clear]);

  const onPick = useCallback(
    (i: number) => {
      if (picked !== null || !question) return;
      const right = i === question.correct_option;
      Haptics.notificationAsync(
        right
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      setPicked(i);
      if (right) {
        // Correct: the explanation appears and the player taps Next when ready.
        return;
      }
      // Wrong: remembered for the review; the right answer stays hidden and the
      // run moves on by itself.
      addWrong(question.id);
      const last = pos + 1 >= ids.length;
      advanceTimer.current = setTimeout(() => {
        if (last) {
          setDone(true);
          clear();
          return;
        }
        setPos(pos + 1);
        setPicked(null);
      }, WRONG_ADVANCE_MS);
    },
    [picked, question, pos, ids.length, addWrong, setPos, clear],
  );

  const startRun = useCallback((idsForRetry: number[] | null) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRetryIds(idsForRetry);
    setPicked(null);
    setDone(false);
    setEpoch((e) => e + 1);
  }, []);

  const onShare = useCallback(() => {
    const { storeUrl } = getStoreLinks(null, Platform.OS);
    Share.share({ message: t.shareInvite.replace('{url}', storeUrl) }).catch(() => {});
  }, [t.shareInvite]);

  const Background = (
    <>
      <LinearGradient
        colors={['#6E7FD6', '#43539F', '#212F63']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(200, 214, 255, 0.5)', 'rgba(200, 214, 255, 0)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
        pointerEvents="none"
      />
    </>
  );

  /** Back on the left, help / report / share on the right — as in Flags Quiz. */
  const Hud = (
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
  );

  const TitleRow = (
    <View style={styles.titleRow}>
      {/* Some titles are deliberately two-line (e.g. «Средневековье\nи города-государства»). */}
      <Text style={styles.title} numberOfLines={2}>
        {subcategory?.title ?? ''}
      </Text>
      {!done && question ? (
        <Text style={styles.counterText}>
          {pos + 1}/{ids.length}
        </Text>
      ) : null}
    </View>
  );

  const Modals = (
    <>
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
      {question ? (
        <ReportModal
          visible={reportOpen}
          contentType="question"
          contentId={question.id}
          locale={locale}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </>
  );

  const Shell = (children: React.ReactNode) => (
    <View style={styles.fill}>
      {Background}
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {Hud}
        {TitleRow}
        {children}
      </SafeAreaView>
      {Modals}
    </View>
  );

  // --- Loading / empty -------------------------------------------------------
  if ((!snapshot && (status === 'idle' || status === 'syncing')) || (pool.length > 0 && !hydrated)) {
    return Shell(
      <View style={styles.centre}>
        <ActivityIndicator color="#FFFFFF" size="large" />
        <Text style={styles.note}>{t.loadingContent}</Text>
      </View>,
    );
  }

  if (pool.length === 0 || ids.length === 0) {
    return Shell(
      <View style={styles.centre}>
        <Text style={styles.note}>{t.noQuestions}</Text>
      </View>,
    );
  }

  // --- Result ----------------------------------------------------------------
  if (done || !question) {
    const total = ids.length;
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    const verdict =
      pct >= 80 ? t.resultExcellent : pct >= 50 ? t.resultGood : t.resultKeepGoing;
    // Snapshot the misses now — starting the review resets the live list.
    const misses = [...wrong];
    return Shell(
      <>
        <View style={styles.centre}>
          <Text style={styles.resultTitle}>{t.resultTitle}</Text>
          <Text style={styles.resultScore}>
            {score}/{total}
          </Text>
          <Text style={styles.resultCaption}>{t.resultCaption}</Text>
          <Text style={styles.verdict}>{verdict}</Text>
        </View>
        <View style={styles.resultActions}>
          {misses.length > 0 ? (
            <GlossyButton
              label={`${t.retryMistakes} (${misses.length})`}
              fontSize={19}
              paddingVertical={16}
              onPress={() => startRun(misses)}
            />
          ) : null}
          <GlossyButton
            label={t.playAgain}
            fontSize={20}
            paddingVertical={16}
            onPress={() => startRun(null)}
          />
          <GlossyButton
            label={t.backToCategories}
            fontSize={20}
            paddingVertical={16}
            onPress={() => router.dismissTo('/italy-quiz/categories')}
          />
        </View>
      </>,
    );
  }

  // --- Question --------------------------------------------------------------
  const answered = picked !== null;
  const answeredRight = answered && picked === question.correct_option;

  return Shell(
    <>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo questions carry an image; text questions simply don't. */}
        {question.imageUri ? (
          <View style={styles.imageFrame}>
            <Image
              source={{ uri: question.imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ) : null}

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        <View style={styles.options}>
          {question.options.map((opt, i) => {
            // ONLY the tapped option lights up. A wrong pick never reveals
            // where the right answer was.
            const scheme =
              answered && i === picked ? (answeredRight ? CORRECT : WRONG) : null;
            return (
              <Pressable
                key={i}
                onPress={() => onPick(i)}
                disabled={answered}
                style={({ pressed }) => pressed && !answered && styles.pressed}
              >
                <LinearGradient
                  colors={
                    scheme
                      ? [scheme.light, scheme.dark]
                      : [ItalyColors.tileLight, ItalyColors.tileDark]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.option,
                    ItalyShadow.card,
                    { borderColor: scheme ? scheme.rim : ItalyColors.tileRim },
                    answered && !scheme && styles.optionDimmed,
                  ]}
                >
                  <LinearGradient
                    colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                    style={styles.optionGloss}
                    pointerEvents="none"
                  />
                  <Text style={styles.optionText}>{opt}</Text>
                </LinearGradient>
              </Pressable>
            );
          })}
        </View>

        {/* Explanation only after a CORRECT pick — on a miss it would give the
            answer away, which is exactly what the mistakes review avoids. */}
        {answeredRight && question.explanation ? (
          <View style={styles.explainCard}>
            <Text style={styles.explainText}>{question.explanation}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Pinned footer: only after a correct answer, hugging its own label. */}
      {answeredRight ? (
        <View style={styles.footer}>
          <View style={styles.nextWrap}>
            <GlossyButton
              label={pos + 1 >= ids.length ? t.finish : t.next}
              fontSize={20}
              paddingVertical={14}
              onPress={goNext}
            />
          </View>
        </View>
      ) : null}
    </>,
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#212F63' },
  topGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 280 },

  hud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  hudRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  titleRow: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  counterText: {
    color: '#D6DEFF',
    fontWeight: '800',
    fontSize: 15,
  },

  body: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20, gap: 14 },

  imageFrame: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(6, 15, 56, 0.45)',
  },
  image: { width: '100%', height: '100%' },

  questionCard: {
    backgroundColor: 'rgba(10, 27, 84, 0.72)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 26,
  },

  options: { gap: 12 },
  option: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 2,
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
  optionDimmed: { opacity: 0.55 },
  optionText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },

  explainCard: {
    backgroundColor: 'rgba(6, 15, 56, 0.62)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 14,
  },
  explainText: { color: '#E7ECFF', fontSize: 15, lineHeight: 21 },

  // Pinned above the safe-area bottom; the button itself only takes the width of
  // its own label (alignSelf: centre) instead of stretching edge to edge.
  footer: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  nextWrap: { alignSelf: 'center' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  note: { color: '#E7ECFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },

  resultTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  resultScore: { color: '#FFFFFF', fontSize: 64, fontWeight: '900' },
  resultCaption: { color: '#D6DEFF', fontSize: 15, fontWeight: '700' },
  verdict: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  resultActions: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
