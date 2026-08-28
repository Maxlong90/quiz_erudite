import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { ScreenBackground } from '@/components/screen-background';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';
import { ClaimLivesModal } from '@/components/lives/claim-lives-modal';
import { HardModeModal } from '@/components/home/hard-mode-modal';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchCategories, type Category } from '@/api/categories';
import { useLives } from '@/hooks/use-lives';
import { claimDaily } from '@/lib/lives';
import { APP_SLUG } from '@/api/client';
import { CATEGORY_VISUALS, FALLBACK_VISUAL } from '@/constants/category-visuals';
import { QuizConfigModal } from '@/components/home/quiz-config-modal';
import { TimeLimitModal } from '@/components/home/time-limit-modal';
import { consumeColdStart } from '@/lib/intro-gate';
import { useContentCache } from '@/hooks/use-content-cache';
import { useLocale } from '@/hooks/use-locale';
import { useMistakes } from '@/hooks/use-mistakes';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import { localizeCategoryName } from '@/i18n/categories';
import type { StringKey } from '@/i18n/strings';

type Tab = 'categories' | 'modes';
type ConfigKind = 'byTopic' | 'timed' | 'flashcards' | null;

// Module-scoped so the tab choice survives a round-trip through the
// quiz screen — the spec is that returning from a Modes-launched quiz
// lands you back on Modes, not Categories. We deliberately don't
// persist this across full app restarts: a fresh launch should open on
// the default Categories view.
let rememberedTab: Tab = 'categories';

interface ModeDef {
  id: string;
  titleKey: StringKey;
  subtitleKey: StringKey;
  emoji: string;
  gradient: readonly [string, string];
  available: boolean;
  disabledLabelKey?: StringKey;
  /** Behind the premium paywall — tile shows a crown badge. */
  premium?: boolean;
  onPress?: () => void;
}

// Home is the route expo-router opens on a cold launch (`/`), so it doubles as
// the entry gate: the first mount of a cold start bounces into the intro flow
// (splash -> language -> onboarding -> paywall -> home) instead of rendering
// Home. Every later return to Home renders it normally. See lib/intro-gate.ts.
export default function HomeRoute() {
  // The Logo Quiz app template is a self-contained experience with its own
  // flow (Welcome → Shop → Quiz → Result) and economy — it skips the erudite
  // intro/hub entirely. APP_SLUG is a build-time constant, so this branch is
  // stable across renders and never changes the hook order below.
  if (APP_SLUG === 'logo-quiz') {
    return <Redirect href="/logo-quiz" />;
  }
  // Flags Quiz (App Template: Geography) is likewise a self-contained
  // experience with its own blue home; APP_SLUG is a build-time constant, so
  // this branch is stable across renders and never changes the hook order.
  if (APP_SLUG === 'flags-quiz') {
    return <Redirect href="/flags-quiz/splash" />;
  }
  // Coat of Arms (App Template) is likewise a self-contained experience with its
  // own blue home; APP_SLUG is a build-time constant, so this branch is stable
  // across renders and never changes the hook order.
  if (APP_SLUG === 'coat-of-arms') {
    return <Redirect href="/coat-of-arms/splash" />;
  }
  // On a cold start we go STRAIGHT to the first-run intro (language +
  // onboarding) or Home — no QUIZZES splash animation in between. The branch
  // is decided by the persisted onboarding.seen.v1 flag inside ColdStartGate.
  const [isColdStart] = useState(() => consumeColdStart());
  if (isColdStart) {
    return <ColdStartGate />;
  }
  return <HomeScreen />;
}

// Cold-start gate: reads the onboarding flag and immediately routes to the
// language/onboarding intro (first launch) or Home (every later launch).
// While the (instant) AsyncStorage read resolves it paints only the plain
// backdrop — no wordmark/tagline — so no splash flashes before onboarding.
function ColdStartGate() {
  const [target, setTarget] = useState<'intro' | 'home' | null>(null);
  useEffect(() => {
    AsyncStorage.getItem('onboarding.seen.v1')
      .then((v) => setTarget(v === '1' ? 'home' : 'intro'))
      .catch(() => setTarget('intro'));
  }, []);
  if (target === 'intro') return <Redirect href="/language" />;
  if (target === 'home') return <HomeScreen />;
  return <ScreenBackground />;
}

function HomeScreen() {
  const colors = useThemeColors();
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
      pathname: '/quiz',
      params: { count: '1', locale, mode: 'daily' },
    });
  }

  function startRandom10() {
    router.push({
      pathname: '/quiz',
      params: { count: '10', locale, mode: 'quick' },
    });
  }

  function startSurvival() {
    router.push({
      pathname: '/quiz',
      params: { count: '10', locale, mode: 'survival' },
    });
  }

  function startMistakes() {
    router.push({
      pathname: '/quiz',
      params: { count: '10', locale, mode: 'quick', source: 'mistakes' },
    });
  }

  function startHard(variant: 'typing' | 'letters') {
    setHardOpen(false);
    router.push({
      pathname: '/quiz',
      params: { count: '10', locale, mode: 'hard', hardVariant: variant },
    });
  }

  function startTimeLimit(totalSeconds: number) {
    setTimeLimitOpen(false);
    router.push({
      pathname: '/quiz',
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
    router.push({ pathname: '/quiz', params });
  }

  // Modes definitions. "Today's Question" and "Time Limit" come first
  // per spec; Mistakes is data-gated (disabled with "no mistakes yet"
  // when the player hasn't failed anything yet).
  const modes: ModeDef[] = useMemo(
    () => [
      {
        id: 'today',
        titleKey: 'home.mode.today.title',
        subtitleKey: 'home.mode.today.subtitle',
        emoji: '🌅',
        gradient: ['#ffd23a', '#f59f3a'],
        available: true,
        onPress: startTodayQuestion,
      },
      {
        id: 'timeLimit',
        titleKey: 'home.mode.timeLimit.title',
        subtitleKey: 'home.mode.timeLimit.subtitle',
        emoji: '⏳',
        gradient: ['#3aa6ff', '#4f6df5'],
        available: true,
        onPress: () => setTimeLimitOpen(true),
      },
      {
        id: 'random10',
        titleKey: 'home.mode.random10.title',
        subtitleKey: 'home.mode.random10.subtitle',
        emoji: '🎲',
        gradient: ['#7c5cff', '#3aa6ff'],
        available: true,
        onPress: startRandom10,
      },
      {
        id: 'byTopic',
        titleKey: 'home.mode.byTopic.title',
        subtitleKey: 'home.mode.byTopic.subtitle',
        emoji: '📚',
        gradient: ['#3aa37a', '#1f6f55'],
        available: true,
        premium: true,
        onPress: () => setConfigKind('byTopic'),
      },
      {
        id: 'timed',
        titleKey: 'home.mode.timed.title',
        subtitleKey: 'home.mode.timed.subtitle',
        emoji: '⏱️',
        gradient: ['#f59f3a', '#d6533a'],
        available: true,
        premium: true,
        onPress: () => setConfigKind('timed'),
      },
      {
        id: 'challenge',
        titleKey: 'home.mode.challenge.title',
        subtitleKey: 'home.mode.challenge.subtitle',
        emoji: '🏆',
        gradient: ['#ffd23a', '#f59f3a'],
        available: false,
        premium: true,
      },
      {
        id: 'survival',
        titleKey: 'home.mode.survival.title',
        subtitleKey: 'home.mode.survival.subtitle',
        emoji: '💀',
        gradient: ['#c97a3f', '#8a4a2a'],
        available: true,
        premium: true,
        onPress: startSurvival,
      },
      {
        id: 'mistakes',
        titleKey: 'home.mode.mistakes.title',
        subtitleKey: 'home.mode.mistakes.subtitle',
        emoji: '🔁',
        gradient: ['#e0529c', '#a23ad6'],
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
        gradient: ['#d6533a', '#7a1f1f'],
        available: true,
        premium: true,
        onPress: () => setHardOpen(true),
      },
      {
        id: 'flashcards',
        titleKey: 'home.mode.flashcards.title',
        subtitleKey: 'home.mode.flashcards.subtitle',
        emoji: '🃏',
        gradient: ['#3aa6ff', '#4f6df5'],
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
  const colors = useThemeColors();
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
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.wordmark}>
      <Text style={styles.wordmarkLight}>QUI</Text>
      <Text style={styles.wordmarkAccent}>ZZZ</Text>
      <Text style={styles.wordmarkLight}>ES</Text>
    </View>
  );
}

interface TileProps {
  category: Category;
  onPress: () => void;
}

function CategoryTile({ category, onPress }: TileProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t, locale } = useTranslation();
  const visual = CATEGORY_VISUALS[category.slug] ?? FALLBACK_VISUAL;
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
        colors={visual.gradient}
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
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
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
        colors={mode.gradient}
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
  const colors = useThemeColors();
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
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  tabsRow: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPressed: {
    opacity: 0.5,
  },
  wordmark: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  wordmarkLight: {
    color: c.text,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.8,
    textShadowColor: 'rgba(124, 92, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  wordmarkAccent: {
    color: c.accentSoft,
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: 1.8,
    textShadowColor: 'rgba(167, 139, 255, 0.85)',
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
    // Theme-agnostic dark pill overlay so the gold crown reads on any tile.
    backgroundColor: '#00000066',
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
