import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchCategories, type Category } from '@/api/categories';
import { APP_SLUG } from '@/api/client';
import { CATEGORY_VISUALS, FALLBACK_VISUAL } from '@/constants/category-visuals';
import { useContentCache } from '@/hooks/use-content-cache';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import { localizeCategoryName } from '@/i18n/categories';

export default function HomeScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { snapshot } = useContentCache();
  const [categories, setCategories] = useState<Category[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    // Prefer the cached snapshot — it ships with totals, so we can
    // render instantly without a network round-trip on every cold
    // start. Fall back to the live API only when the cache hasn't
    // arrived yet.
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
      // Empty category — no destination yet; tile is rendered as
      // disabled, but guard here too.
      return;
    }
    router.push(`/category/${category.slug}` as const);
  }

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            {isPremium === false && (
              <Pressable
                onPress={() => router.push('/paywall')}
                hitSlop={12}
                style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
                testID="crown-button"
                accessibilityLabel="Get Premium"
              >
                <IconSymbol name="crown.fill" size={24} color="#ffd23a" />
              </Pressable>
            )}
          </View>
          <Wordmark />
          <View style={styles.topRight}>
            <Pressable
              onPress={() => router.push('/settings')}
              hitSlop={12}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}
              testID="settings-button"
              accessibilityLabel="Open settings"
            >
              <IconSymbol name="gearshape.fill" size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        {phase === 'loading' && (
          <View style={styles.center}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )}

        {phase === 'error' && (
          <View style={styles.center}>
            <Text style={styles.errorEmoji}>😕</Text>
            <Text style={styles.errorText}>{errorText}</Text>
          </View>
        )}

        {phase === 'ready' && (
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
      </SafeAreaView>
    </LinearGradient>
  );
}

function Wordmark() {
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
  const { t, locale } = useTranslation();
  const visual = CATEGORY_VISUALS[category.slug] ?? FALLBACK_VISUAL;
  const displayName = localizeCategoryName(category.slug, locale, category.name);
  const total = category.total_questions_count ?? 0;
  const subs = category.subcategories_count ?? 0;
  const isEmpty = total === 0;

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
        <Text style={styles.tileEmoji}>{visual.emoji}</Text>
        <Text style={styles.tileName} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.tileMeta}>
          {isEmpty
            ? t('home.tile.soon')
            : t('home.tile.meta', { questions: total, topics: subs })}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

function ComingSoonTile() {
  const { t } = useTranslation();
  return (
    <View style={[styles.tileWrap, styles.tileWrapComing]} testID="category-coming-soon">
      <View style={styles.tileComing}>
        <Text style={styles.tileEmoji}>✨</Text>
        <Text style={styles.tileName} numberOfLines={2}>
          {t('home.tile.coming.title')}
        </Text>
        <Text style={styles.tileMeta}>{t('home.tile.coming.meta')}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  topRight: {
    flex: 1,
    alignItems: 'flex-end',
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
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(124, 92, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  wordmarkAccent: {
    color: '#a78bff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.5,
    textShadowColor: 'rgba(167, 139, 255, 0.85)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
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
    color: '#ffffffcc',
    textAlign: 'center',
    fontSize: 14,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
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
    justifyContent: 'space-between',
  },
  tileEmpty: {
    opacity: 0.45,
  },
  tileWrapComing: {
    borderWidth: 1,
    borderColor: '#ffffff22',
    borderStyle: 'dashed',
    backgroundColor: '#ffffff08',
  },
  tileComing: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    opacity: 0.7,
  },
  tileEmoji: {
    fontSize: 44,
  },
  tileName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  tileMeta: {
    color: '#ffffffcc',
    fontSize: 12,
    fontWeight: '500',
  },
});
