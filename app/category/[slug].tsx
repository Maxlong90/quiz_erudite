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
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { fetchCategories, type Category } from '@/api/categories';
import { APP_SLUG } from '@/api/client';
import { useLocale } from '@/hooks/use-locale';
import { useTranslation } from '@/hooks/use-translation';
import { CATEGORY_VISUALS, FALLBACK_VISUAL, SUBCATEGORY_EMOJI } from '@/constants/category-visuals';
import { localizeCategoryName } from '@/i18n/categories';

const DEFAULT_QUESTIONS = 10;
const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { locale } = useLocale();
  const { t } = useTranslation();
  const [parent, setParent] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Category[]>([]);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setPhase('loading');

    Promise.all([
      fetchCategories(APP_SLUG),
      fetchCategories(APP_SLUG, { parent: slug }),
    ])
      .then(([all, children]) => {
        if (cancelled) return;
        setParent(all.find((c) => c.slug === slug) ?? null);
        setSubs(children);
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
  }, [slug, t]);

  const visual = useMemo(
    () => (slug && CATEGORY_VISUALS[slug]) || FALLBACK_VISUAL,
    [slug],
  );

  function startQuiz(sub: Category) {
    if ((sub.total_questions_count ?? 0) === 0 && (sub.total_flashcards_count ?? 0) === 0) {
      return;
    }
    router.push(`/quiz-mode/${sub.slug}` as const);
  }

  return (
    <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            accessibilityLabel="Back"
          >
            <IconSymbol
              name="chevron.right"
              size={24}
              color="#fff"
              style={styles.backIcon}
            />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerEmoji}>{visual.emoji}</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {parent ? localizeCategoryName(parent.slug, locale, parent.name) : ''}
            </Text>
          </View>
          <View style={styles.iconButton} />
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
              {subs.map((sub) => (
                <SubcategoryTile
                  key={sub.slug}
                  parentGradient={visual.gradient}
                  parentEmoji={visual.emoji}
                  subcategory={sub}
                  displayName={localizeCategoryName(sub.slug, locale, sub.name)}
                  onPress={() => startQuiz(sub)}
                />
              ))}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

interface TileProps {
  parentGradient: readonly [string, string];
  parentEmoji: string;
  subcategory: Category;
  displayName: string;
  onPress: () => void;
}

function SubcategoryTile({
  parentGradient,
  parentEmoji,
  subcategory,
  displayName,
  onPress,
}: TileProps) {
  const { t } = useTranslation();
  const total = subcategory.total_questions_count ?? 0;
  const isEmpty = total === 0;
  const emoji = SUBCATEGORY_EMOJI[subcategory.slug] ?? parentEmoji;

  return (
    <Pressable
      onPress={onPress}
      disabled={isEmpty}
      style={({ pressed }) => [styles.tileWrap, pressed && !isEmpty && styles.tilePressed]}
      testID={`subcategory-${subcategory.slug}`}
    >
      <LinearGradient
        colors={parentGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.tile, isEmpty && styles.tileEmpty]}
      >
        <Text style={styles.tileEmoji}>{emoji}</Text>
        <Text style={styles.tileName} numberOfLines={2}>
          {displayName}
        </Text>
        <Text style={styles.tileMeta}>
          {isEmpty ? t('home.tile.soon') : t('home.tile.meta', { questions: total, topics: 0 }).replace(/ ·.*$/, '')}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
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
  headerEmoji: {
    fontSize: 22,
  },
  headerTitle: {
    color: '#fff',
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
  iconButtonPressed: {
    opacity: 0.5,
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
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
    paddingTop: 8,
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
    opacity: 0.4,
  },
  tileEmoji: {
    fontSize: 40,
  },
  tileName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  tileMeta: {
    color: '#ffffffcc',
    fontSize: 12,
    fontWeight: '500',
  },
});
