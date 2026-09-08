/**
 * The configurable template's mode picker — a deliberate COPY of
 * app/quiz-mode/[slug].tsx, for the reasons app/t/quiz.tsx's docblock sets out:
 * a screen owns a route, so each app gets its own; the leaf components it
 * renders (ScreenBackground, IconSymbol, TimedCountModal) are shared, not
 * duplicated.
 *
 * The diff against app/quiz-mode/[slug].tsx is six things:
 *  1. the palette arrives through hooks/t/use-template-theme.ts — at BOTH call
 *     sites, the screen and ModeCard;
 *  2. the card artwork comes from hooks/t/use-tile-gradients.ts instead of
 *     constants/category-visuals.ts. Only the EMOJI is still read from `visual`;
 *  3. the crown's `#ffd23a` is now `colors.gold`, and the badge pill's
 *     `#00000066` is now the named TILE_BADGE_SCRIM — the two live colour
 *     literals the original carried;
 *  4. starting a run pushes '/t/quiz' rather than '/quiz', which is the whole
 *     point of the port: without it the template's mode picker would launch the
 *     ERUDITE quiz loop;
 *  5. each ModeCard takes a REQUIRED `testID`, so a sixth card cannot ship
 *     unaddressable to the suite;
 *  6. twelve dead style keys are gone: `cardTall`, and the eleven-key chip
 *     cluster (`timedHeader`, `chipRow`, `chipLabel`, `chips`, `chip`,
 *     `chipActive`, `chipText`, `chipTextActive`, `startBtn`, `startBtnPressed`,
 *     `startBtnText`). Those chips MOVED INTO and were RE-THEMED in
 *     components/quiz-mode/timed-count-modal.tsx, which draws them from
 *     `c.accent`/`c.onAccent`; the keys left behind here were unreachable and
 *     carried nine of this file's eleven hexes. The Erudite original keeps them.
 *
 * TWO THINGS THAT LOOK LIKE PORT DAMAGE AND ARE NOT:
 *  - `router.push('/paywall')` stays ABSOLUTE. The paywall is not ported yet;
 *    __tests__/app/t-routes.test.ts tolerates it via NOT_YET_PORTED and asserts
 *    it is STILL reached, so the entry demands its own deletion the day the
 *    paywall lands.
 *  - `phase === 'error'` renders nothing — no spinner, no message, the screen
 *    just goes blank below the header. That is inherited from the original, not
 *    introduced here; the category screen's 😕 branch has no counterpart.
 *
 * makeStyles keeps its EruditePalette signature: `gold` is an ordinary palette
 * token applied inline in JSX rather than in the stylesheet, and
 * TILE_BADGE_SCRIM is a module constant, so no style needs the wider type.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ScreenBackground } from '@/components/screen-background';
import { TimedCountModal } from '@/components/quiz-mode/timed-count-modal';
import { fetchCategories, type Category } from '@/api/categories';
import { APP_SLUG } from '@/api/client';
import { CATEGORY_VISUALS, FALLBACK_VISUAL, SUBCATEGORY_EMOJI } from '@/constants/category-visuals';
import { TILE_BADGE_SCRIM } from '@/constants/t/tile-palette';
import { useCategoryTileGradient } from '@/hooks/t/use-tile-gradients';
import { useLocale } from '@/hooks/use-locale';
import { usePremium } from '@/hooks/use-premium';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';
import { localizeCategoryName } from '@/i18n/categories';

const TIMED_COUNT_OPTIONS = [10, 20, 30] as const;

export default function QuizModeScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const lockedByPremium = !isPremium;
  const [sub, setSub] = useState<Category | null>(null);
  const [parentSlug, setParentSlug] = useState<string | null>(null);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [timedModalOpen, setTimedModalOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setPhase('loading');

    // Find this subcategory's record + its parent slug. We hit the
    // top-level list to get the latter (slug pattern is "{parent}-...",
    // but parent slugs can themselves contain hyphens, so resolve by id).
    fetchCategories(APP_SLUG)
      .then(async (parents) => {
        const matchedParent = parents.find((p) =>
          // Subcategories are always slug-prefixed by parent slug.
          slug.startsWith(p.slug + '-'),
        );
        if (!matchedParent) {
          throw new Error('Parent not found');
        }
        const subs = await fetchCategories(APP_SLUG, { parent: matchedParent.slug });
        if (cancelled) return;
        const found = subs.find((s) => s.slug === slug) ?? null;
        setSub(found);
        setParentSlug(matchedParent.slug);
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Only the GRADIENT is bypassed — the emoji is not a colour, and keeping one
  // source for it means /t and the Erudite mode picker still agree.
  const visual = useMemo(() => {
    if (!parentSlug) return FALLBACK_VISUAL;
    return CATEGORY_VISUALS[parentSlug] ?? FALLBACK_VISUAL;
  }, [parentSlug]);
  // `?? ''` misses CATEGORY_RAMPS cleanly (it has a null prototype), so the
  // window before the parent resolves gets the same neutral dusk ramp
  // FALLBACK_VISUAL carries. TILE_GRADIENTS.dusk === FALLBACK_VISUAL.gradient,
  // pinned by __tests__/constants/t-tile-palette.test.ts, so this port is
  // zero-pixel. (No card is painted in that window anyway — they render only
  // under phase 'ready', and setParentSlug/setPhase batch in one tick.)
  //
  // The hook sits HERE rather than in ModeCard because the ramp is a
  // screen-level fact: all five cards draw the PARENT category's ramp.
  const gradient = useCategoryTileGradient(parentSlug ?? '');

  const subEmoji = (slug && SUBCATEGORY_EMOJI[slug]) || visual.emoji;
  const subName = sub ? localizeCategoryName(sub.slug, locale, sub.name) : '';

  const questionsCount = sub?.total_questions_count ?? 0;
  const flashcardsCount = sub?.total_flashcards_count ?? 0;
  const hasQuestions = questionsCount > 0;
  const hasFlashcards = flashcardsCount > 0;
  // Timed-quiz question-count options, capped by how many questions exist
  // (but always offer at least the smallest option).
  const timedOptions = TIMED_COUNT_OPTIONS.filter((n) => n <= Math.max(questionsCount, 10));

  function startQuiz(mode: 'daily' | 'quick' | 'timed' | 'survival', count: number, timer = 0) {
    if (!slug) return;
    router.push({
      pathname: '/t/quiz',
      params: {
        count: String(count),
        locale,
        category: slug,
        mode,
        timer: String(timer),
      },
    });
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
            accessibilityLabel="Back"
          >
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{subEmoji}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {subName}
            </Text>
          </View>
          <View style={styles.iconButton} />
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text} size="large" />
          </View>
        )}

        {phase === 'ready' && (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionLabel}>{t('mode.title')}</Text>

            <ModeCard
              testID="mode-random"
              icon="🎲"
              title={t('mode.random.title')}
              subtitle={t('mode.random.subtitle')}
              gradient={gradient}
              disabled={!hasQuestions}
              onPress={() => startQuiz('quick', 1)}
            />

            <ModeCard
              testID="mode-quick"
              icon="⚡"
              title={t('mode.quick.title')}
              subtitle={t('mode.quick.subtitle')}
              gradient={gradient}
              disabled={!hasQuestions}
              onPress={() => startQuiz('quick', 10)}
            />

            <ModeCard
              testID="mode-timed"
              icon="⏱️"
              title={t('mode.timed.title')}
              subtitle={t('mode.timed.subtitle')}
              gradient={gradient}
              disabled={!hasQuestions}
              premiumLocked={lockedByPremium}
              onPress={() => setTimedModalOpen(true)}
            />

            <ModeCard
              testID="mode-survival"
              icon="💀"
              title={t('mode.survival.title')}
              subtitle={t('mode.survival.subtitle')}
              gradient={gradient}
              disabled={!hasQuestions}
              premiumLocked={lockedByPremium}
              // Pull a healthy buffer; quiz ends on first wrong anyway.
              onPress={() => startQuiz('survival', Math.min(50, Math.max(20, questionsCount)))}
            />

            {hasFlashcards && (
              <ModeCard
                testID="mode-flashcards"
                icon="🃏"
                title={t('mode.flashcards.title')}
                subtitle={t('mode.flashcards.subtitle')}
                gradient={gradient}
                disabled
                onPress={() => {}}
                lockLabel={t('mode.lockedSoon')}
              />
            )}
          </ScrollView>
        )}

        <TimedCountModal
          visible={timedModalOpen}
          options={timedOptions}
          onClose={() => setTimedModalOpen(false)}
          onPick={(n) => startQuiz('timed', n, 30)}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

interface ModeCardProps {
  /** Required, not optional: a card the suite cannot address is a card nothing
   *  pins the gradient, crown or route of. */
  testID: string;
  icon: string;
  title: string;
  subtitle: string;
  gradient: readonly [string, string];
  disabled?: boolean;
  premiumLocked?: boolean;
  onPress: () => void;
  lockLabel?: string;
}

function ModeCard({
  testID,
  icon,
  title,
  subtitle,
  gradient,
  disabled,
  premiumLocked,
  onPress,
  lockLabel,
}: ModeCardProps) {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  function handlePress() {
    if (premiumLocked) {
      // Absolute on purpose — the paywall is not ported yet. NOT_YET_PORTED in
      // __tests__/app/t-routes.test.ts tolerates this route AND asserts it is
      // still reached, so re-point it in the commit that ports the paywall.
      router.push('/paywall');
      return;
    }
    onPress();
  }
  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={({ pressed }) => [styles.cardWrap, pressed && !disabled && styles.cardPressed]}
      testID={testID}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, disabled && styles.cardDisabled]}
      >
        {premiumLocked && (
          <View style={styles.crownBadge}>
            <IconSymbol name="crown.fill" size={16} color={colors.gold} />
          </View>
        )}
        <Text style={styles.cardIcon}>{icon}</Text>
        <View style={styles.cardCopy}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{lockLabel ?? subtitle}</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerEmoji: { fontSize: 22 },
  headerTitle: {
    color: c.text,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPressed: { opacity: 0.5 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 14,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
    marginLeft: 4,
  },
  cardWrap: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  cardDisabled: {
    opacity: 0.45,
  },
  crownBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    // Tile artwork, not a palette token: appearance-independent so the gold
    // crown reads on any ramp. See TILE_BADGE_SCRIM for why `scrim` is wrong.
    backgroundColor: TILE_BADGE_SCRIM,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cardIcon: {
    fontSize: 36,
  },
  cardCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    color: c.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cardSubtitle: {
    color: c.onAccent,
    fontSize: 13,
    fontWeight: '500',
  },
});
