import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { ScreenBackground } from '@/components/screen-background';
import { useTemplateTheme } from '@/hooks/t/use-template-theme';
import type { EruditePalette } from '@/constants/theme';
import { ClaimLivesModal } from '@/components/lives/claim-lives-modal';
import { HardModeModal } from '@/components/home/hard-mode-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchCategories, type Category } from '@/api/categories';
import { useLives } from '@/hooks/use-lives';
import { claimDaily } from '@/lib/lives';
import { APP_SLUG } from '@/api/client';
import { CATEGORY_VISUALS, FALLBACK_VISUAL } from '@/constants/category-visuals';
import { TILE_BADGE_SCRIM, type TModeId } from '@/constants/t/tile-palette';
import { useCategoryTileGradient, useModeTileGradient } from '@/hooks/t/use-tile-gradients';
import { withAlpha } from '@/lib/theme/color';
import { QuizConfigModal } from '@/components/home/quiz-config-modal';
import { TimeLimitModal } from '@/components/home/time-limit-modal';
import { useContentCache } from '@/hooks/use-content-cache';
import { useLocale } from '@/hooks/use-locale';
import { useMistakes } from '@/hooks/use-mistakes';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import { localizeCategoryName } from '@/i18n/categories';
import type { StringKey } from '@/i18n/strings';

/**
 * The configurable template's home screen — the Erudite home (app/index.tsx)
 * ported so that NOT ONE COLOUR LITERAL remains. Every colour here is either an
 * EruditePalette token via useTemplateTheme() (and therefore operator-settable for
 * the ten keys in REMOTE_TOKEN_KEYS) or a named ramp from
 * constants/t/tile-palette.ts. __tests__/app/t-no-color-literals.test.ts holds
 * that line for the whole app/t/ surface.
 *
 * WHY THIS IS A COPY RATHER THAN A SHARED COMPONENT
 * ------------------------------------------------
 * app/index.tsx is a live store build's home screen with ZERO test coverage.
 * Extracting the tiles and stylesheet into components/home/ would be a ~700-line
 * untested refactor of shipped code, bought to de-duplicate a screen that is
 * *supposed* to diverge: this template's mode list, ramps and category set all
 * become operator data in later stages, and a shared tile would already need a
 * `gradient | gradientKey` union — strictly more complex than either copy. The
 * blast radius of the copy on the Erudite build is zero files.
 *
 * WHAT DELIBERATELY DIFFERS FROM app/index.tsx
 * --------------------------------------------
 *  - This is a PLAIN SCREEN, not the entry gate. It must NOT reproduce
 *    HomeRoute: `consumeColdStart()` burns a single process-lifetime flag and
 *    would bounce the player into the *Erudite* splash, language picker and
 *    onboarding — the exact leak constants/app-templates.ts exists to prevent —
 *    and re-checking currentTemplate() here would loop /t -> /t/splash -> /t
 *    forever. Hence no Redirect, no intro-gate and no app-templates import.
 *  - ModeDef has no `gradient` field at all. The screen no longer has a concept
 *    of a tile colour; it has a mode id, and MODE_RAMPS turns a missing
 *    assignment into a compile error.
 *  - The wordmark glow is derived (withAlpha of accent/accentSoft) rather than
 *    frozen, so an operator setting a red accent gets a red halo. Two intended
 *    pixel differences follow: the alpha byte rounds to 0.502 rather than 0.5,
 *    and in LIGHT appearance the halo now follows the light `accentSoft` instead
 *    of inheriting a dark-mode value — a fix, and one only possible because it
 *    is derived.
 *  - The wordmark is pressable: a long-press opens the token gallery
 *    (app/t/tokens.tsx), which used to own this route.
 */

type Tab = 'categories' | 'modes';
type ConfigKind = 'byTopic' | 'timed' | 'flashcards' | null;

// Module-scoped so the tab choice survives a round-trip through the
// quiz screen — the spec is that returning from a Modes-launched quiz
// lands you back on Modes, not Categories. We deliberately don't
// persist this across full app restarts: a fresh launch should open on
// the default Categories view.
let rememberedTab: Tab = 'categories';

interface ModeDef {
  /** Also the artwork key — MODE_RAMPS[id] picks the tile gradient. */
  id: TModeId;
  titleKey: StringKey;
  subtitleKey: StringKey;
  emoji: string;
  available: boolean;
  disabledLabelKey?: StringKey;
  /** Behind the premium paywall — tile shows a crown badge. */
  premium?: boolean;
  onPress?: () => void;
}

export default function THomeScreen() {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const { locale } = useLocale();
  const { snapshot } = useContentCache();
  const { count: mistakeCount } = useMistakes();
  const { isPremium } = usePremium();
  const [categories, setCategories] = useState<Category[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [tab, setTabState] = useState<Tab>(() => rememberedTab);
  const setTab = (next: Tab) => {
    rememberedTab = next;
    setTabState(next);
  };
  const [configKind, setConfigKind] = useState<ConfigKind>(null);
  const [timeLimitOpen, setTimeLimitOpen] = useState(false);
  const [hardOpen, setHardOpen] = useState(false);
  const { canClaim, reload: reloadLives } = useLives();
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimDismissed, setClaimDismissed] = useState(false);

  // Surface the daily-claim modal the first time Home is reached after
  // the per-day flag flips. The user can dismiss it (Skip for now);
  // we don't re-trigger again in the same session if they did.
  useEffect(() => {
    if (canClaim && !claimDismissed) {
      setClaimOpen(true);
    }
  }, [canClaim, claimDismissed]);

  useEffect(() => {
    if (snapshot) {
      const fromCache: Category[] = snapshot.categories.map((c) => {
        const totalQ = snapshot.questions.filter((q) => {
          if (q.category_slug === c.slug) return true;
          return c.subcategories.some((s) => s.slug === q.category_slug);
        }).length;
        return {
          slug: c.slug,
          name: c.name,
          sort_order: c.sort_order,
          should_have_images: false,
          should_have_audio: false,
          subcategories_count: c.subcategories.length,
          total_questions_count: totalQ,
          total_flashcards_count: 0,
        };
      });
      setCategories(fromCache);
      setPhase('ready');
      return;
    }

    let cancelled = false;
    setPhase('loading');
    fetchCategories(APP_SLUG)
      .then((cats) => {
        if (cancelled) return;
        setCategories(cats);
        setPhase('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setPhase('error');
        setErrorText(t('home.error.load'));
      });
    return () => {
      cancelled = true;
    };
  }, [snapshot, t]);

  function openCategory(category: Category) {
    if ((category.total_questions_count ?? 0) === 0) {
      return;
    }
    router.push(`/category/${category.slug}` as const);
  }

  // Quick router helpers — kept inline so each mode tile reads as a
  // one-liner intent ("today's question goes here").
  function startTodayQuestion() {
    router.push({
      pathname: '/t/quiz',
      params: { count: '1', locale, mode: 'daily' },
    });
  }

  function startRandom10() {
    router.push({
      pathname: '/t/quiz',
      params: { count: '10', locale, mode: 'quick' },
    });
  }

  function startSurvival() {
    router.push({
      pathname: '/t/quiz',
      params: { count: '10', locale, mode: 'survival' },
    });
  }

  function startMistakes() {
    router.push({
      pathname: '/t/quiz',
      params: { count: '10', locale, mode: 'quick', source: 'mistakes' },
    });
  }

  function startHard(variant: 'typing' | 'letters') {
    setHardOpen(false);
    router.push({
      pathname: '/t/quiz',
      params: { count: '10', locale, mode: 'hard', hardVariant: variant },
    });
  }

  function startTimeLimit(totalSeconds: number) {
    setTimeLimitOpen(false);
    router.push({
      pathname: '/t/quiz',
      params: {
        count: '50',
        locale,
        mode: 'quick',
        totalSeconds: String(totalSeconds),
      },
    });
  }

  function startConfigured(config: {
    categorySlugs: string[];
    count: number;
    perQuestionSeconds?: number;
  }) {
    const kind = configKind;
    setConfigKind(null);
    const params: Record<string, string> = {
      count: String(config.count),
      locale,
      mode: config.perQuestionSeconds && config.perQuestionSeconds > 0 ? 'timed' : 'quick',
    };
    if (config.categorySlugs.length > 0) {
      params.categorySlugs = config.categorySlugs.join(',');
    }
    if (config.perQuestionSeconds && config.perQuestionSeconds > 0) {
      params.timer = String(config.perQuestionSeconds);
    }
    if (kind === 'flashcards') {
      // Flashcards screen lands here when the dedicated route exists;
      // for now route to the regular quiz so Start always does
      // *something* visible to the player.
      params.mode = 'quick';
    }
    router.push({ pathname: '/t/quiz', params });
  }

  // Modes definitions. "Today's Question" and "Time Limit" come first
  // per spec; Mistakes is data-gated (disabled with "no mistakes yet"
  // when the player hasn't failed anything yet). Tile artwork is not
  // declared here at all — `id` is the ramp key.
  const modes: ModeDef[] = useMemo(
    () => [
      {
        id: 'today',
        titleKey: 'home.mode.today.title',
        subtitleKey: 'home.mode.today.subtitle',
        emoji: '🌅',
        available: true,
        onPress: startTodayQuestion,
      },
      {
        id: 'timeLimit',
        titleKey: 'home.mode.timeLimit.title',
        subtitleKey: 'home.mode.timeLimit.subtitle',
        emoji: '⏳',
        available: true,
        onPress: () => setTimeLimitOpen(true),
      },
      {
        id: 'random10',
        titleKey: 'home.mode.random10.title',
        subtitleKey: 'home.mode.random10.subtitle',
        emoji: '🎲',
        available: true,
        onPress: startRandom10,
      },
      {
        id: 'byTopic',
        titleKey: 'home.mode.byTopic.title',
        subtitleKey: 'home.mode.byTopic.subtitle',
        emoji: '📚',
        available: true,
        premium: true,
        onPress: () => setConfigKind('byTopic'),
      },
      {
        id: 'timed',
        titleKey: 'home.mode.timed.title',
        subtitleKey: 'home.mode.timed.subtitle',
        emoji: '⏱️',
        available: true,
        premium: true,
        onPress: () => setConfigKind('timed'),
      },
      {
        id: 'challenge',
        titleKey: 'home.mode.challenge.title',
        subtitleKey: 'home.mode.challenge.subtitle',
        emoji: '🏆',
        available: false,
        premium: true,
      },
      {
        id: 'survival',
        titleKey: 'home.mode.survival.title',
        subtitleKey: 'home.mode.survival.subtitle',
        emoji: '💀',
        available: true,
        premium: true,
        onPress: startSurvival,
      },
      {
        id: 'mistakes',
        titleKey: 'home.mode.mistakes.title',
        subtitleKey: 'home.mode.mistakes.subtitle',
        emoji: '🔁',
        available: mistakeCount > 0,
        premium: true,
        disabledLabelKey: 'home.mode.mistakes.empty',
        onPress: startMistakes,
      },
      {
        id: 'hard',
        titleKey: 'home.mode.hard.title',
        subtitleKey: 'home.mode.hard.subtitle',
        emoji: '🔥',
        available: true,
        premium: true,
        onPress: () => setHardOpen(true),
      },
      {
        id: 'flashcards',
        titleKey: 'home.mode.flashcards.title',
        subtitleKey: 'home.mode.flashcards.subtitle',
        emoji: '🃏',
        available: false,
        premium: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mistakeCount, locale],
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.wordmarkRow}>
          <Wordmark />
        </View>

        <View style={styles.tabsRow}>
          <SegmentedTabs
            tab={tab}
            onChange={setTab}
            leftLabel={t('home.tabs.categories')}
            rightLabel={t('home.tabs.modes')}
          />
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color={colors.text} size="large" />
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>😕</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        {phase === 'ready' && tab === 'categories' && (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {categories.map((cat) => (
                <CategoryTile
                  key={cat.slug}
                  category={cat}
                  onPress={() => openCategory(cat)}
                />
              ))}
              <ComingSoonTile />
            </View>
          </ScrollView>
        )}

        {phase === 'ready' && tab === 'modes' && (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {modes.map((m) => (
                <ModeTile
                  key={m.id}
                  mode={m}
                  premiumLocked={!!m.premium && !isPremium}
                />
              ))}
            </View>
          </ScrollView>
        )}

        <BottomBar current="home" />
      </SafeAreaView>

      <QuizConfigModal
        visible={configKind === 'byTopic'}
        title={t('home.config.byTopic.title')}
        onClose={() => setConfigKind(null)}
        onStart={startConfigured}
      />
      <QuizConfigModal
        visible={configKind === 'timed'}
        title={t('home.config.timed.title')}
        withTimer
        onClose={() => setConfigKind(null)}
        onStart={startConfigured}
      />
      <TimeLimitModal
        visible={timeLimitOpen}
        onClose={() => setTimeLimitOpen(false)}
        onStart={startTimeLimit}
      />
      <HardModeModal
        visible={hardOpen}
        onClose={() => setHardOpen(false)}
        onPick={startHard}
      />
      <ClaimLivesModal
        visible={claimOpen}
        onClaim={async () => {
          await claimDaily();
          await reloadLives();
          setClaimOpen(false);
          setClaimDismissed(true);
        }}
        onClose={() => {
          setClaimOpen(false);
          setClaimDismissed(true);
        }}
      />
    </ScreenBackground>
  );
}

interface SegmentedTabsProps {
  tab: Tab;
  onChange: (next: Tab) => void;
  leftLabel: string;
  rightLabel: string;
}

function SegmentedTabs({ tab, onChange, leftLabel, rightLabel }: SegmentedTabsProps) {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const isLeft = tab === 'categories';
  return (
    <View style={styles.segmented}>
      <Pressable
        onPress={() => onChange('categories')}
        style={[styles.segment, isLeft && styles.segmentActive]}
        testID="tab-categories"
      >
        <Text style={[styles.segmentLabel, isLeft && styles.segmentLabelActive]}>
          {leftLabel}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('modes')}
        style={[styles.segment, !isLeft && styles.segmentActive]}
        testID="tab-modes"
      >
        <Text style={[styles.segmentLabel, !isLeft && styles.segmentLabelActive]}>
          {rightLabel}
        </Text>
      </Pressable>
    </View>
  );
}

function Wordmark() {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    // Long-press opens the token gallery this route used to hold — the only way
    // to read the live theme tier, ETag and overrides on a device. No onPress,
    // so a stray tap on the logo stays inert.
    <Pressable
      onLongPress={() => router.push('/t/tokens')}
      style={styles.wordmark}
      testID="t-wordmark"
    >
      <Text style={styles.wordmarkLight}>QUI</Text>
      <Text style={styles.wordmarkAccent}>ZZZ</Text>
      <Text style={styles.wordmarkLight}>ES</Text>
    </Pressable>
  );
}

interface TileProps {
  category: Category;
  onPress: () => void;
}

function CategoryTile({ category, onPress }: TileProps) {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, locale } = useTranslation();
  // Only the GRADIENT is bypassed — the emoji is not a colour, and keeping one
  // source for it means /t and the Erudite category screen still agree.
  const visual = CATEGORY_VISUALS[category.slug] ?? FALLBACK_VISUAL;
  const gradient = useCategoryTileGradient(category.slug);
  const displayName = localizeCategoryName(category.slug, locale, category.name);
  const total = category.total_questions_count ?? 0;
  const subs = category.subcategories_count ?? 0;
  const isEmpty = total === 0;
  const iconUrl = category.icon_url ?? null;
  const emoji = category.icon_emoji || visual.emoji;

  return (
    <Pressable
      onPress={onPress}
      disabled={isEmpty}
      style={({ pressed }) => [styles.tileWrap, pressed && !isEmpty && styles.tilePressed]}
      testID={`category-${category.slug}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, isEmpty && styles.tileEmpty]}
      >
        {iconUrl ? (
          <Image source={{ uri: iconUrl }} style={styles.tileIcon} resizeMode="contain" />
        ) : (
          <Text style={styles.tileEmoji}>{emoji}</Text>
        )}
        <View style={styles.tileFooter}>
          <Text style={styles.tileName} numberOfLines={2}>
            {displayName}
          </Text>
          <Text style={styles.tileMeta} numberOfLines={2}>
            {isEmpty
              ? t('home.tile.soon')
              : t('home.tile.meta', { questions: total, topics: subs })}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function ModeTile({ mode, premiumLocked }: { mode: ModeDef; premiumLocked: boolean }) {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const gradient = useModeTileGradient(mode.id);
  const isLocked = !mode.available;
  const lockedLabel = mode.disabledLabelKey ? t(mode.disabledLabelKey) : t('home.tile.soon');

  function handlePress() {
    // Tap on a premium-locked tile sends the player to the paywall
    // instead of opening the (still inaccessible) mode.
    if (premiumLocked) {
      router.push('/paywall');
      return;
    }
    mode.onPress?.();
  }

  return (
    <Pressable
      onPress={handlePress}
      disabled={isLocked}
      style={({ pressed }) => [styles.tileWrap, pressed && !isLocked && styles.tilePressed]}
      testID={`mode-${mode.id}`}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, isLocked && styles.tileEmpty]}
      >
        {premiumLocked && (
          <View style={styles.crownBadge}>
            <IconSymbol name="crown.fill" size={16} color={colors.gold} />
          </View>
        )}
        <Text style={styles.tileEmoji}>{mode.emoji}</Text>
        <View style={styles.tileFooter}>
          <Text style={styles.tileName} numberOfLines={2}>
            {t(mode.titleKey)}
          </Text>
          <Text style={styles.tileMeta} numberOfLines={2}>
            {isLocked ? lockedLabel : t(mode.subtitleKey)}
          </Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function ComingSoonTile() {
  const colors = useTemplateTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  return (
    <View style={[styles.tileWrap, styles.tileWrapComing]} testID="category-coming-soon">
      <View style={styles.tileComing}>
        <Text style={styles.tileEmoji}>✨</Text>
        <View style={styles.tileFooter}>
          {/* This is the one tile that sits on the screen backdrop (a dashed
              card) rather than a colored brand gradient, so its text uses the
              on-background tokens instead of the white on-accent tokens. */}
          <Text style={styles.tileNameOnBg} numberOfLines={2}>
            {t('home.tile.coming.title')}
          </Text>
          <Text style={styles.tileMetaOnBg} numberOfLines={2}>
            {t('home.tile.coming.meta')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  wordmarkRow: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 4,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'center',
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Both halos are DERIVED from the live accent rather than frozen, which is
  // what makes this screen themed rather than merely literal-free: an operator
  // setting a red accent gets a red glow, not a purple one.
  wordmarkLight: {
    color: c.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.8,
    textShadowColor: withAlpha(c.accent, 0.5),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  wordmarkAccent: {
    color: c.accentSoft,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.8,
    textShadowColor: withAlpha(c.accentSoft, 0.85),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: c.accent,
    borderRadius: 999,
    padding: 4,
    alignSelf: 'center',
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    minWidth: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: c.onAccent,
  },
  segmentLabel: {
    color: c.onAccent,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  segmentLabelActive: {
    color: c.accent,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
  },
  errorEmoji: {
    fontSize: 40,
  },
  errorText: {
    color: c.textMuted,
    textAlign: 'center',
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 32,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 16,
  },
  tileWrap: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
  },
  tilePressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.95,
  },
  tile: {
    flex: 1,
    padding: 16,
  },
  tileEmpty: {
    opacity: 0.45,
  },
  // Crown lock badge for premium-gated mode tiles: sits in the top-
  // right corner, dark pill, gold crown — small enough not to crowd
  // the tile artwork but readable at a glance.
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
  tileWrapComing: {
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderStyle: 'dashed',
    backgroundColor: c.surfaceSoft,
  },
  tileComing: {
    flex: 1,
    padding: 16,
    opacity: 0.7,
  },
  // marginTop: 'auto' pushes the title+meta block to the bottom of the
  // tile regardless of whatever the emoji glyph's intrinsic height is.
  // Title and meta both reserve enough vertical space for two lines so
  // 1-line and 2-line variants in adjacent tiles still bottom-align.
  tileFooter: {
    marginTop: 'auto',
    gap: 4,
  },
  tileEmoji: {
    fontSize: 44,
    lineHeight: 52,
  },
  tileIcon: {
    width: 52,
    height: 52,
  },
  // Tile labels sit on colored brand gradients (identical in both themes),
  // so they stay white via onAccent regardless of appearance.
  tileName: {
    color: c.onAccent,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 22,
    minHeight: 44,
  },
  tileMeta: {
    color: c.onAccent,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    minHeight: 32,
  },
  // On-background variants for the ComingSoon tile (dashed card on the screen
  // backdrop, not a gradient) — must follow the text color, not stay white.
  tileNameOnBg: {
    color: c.text,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
    lineHeight: 22,
    minHeight: 44,
  },
  tileMetaOnBg: {
    color: c.textMuted,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    minHeight: 32,
  },
});
