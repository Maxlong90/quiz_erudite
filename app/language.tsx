import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LanguagePicker } from '@/components/language-picker';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { useTranslation } from '@/hooks/use-translation';

export default function LanguageScreen() {
  const { locale, changeLocale } = useLocale();
  const { t } = useTranslation();

  async function handlePick(picked: SupportedLocale) {
    await changeLocale(picked);
    // The language picker is the first step of the always-on intro
    // (splash -> language -> onboarding -> paywall -> home), so it always
    // hands off to onboarding, never straight to home.
    router.replace('/onboarding');
  }

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.heading}>
            <Text style={styles.title}>{t('language.title')}</Text>
            <Text style={styles.subtitle}>{t('language.subtitle')}</Text>
          </View>
          <LanguagePicker selected={locale} onPick={handlePick} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
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
    color: '#fff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff99',
    textAlign: 'center',
  },
});
