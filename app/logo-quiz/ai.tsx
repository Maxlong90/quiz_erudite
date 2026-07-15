import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientButton } from '@/components/logo-quiz/gradient-button';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { LogoQuizColors, LogoQuizRadii } from '@/constants/logo-quiz-theme';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import type { StringKey } from '@/i18n/strings';
import { canAccessAiTopicInput } from '@/lib/logo-quiz';

const MAX_TOPIC_LENGTH = 60;
const QUESTION_COUNTS = [10, 15, 20] as const;

const TOPIC_CHIPS: StringKey[] = [
  'logoQuiz.ai.chip.retro',
  'logoQuiz.ai.chip.sneakers',
  'logoQuiz.ai.chip.games',
  'logoQuiz.ai.chip.banks',
  'logoQuiz.ai.chip.sweets',
];

export default function LogoQuizAiScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();

  const [topic, setTopic] = useState('');
  const [count, setCount] = useState<number>(15);
  const [generating, setGenerating] = useState(false);

  // Gate: null = still hydrating (show a loader, never leak the screen);
  // false = redirect to the paywall; true = premium, render.
  if (isPremium === null) {
    return (
      <View style={[styles.root, styles.center]}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={LogoQuizColors.cyan} />
      </View>
    );
  }
  if (!canAccessAiTopicInput(isPremium)) {
    return <Redirect href="/logo-quiz/paywall" />;
  }

  function handleGenerate() {
    if (generating || topic.trim().length === 0) return;
    setGenerating(true);
    // TODO(AI): call the backend logo-quiz generation endpoint here with
    // { topic: topic.trim(), questionCount: count }, then navigate into the
    // generated quiz. Until that backend exists we simulate the request and
    // surface a "coming soon" stub so the seam is obvious.
    setTimeout(() => {
      setGenerating(false);
      Alert.alert(t('logoQuiz.ai.stubTitle'), t('logoQuiz.ai.stubBody'), [{ text: t('logoQuiz.ai.stubDismiss') }]);
    }, 1200);
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex} edges={['top', 'left', 'right', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            testID="logo-ai-back"
          >
            <IconSymbol name="chevron.left" size={22} color={LogoQuizColors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('logoQuiz.ai.headerTitle')}</Text>
          <View style={styles.proBadge}>
            <IconSymbol name="crown.fill" size={13} color={LogoQuizColors.text} />
            <Text style={styles.proText}>{t('logoQuiz.ai.pro')}</Text>
          </View>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <IconSymbol name="wand.and.stars" size={34} color={LogoQuizColors.purple} style={styles.wand} />
            <Text style={styles.title}>{t('logoQuiz.ai.title')}</Text>
            <Text style={styles.subtitle}>{t('logoQuiz.ai.subtitle')}</Text>

            <View style={styles.inputWrap}>
              <TextInput
                value={topic}
                onChangeText={setTopic}
                placeholder={t('logoQuiz.ai.placeholder')}
                placeholderTextColor={LogoQuizColors.textMuted}
                maxLength={MAX_TOPIC_LENGTH}
                style={styles.input}
                testID="logo-ai-topic"
              />
              <Text style={styles.counter}>
                {topic.length} / {MAX_TOPIC_LENGTH}
              </Text>
            </View>

            <Text style={styles.label}>{t('logoQuiz.ai.popularTitle')}</Text>
            <View style={styles.chips}>
              {TOPIC_CHIPS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setTopic(t(key))}
                  style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
                  testID={`logo-ai-chip-${key}`}
                >
                  <Text style={styles.chipText}>{t(key)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>{t('logoQuiz.ai.countTitle')}</Text>
            <View style={styles.segment}>
              {QUESTION_COUNTS.map((value) => {
                const active = value === count;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setCount(value)}
                    style={[styles.segmentItem, active && styles.segmentItemActive]}
                    testID={`logo-ai-count-${value}`}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{value}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <GradientButton
              label={generating ? t('logoQuiz.ai.generating') : t('logoQuiz.ai.generate')}
              iconName="sparkles"
              onPress={handleGenerate}
              loading={generating}
              disabled={topic.trim().length === 0}
              testID="logo-ai-generate"
            />
            <View style={styles.noteRow}>
              <IconSymbol name="bolt.fill" size={12} color={LogoQuizColors.textMuted} />
              <Text style={styles.note}>{t('logoQuiz.ai.timeNote')}</Text>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LogoQuizColors.bg,
  },
  flex: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: LogoQuizColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: LogoQuizColors.text,
    fontSize: 17,
    fontWeight: '800',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: LogoQuizColors.purple,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proText: {
    color: LogoQuizColors.text,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  wand: {
    marginBottom: 10,
  },
  title: {
    color: LogoQuizColors.text,
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: LogoQuizColors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 8,
    marginBottom: 20,
  },
  inputWrap: {
    backgroundColor: LogoQuizColors.surface,
    borderRadius: LogoQuizRadii.md,
    borderWidth: 1.5,
    borderColor: LogoQuizColors.purple,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    // Subtle neon glow on the focused-looking field.
    shadowColor: LogoQuizColors.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  input: {
    color: LogoQuizColors.text,
    fontSize: 17,
    fontWeight: '600',
    padding: 0,
  },
  counter: {
    alignSelf: 'flex-end',
    color: LogoQuizColors.textMuted,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
  },
  label: {
    color: LogoQuizColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    backgroundColor: LogoQuizColors.surface,
    borderWidth: 1,
    borderColor: LogoQuizColors.border,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipText: {
    color: LogoQuizColors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    gap: 12,
  },
  segmentItem: {
    flex: 1,
    backgroundColor: LogoQuizColors.surface,
    borderWidth: 1.5,
    borderColor: LogoQuizColors.border,
    borderRadius: LogoQuizRadii.md,
    paddingVertical: 16,
    alignItems: 'center',
  },
  segmentItemActive: {
    borderColor: LogoQuizColors.cyan,
    backgroundColor: '#00E5FF14',
  },
  segmentText: {
    color: LogoQuizColors.textSecondary,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  segmentTextActive: {
    color: LogoQuizColors.cyan,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 10,
  },
  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  note: {
    color: LogoQuizColors.textMuted,
    fontSize: 12,
  },
});
