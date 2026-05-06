import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocale } from '@/hooks/use-locale';

const COUNT_OPTIONS = [10, 20, 50] as const;

export default function HomeScreen() {
  const theme = useColorScheme() ?? 'light';
  const tint = Colors[theme].tint;
  const { locale } = useLocale();
  const [count, setCount] = useState<number>(10);

  const handleStart = () => {
    router.push({
      pathname: '/quiz',
      params: { count: String(count), locale },
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: Colors[theme].background }]}>
      <View style={styles.topBar}>
        <View style={styles.topSpacer} />
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
          testID="settings-button"
          accessibilityLabel="Open settings"
        >
          <IconSymbol name="gearshape.fill" size={24} color={Colors[theme].text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroSection}>
          <ThemedText style={styles.emoji}>🏰</ThemedText>
          <ThemedText type="title" style={styles.title}>
            Coat of Arms Quiz
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Test your knowledge of world heraldry
          </ThemedText>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Number of Questions
          </ThemedText>
          <View style={styles.pillRow}>
            {COUNT_OPTIONS.map((opt) => (
              <Pressable
                key={opt}
                onPress={() => setCount(opt)}
                style={[
                  styles.pill,
                  {
                    backgroundColor: count === opt ? tint : 'transparent',
                    borderColor: count === opt ? tint : Colors[theme].icon,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.pillText,
                    { color: count === opt ? '#fff' : Colors[theme].text },
                  ]}
                >
                  {opt}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>

        <Pressable
          onPress={handleStart}
          style={[styles.startButton, { backgroundColor: tint }]}
          testID="start-quiz-button"
        >
          <ThemedText style={styles.startButtonText}>Start Quiz</ThemedText>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 40,
    gap: 8,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  section: {
    marginBottom: 28,
    gap: 12,
  },
  sectionTitle: {
    textAlign: 'center',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 2,
    minWidth: 60,
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  topSpacer: {
    flex: 1,
  },
  settingsButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPressed: {
    opacity: 0.5,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '600',
  },
  startButton: {
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
