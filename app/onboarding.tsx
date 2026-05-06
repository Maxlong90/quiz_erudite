import { useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { useOnboarding } from '@/hooks/use-onboarding';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Page {
  emojiCenter: string;
  emojiOrbit: string[];
  title: string;
  subtitle: string;
}

const PAGES: Page[] = [
  {
    emojiCenter: '🏆',
    emojiOrbit: ['💡', '📚', '❓', '✨', '🧠', '⭐'],
    title: 'Прокачай эрудицию',
    subtitle:
      'Узнавай новое и проверяй знания в самых интересных темах каждый день.',
  },
  {
    emojiCenter: '🌍',
    emojiOrbit: ['🎨', '⚛️', '📖', '🏛️', '🎬', '⚽'],
    title: 'Выбирай любимые темы',
    subtitle:
      'География, история, наука, искусство, спорт и не только — играй в то, что нравится.',
  },
  {
    emojiCenter: '📊',
    emojiOrbit: ['🔥', '⭐', '🥇', '🎯', '💎', '🚀'],
    title: 'Следи за прогрессом',
    subtitle:
      'Зарабатывай очки, удерживай серию и поднимайся в рейтинге эрудитов.',
  },
];

export default function OnboardingScreen() {
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const { markSeen } = useOnboarding();

  const isLast = page === PAGES.length - 1;

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== page) {
      setPage(next);
    }
  }

  async function onPrimaryPress() {
    if (isLast) {
      await markSeen();
      router.replace('/');
      return;
    }
    const next = page + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setPage(next);
  }

  async function onSkip() {
    await markSeen();
    router.replace('/');
  }

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />

      <Pressable onPress={onSkip} style={styles.skip} hitSlop={10}>
        <Text style={styles.skipText}>Пропустить</Text>
      </Pressable>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {PAGES.map((p, i) => (
          <PageView key={i} page={p} />
        ))}
      </ScrollView>

      <View style={styles.bottomSlot} pointerEvents="box-none">
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === page && styles.dotActive]}
            />
          ))}
        </View>

        <View style={styles.buttonWrap}>
          <Pressable
            onPress={onPrimaryPress}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            testID="onboarding-primary"
          >
            <Text style={styles.buttonText}>{isLast ? 'Начать' : 'Далее'}</Text>
          </Pressable>
        </View>
      </View>

      <Stars />
    </LinearGradient>
  );
}

function PageView({ page }: { page: Page }) {
  return (
    <View style={[styles.page, { width: SCREEN_WIDTH }]}>
      <View style={styles.illustration}>
        <Text style={styles.centerEmoji}>{page.emojiCenter}</Text>
        {page.emojiOrbit.map((e, i) => {
          const angle = (i / page.emojiOrbit.length) * Math.PI * 2 - Math.PI / 2;
          const radius = 110;
          return (
            <Text
              key={i}
              style={[
                styles.orbitEmoji,
                {
                  transform: [
                    { translateX: Math.cos(angle) * radius },
                    { translateY: Math.sin(angle) * radius },
                  ],
                },
              ]}
            >
              {e}
            </Text>
          );
        })}
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.subtitle}>{page.subtitle}</Text>
      </View>
    </View>
  );
}

function Stars() {
  // Decorative twinkle layer; pure CSS-style positioning, non-interactive.
  const positions = [
    { top: 60, left: 30, size: 3 },
    { top: 90, left: '70%' as const, size: 2 },
    { top: 140, left: '20%' as const, size: 2 },
    { top: 180, right: 40, size: 4 },
    { top: 220, left: '50%' as const, size: 2 },
    { top: 280, left: 50, size: 2 },
    { top: 330, right: 70, size: 3 },
    { top: 380, left: '40%' as const, size: 2 },
  ];
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {positions.map((p, i) => (
        <View
          key={i}
          style={[
            styles.star,
            {
              top: p.top,
              left: 'left' in p ? p.left : undefined,
              right: 'right' in p ? p.right : undefined,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  skip: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  skipText: {
    color: '#ffffffaa',
    fontSize: 14,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  page: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 220,
    paddingHorizontal: 32,
    gap: 16,
  },
  illustration: {
    width: 260,
    height: 260,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerEmoji: {
    fontSize: 96,
  },
  orbitEmoji: {
    position: 'absolute',
    fontSize: 28,
  },
  copy: {
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    color: '#ffffffcc',
    textAlign: 'center',
    lineHeight: 22,
  },
  bottomSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    gap: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff44',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 24,
  },
  buttonWrap: {
    paddingHorizontal: 24,
  },
  button: {
    backgroundColor: '#7c5cff',
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  star: {
    position: 'absolute',
    backgroundColor: '#ffffff66',
  },
});
