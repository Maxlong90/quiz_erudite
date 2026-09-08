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

import { AppBackground } from '@/components/italy-quiz/app-background';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { HelpModal } from '@/components/italy-quiz/help-modal';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';
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

/** Answer button height — same as the Flags Quiz option tiles. */
const OPTION_H = 68;

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
        colors={[ItalyColors.bgTop, ItalyColors.bgMid, ItalyColors.bgBottom]}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[ItalyColors.bgGlow, 'rgba(200, 214, 255, 0)']}
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
        /* Report form. The shared ReportModal paints itself from the erudite
           theme (purple), so Italy uses the colour-configurable sheet instead —
           the same one Flags Quiz opens — in the app's blue. */
        <QuizMenuModal
          visible={reportOpen}
          onClose={() => setReportOpen(false)}
          question={{ id: question.id } as unknown as LogoQuizQuestion}
          appConfig={undefined}
          locale={locale}
          initialView="report"
          primaryGradient={[ItalyColors.tileLight, ItalyColors.tileDark]}
          sheetGradient={['#E8F0FF', '#B9CEF6']}
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
    const tier = pct >= 80 ? 'excellent' : pct >= 40 ? 'good' : 'keepGoing';
    const tierColor = tier === 'excellent' ? '#37B24D' : tier === 'good' ? '#F59F00' : '#E03131';
    // A perfect run always earns the trophy; nothing right gets a soft smile.
    const allCorrect = total > 0 && score === total;
    const emoji = allCorrect
      ? '\u{1F3C6}'
      : score === 0
        ? '\u{1F972}'
        : tier === 'excellent'
          ? '\u{1F389}'
          : tier === 'good'
            ? '\u{1F44D}'
            : '\u{1F4AA}';
    const message =
      tier === 'excellent'
        ? t.resultExcellent
        : tier === 'good'
          ? t.resultGood
          : t.resultKeepGoing;
    // Snapshot the misses now — starting the review resets the live list.
    const misses = [...wrong];

    return (
      <View style={styles.fill}>
        {/* Home artwork, softened the same ~30% as the Flags Quiz result. */}
        <AppBackground blurRadius={13} />
        <View style={styles.resultScrim} pointerEvents="none" />
        <StatusBar style="light" />

        <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
          <ScrollView
            contentContainerStyle={styles.resultScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.resultTitle}>{t.resultTitle}</Text>

            {/* Big square score tile — the Flags Quiz shape in the Italy palette. */}
            <LinearGradient
              colors={[ItalyColors.tileLight, ItalyColors.tileDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.square, { borderColor: tierColor }, ItalyShadow.card]}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                style={styles.squareGloss}
                pointerEvents="none"
              />
              <Text
                style={[styles.score, { color: tierColor }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >{`${score}/${total}`}</Text>
              <Text style={[styles.percent, { color: tierColor }]}>{`${pct}%`}</Text>
              <Text style={styles.caption}>{t.resultCaption}</Text>
            </LinearGradient>

            <Text style={styles.message}>{message}</Text>

            <View style={styles.resultButtons}>
              {misses.length > 0 ? (
                <GlossyButton
                  label={`${t.retryMistakes} (${misses.length})`}
                  fontSize={20}
                  paddingVertical={18}
                  onPress={() => startRun(misses)}
                />
              ) : null}
              <GlossyButton
                label={t.playAgain}
                fontSize={22}
                paddingVertical={18}
                onPress={() => startRun(null)}
              />
              <GlossyButton
                label={t.backToCategories}
                fontSize={22}
                paddingVertical={18}
                onPress={() => router.dismissTo('/italy-quiz/categories')}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
        {Modals}
      </View>
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

        {/* 2x2 grid, like Flags Quiz: two options per row, facing each other. */}
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
                style={({ pressed }) => [
                  styles.optionWrap,
                  pressed && !answered && styles.pressed,
                ]}
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
  fill: { flex: 1, backgroundColor: ItalyColors.bgBottom },
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
    // One icon-tile of breathing room under the HUD row.
    paddingTop: 44,
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  counterText: {
    color: '#D6DEFF',
    fontWeight: '800',
    fontSize: 20,
  },

  // Half an answer-button of space between the title block and the question.
  body: { paddingHorizontal: 20, paddingTop: OPTION_H / 2, paddingBottom: 20, gap: 14 },

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
    backgroundColor: ItalyColors.cardBg,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: ItalyColors.cardRim,
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

  // Two per row, facing each other — the Flags Quiz answer grid.
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
  },
  optionWrap: { width: '48%' },
  option: {
    height: OPTION_H,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
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
    color: ItalyColors.tileGlyph,
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  /** Green/red states are dark, so their label flips to white. */
  optionTextLit: { color: '#FFFFFF' },

  // White card, navy rim, navy text — same treatment as the Flags Quiz note.
  explainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: ItalyColors.tileRim,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  explainText: {
    color: ItalyColors.ink,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
  },

  // Pinned above the safe-area bottom; the button itself only takes the width of
  // its own label (alignSelf: centre) instead of stretching edge to edge.
  footer: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  nextWrap: { width: '48%', alignSelf: 'center' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  note: { color: '#E7ECFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },

  // --- Result screen (blurred home artwork + Flags-Quiz score tile) ---
  resultScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(33, 47, 99, 0.55)',
  },
  resultScroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    gap: 18,
  },
  emoji: { fontSize: 64, lineHeight: 76 },
  resultTitle: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '900',
    textShadowColor: 'rgba(4, 16, 60, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  square: {
    width: 200,
    height: 200,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginVertical: 4,
    overflow: 'hidden',
  },
  squareGloss: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: '50%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  score: {
    fontSize: 56,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    alignSelf: 'stretch',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  percent: { fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  caption: { color: ItalyColors.tileGlyph, fontSize: 14, fontWeight: '700', marginTop: 2 },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  resultButtons: { width: '100%', gap: 12, marginTop: 4 },

  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});
