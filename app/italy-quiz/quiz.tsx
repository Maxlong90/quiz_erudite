import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { ActInterlude } from '@/components/italy-quiz/act-interlude';
import { GlossyIconButton } from '@/components/italy-quiz/glossy-icon-button';
import { GlossyButton } from '@/components/italy-quiz/glossy-button';
import { HelpModal } from '@/components/italy-quiz/help-modal';
import { ScaleSlider, ScaleReadout } from '@/components/italy-quiz/scale-slider';
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';
import { ItalyColors, ItalyShadow } from '@/constants/italy-quiz/theme';
import { useItalyLabels } from '@/constants/italy-quiz/labels';
import { getPlace, pickText, useItalyPlace } from '@/constants/italy-quiz/places';
import { formatScaleGap, formatScaleValue } from '@/constants/italy-quiz/question';
import { getTourQuestions } from '@/constants/italy-quiz/tour-content';
import { useFirstRunHelp } from '@/hooks/italy-quiz/use-first-run-help';
import { useTourProgress } from '@/hooks/italy-quiz/use-tour-progress';
import { useLocale } from '@/hooks/use-locale';
import { getStoreLinks } from '@/lib/store-links';

/**
 * How long a WRONG multiple-choice pick stays lit before the tour moves on. The
 * right option is never revealed — the missed question comes back in the
 * end-of-tour review instead, which is worthless if the answer was just shown.
 */
const WRONG_ADVANCE_MS = 700;

const OPTION_H = 68;

const CORRECT = { light: '#3FBF6A', dark: '#12703B', rim: '#0A4223' };
const WRONG = { light: '#E2606A', dark: '#8E1B27', rim: '#4E0D14' };

/**
 * Italy Quiz gameplay — one TOUR of one place (place picker → here).
 *
 * A tour is twenty questions split into four acts by time: antiquity → middle
 * ages → renaissance → today, five questions each, with an interlude card
 * between acts. Inside an act the disciplines are mixed on purpose, which is what
 * replaced the old subject subcategories: the player is not tested on "History",
 * they walk one city from its founding to its football derby.
 *
 * Two question shapes share the screen. A `choice` question behaves as before — a
 * wrong pick reveals nothing and auto-advances, a correct one shows the
 * explanation and waits for Next. A `scale` question is answered on a slider and
 * ALWAYS reveals the true value, right or wrong: a number means nothing without
 * the real number next to it, and unlike a hidden multiple-choice answer it
 * teaches something the moment it is shown.
 *
 * Questions come from `constants/italy-quiz/tour-content` — hand-authored files
 * in the app. Nothing here reads the backend content snapshot.
 */
export default function ItalyQuizGame() {
  const { place: placeId } = useLocalSearchParams<{ place?: string }>();
  const t = useItalyLabels();
  const { locale } = useLocale();
  const place = useItalyPlace(placeId);
  const rawPlace = useMemo(() => getPlace(placeId), [placeId]);
  const questions = useMemo(() => getTourQuestions(placeId), [placeId]);
  const byId = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);

  const [helpOpen, setHelpOpen] = useFirstRunHelp();
  const [reportOpen, setReportOpen] = useState(false);

  const [epoch, setEpoch] = useState(0);
  const [retryIds, setRetryIds] = useState<number[] | null>(null);
  const [done, setDone] = useState(false);
  /** The intro card is dismissed once per tour; a resumed tour skips it. */
  const [introDone, setIntroDone] = useState(false);
  /** Position whose interlude the player has already tapped through. */
  const [interludeSeen, setInterludeSeen] = useState<number | null>(null);

  // Answer state for the current question, reset whenever the question changes.
  const [picked, setPicked] = useState<number | null>(null);
  const [guess, setGuess] = useState<number | null>(null);
  const [guessLocked, setGuessLocked] = useState(false);

  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current);
    },
    [],
  );

  const isRetry = !!(retryIds && retryIds.length > 0);

  const { hydrated, ids, pos, wrong, setPos, addWrong, clear } = useTourProgress({
    key: isRetry || !placeId ? null : `italy.tour.${placeId}`,
    place: rawPlace,
    questions,
    retry: retryIds,
    epoch,
  });

  const question = ids[pos] != null ? byId.get(ids[pos]) : undefined;
  const prevQuestion = pos > 0 && ids[pos - 1] != null ? byId.get(ids[pos - 1]) : undefined;
  const act = rawPlace?.acts.find((a) => a.id === question?.act) ?? null;

  // A fresh scale question starts with the slider in the middle — a neutral
  // position that does not hint at the answer.
  useEffect(() => {
    setPicked(null);
    setGuessLocked(false);
    setGuess(question?.kind === 'scale' ? Math.round((question.min + question.max) / 2) : null);
    // Keyed on the question's identity only: min/max belong to that question, so
    // listing them would just re-run the reset without ever changing the outcome.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, question?.kind]);

  // Resuming mid-tour drops the player straight back into the question.
  useEffect(() => {
    if (hydrated && pos > 0) setIntroDone(true);
  }, [hydrated, pos]);

  const score = Math.max(0, pos - wrong.length);

  const finish = useCallback(() => {
    setDone(true);
    clear();
  }, [clear]);

  const goNext = useCallback(() => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    if (pos + 1 >= ids.length) {
      finish();
      return;
    }
    setPos(pos + 1);
  }, [pos, ids.length, setPos, finish]);

  const onPick = useCallback(
    (i: number) => {
      if (picked !== null || !question || question.kind !== 'choice') return;
      const right = i === question.correct;
      Haptics.notificationAsync(
        right
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error,
      ).catch(() => {});
      setPicked(i);
      if (right) return; // explanation + Next; the player sets the pace

      addWrong(question.id);
      const last = pos + 1 >= ids.length;
      advanceTimer.current = setTimeout(() => {
        if (last) finish();
        else setPos(pos + 1);
      }, WRONG_ADVANCE_MS);
    },
    [picked, question, pos, ids.length, addWrong, setPos, finish],
  );

  const onLockGuess = useCallback(() => {
    if (!question || question.kind !== 'scale' || guess == null || guessLocked) return;
    const right = Math.abs(guess - question.answer) <= question.tolerance;
    Haptics.notificationAsync(
      right ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error,
    ).catch(() => {});
    setGuessLocked(true);
    if (!right) addWrong(question.id);
  }, [question, guess, guessLocked, addWrong]);

  const startTour = useCallback((idsForRetry: number[] | null) => {
    if (advanceTimer.current) clearTimeout(advanceTimer.current);
    setRetryIds(idsForRetry);
    setPicked(null);
    setGuessLocked(false);
    setDone(false);
    setInterludeSeen(null);
    setIntroDone(idsForRetry != null);
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

  const Modals = (
    <>
      <HelpModal visible={helpOpen} onClose={() => setHelpOpen(false)} />
      {question ? (
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

  const Shell = (children: React.ReactNode, header?: React.ReactNode) => (
    <View style={styles.fill}>
      {Background}
      <StatusBar style="light" />
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        {Hud}
        {header}
        {children}
      </SafeAreaView>
      {Modals}
    </View>
  );

  // --- Empty (a locked place opened directly) --------------------------------
  if (!rawPlace || ids.length === 0 || !hydrated) {
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
        <AppBackground blurRadius={13} />
        <View style={styles.resultScrim} pointerEvents="none" />
        <StatusBar style="light" />

        <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.resultScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={styles.resultTitle}>{t.resultTitle}</Text>

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
                  onPress={() => startTour(misses)}
                />
              ) : null}
              <GlossyButton
                label={t.playAgain}
                fontSize={22}
                paddingVertical={18}
                onPress={() => startTour(null)}
              />
              <GlossyButton
                label={t.whereTo}
                fontSize={22}
                paddingVertical={18}
                onPress={() => router.dismissTo('/italy-quiz/places')}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
        {Modals}
      </View>
    );
  }

  // --- Tour intro ------------------------------------------------------------
  if (!introDone) {
    return Shell(
      <View style={styles.introWrap}>
        <View style={styles.introCentre}>
          <Text style={styles.introTitle}>{place?.title}</Text>
          <Text style={styles.introTagline}>{place?.tagline}</Text>
          <View style={styles.actList}>
            {rawPlace.acts.map((a) => (
              <View key={a.id} style={styles.actRow}>
                <Text style={styles.actRowIcon}>{a.icon}</Text>
                <Text style={styles.actRowLabel}>{pickText(a.label, locale)}</Text>
                <Text style={styles.actRowCount}>
                  {ids.filter((id) => byId.get(id)?.act === a.id).length}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.introFooter}>
          <GlossyButton
            label={t.startTour}
            fontSize={26}
            paddingVertical={16}
            onPress={() => setIntroDone(true)}
          />
        </View>
      </View>,
    );
  }

  // --- Interlude between acts ------------------------------------------------
  // Fires when the act changes from one question to the next. Suppressed during a
  // mistakes review, where the questions jump between acts by definition.
  const actChanged = !!prevQuestion && prevQuestion.act !== question.act;
  if (!isRetry && actChanged && interludeSeen !== pos && act?.interlude) {
    return Shell(
      <ActInterlude
        icon={act.icon}
        headline={pickText(act.interlude.headline, locale)}
        body={pickText(act.interlude.body, locale)}
        cta={t.interludeCta}
        destination={pickText(act.interlude.destination, locale)}
        onContinue={() => setInterludeSeen(pos)}
      />,
    );
  }

  // --- Question --------------------------------------------------------------
  const answeredChoice = picked !== null;
  const answeredRight = answeredChoice && question.kind === 'choice' && picked === question.correct;
  const callbackQuestion = question.callback ? byId.get(question.callback) : undefined;

  const ActStrip = (
    <View style={styles.actStrip}>
      {rawPlace.acts.map((a) => {
        const actIds = ids.filter((id) => byId.get(id)?.act === a.id);
        const answeredHere = actIds.filter((id) => ids.indexOf(id) < pos).length;
        const isCurrent = a.id === question.act;
        return (
          <View key={a.id} style={styles.actSeg}>
            <Text style={[styles.actIcon, !isCurrent && styles.actIconDim]}>{a.icon}</Text>
            <View style={styles.actBar}>
              <View
                style={[
                  styles.actBarFill,
                  {
                    width: actIds.length
                      ? `${Math.round((answeredHere / actIds.length) * 100)}%`
                      : '0%',
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );

  const TitleRow = (
    <View style={styles.titleRow}>
      {ActStrip}
      <Text style={styles.title} numberOfLines={1}>
        {place?.title}
        {act ? ` · ${pickText(act.label, locale)}` : ''}
      </Text>
      <Text style={styles.counterText}>
        {pos + 1}/{ids.length}
      </Text>
    </View>
  );

  const scaleAnswered = question.kind === 'scale' && guessLocked;
  const scaleRight =
    question.kind === 'scale' && guess != null
      ? Math.abs(guess - question.answer) <= question.tolerance
      : false;
  const showExplanation =
    (question.kind === 'choice' && answeredRight) || (question.kind === 'scale' && guessLocked);
  const showNext = showExplanation;

  return Shell(
    <>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        {/* "Then" ribbon — the earlier question this one answers back to. */}
        {callbackQuestion ? (
          <View style={styles.callback}>
            {callbackQuestion.image ? (
              <Image source={callbackQuestion.image} style={styles.callbackThumb} />
            ) : null}
            <View style={styles.callbackText}>
              <Text style={styles.callbackLabel}>↩ {t.callbackThen}</Text>
              <Text style={styles.callbackBody} numberOfLines={3}>
                {pickText(callbackQuestion.question, locale)}
              </Text>
            </View>
          </View>
        ) : null}

        {question.image ? (
          <View style={styles.imageFrame}>
            <Image source={question.image} style={styles.image} resizeMode="cover" />
          </View>
        ) : null}

        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{pickText(question.question, locale)}</Text>
        </View>

        {question.kind === 'choice' ? (
          <View style={styles.options}>
            {question.options.map((opt, i) => {
              // ONLY the tapped option lights up — a wrong pick never reveals
              // where the right answer was.
              const scheme =
                answeredChoice && i === picked ? (answeredRight ? CORRECT : WRONG) : null;
              return (
                <Pressable
                  key={i}
                  onPress={() => onPick(i)}
                  disabled={answeredChoice}
                  style={({ pressed }) => [
                    styles.optionWrap,
                    pressed && !answeredChoice && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    colors={
                      scheme ? [scheme.light, scheme.dark] : [ItalyColors.tileLight, ItalyColors.tileDark]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.option,
                      ItalyShadow.card,
                      { borderColor: scheme ? scheme.rim : ItalyColors.tileRim },
                      answeredChoice && !scheme && styles.optionDimmed,
                    ]}
                  >
                    <LinearGradient
                      colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']}
                      style={styles.optionGloss}
                      pointerEvents="none"
                    />
                    <Text
                      style={[styles.optionText, scheme && styles.optionTextLit]}
                      numberOfLines={2}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {pickText(opt, locale)}
                    </Text>
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        ) : (
          <View style={styles.scaleBlock}>
            <ScaleReadout
              text={formatScaleValue(guess ?? question.min, question.display, locale)}
            />
            <ScaleSlider
              min={question.min}
              max={question.max}
              value={guess ?? question.min}
              onChange={setGuess}
              disabled={guessLocked}
              answer={guessLocked ? question.answer : undefined}
              correct={scaleRight}
            />
            <View style={styles.scaleEnds}>
              <Text style={styles.scaleEnd}>
                {formatScaleValue(question.min, question.display, locale)}
              </Text>
              <Text style={styles.scaleEnd}>
                {formatScaleValue(question.max, question.display, locale)}
              </Text>
            </View>

            {scaleAnswered ? (
              <View style={styles.scaleVerdict}>
                <Text style={[styles.scaleVerdictTop, { color: scaleRight ? '#7BE8A5' : '#FFD54A' }]}>
                  {scaleRight
                    ? t.scaleSpotOn
                    : t.scaleMiss.replace(
                        '{gap}',
                        formatScaleGap(guess! - question.answer, question.display, locale),
                      )}
                </Text>
                <Text style={styles.scaleVerdictBottom}>
                  {t.scaleTruth.replace(
                    '{value}',
                    formatScaleValue(question.answer, question.display, locale),
                  )}
                </Text>
              </View>
            ) : (
              <View style={styles.scaleConfirmWrap}>
                <GlossyButton
                  label={t.scaleConfirm}
                  fontSize={20}
                  paddingVertical={14}
                  onPress={onLockGuess}
                />
              </View>
            )}
          </View>
        )}

        {showExplanation ? (
          <View style={styles.explainCard}>
            <Text style={styles.explainText}>{pickText(question.explanation, locale)}</Text>
          </View>
        ) : null}
      </ScrollView>

      {showNext ? (
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
    TitleRow,
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

  // --- Act progress strip ----------------------------------------------------
  actStrip: { flexDirection: 'row', alignSelf: 'stretch', gap: 8, paddingHorizontal: 4 },
  actSeg: { flex: 1, alignItems: 'center', gap: 4 },
  actIcon: { fontSize: 16 },
  actIconDim: { opacity: 0.45 },
  actBar: {
    height: 5,
    alignSelf: 'stretch',
    borderRadius: 3,
    backgroundColor: 'rgba(8, 22, 66, 0.45)',
    overflow: 'hidden',
  },
  actBarFill: { height: '100%', borderRadius: 3, backgroundColor: ItalyColors.tileLight },

  titleRow: { alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 8 },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  counterText: { color: '#D6DEFF', fontWeight: '800', fontSize: 16 },

  body: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 14 },

  // --- Callback ribbon -------------------------------------------------------
  callback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(8, 22, 66, 0.45)',
    borderRadius: 14,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: 'rgba(210, 224, 255, 0.4)',
    borderLeftColor: ItalyColors.tileLight,
    padding: 10,
  },
  callbackThumb: { width: 54, height: 54, borderRadius: 10 },
  callbackText: { flex: 1, gap: 2 },
  callbackLabel: {
    color: ItalyColors.tileLight,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  callbackBody: { color: '#E7ECFF', fontSize: 13, fontWeight: '600', lineHeight: 18 },

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
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 25,
  },

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
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
  },
  /** Green/red states are dark, so their label flips to white. */
  optionTextLit: { color: '#FFFFFF' },

  // --- Scale question --------------------------------------------------------
  scaleBlock: { gap: 8, paddingHorizontal: 4 },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  scaleEnd: { color: '#C3CEF5', fontSize: 12, fontWeight: '700' },
  scaleConfirmWrap: { width: '55%', alignSelf: 'center', marginTop: 8 },
  scaleVerdict: { alignItems: 'center', marginTop: 6, gap: 2 },
  scaleVerdictTop: { fontSize: 20, fontWeight: '900' },
  scaleVerdictBottom: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  explainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: ItalyColors.tileRim,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  explainText: { color: ItalyColors.ink, fontSize: 15, fontWeight: '600', lineHeight: 21 },

  footer: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 8 },
  nextWrap: { width: '48%', alignSelf: 'center' },

  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 8 },
  note: { color: '#E7ECFF', fontSize: 16, fontWeight: '700', textAlign: 'center' },

  // --- Tour intro ------------------------------------------------------------
  introWrap: { flex: 1, paddingHorizontal: 28, paddingBottom: 24 },
  introCentre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  introTitle: {
    color: '#FFFFFF',
    fontSize: 40,
    fontWeight: '900',
    textAlign: 'center',
    textShadowColor: 'rgba(4, 16, 60, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  introTagline: {
    color: '#D6DEFF',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  actList: { alignSelf: 'stretch', gap: 10 },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(8, 22, 66, 0.35)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(210, 224, 255, 0.3)',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actRowIcon: { fontSize: 22 },
  actRowLabel: { flex: 1, color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  actRowCount: { color: '#C3CEF5', fontSize: 17, fontWeight: '900' },
  introFooter: { width: '100%' },

  // --- Result screen ---------------------------------------------------------
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
