import { useMemo } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguagePicker } from '@/components/language-picker';
import { ScreenBackground } from '@/components/screen-background';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';

export default function LanguageScreen() {
  const { locale, changeLocale } = useLocale();
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  async function handlePick(picked: SupportedLocale) {
    await changeLocale(picked);
    // The language picker is the first step of the always-on intro
    // (splash -> language -> onboarding -> paywall -> home), so it always
    // hands off to onboarding, never straight to home.
    router.replace('/onboarding');
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.title}>{t('language.title')}</Text>
            <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
          </View>
          <LanguagePicker selected={locale} onPick={handlePick} />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  heading: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: c.text,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: c.textFaint,
    textAlign: 'center',
  },
});
