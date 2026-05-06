import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { LanguagePicker } from '@/components/language-picker';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { useTranslation } from '@/hooks/use-translation';

const RESET_KEYS = ['app.locale.v1', 'onboarding.seen.v1', 'app.premium.v1'];

export default function SettingsScreen() {
  const { locale, changeLocale } = useLocale();
  const { t } = useTranslation();

  function handlePick(picked: SupportedLocale) {
    changeLocale(picked);
  }

  async function handleReset() {
    await AsyncStorage.multiRemove(RESET_KEYS);
    // Drop the back stack so the user re-enters from splash → language
    // → onboarding → paywall.
    router.replace('/splash');
  }

  function confirmReset() {
    if (typeof Alert?.alert === 'function') {
      Alert.alert(
        'Reset app?',
        'Wipe language, onboarding and premium flags and start from scratch.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reset', style: 'destructive', onPress: handleReset },
        ],
      );
    } else {
      // Web fallback (Alert is a no-op in web Expo).
      handleReset();
    }
  }

  return (
    <LinearGradient
      colors={['#1a1a47', '#2d1f5e', '#1a1a47']}
      locations={[0, 0.55, 1]}
      style={styles.flex}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={styles.backButton}
          >
            <IconSymbol name="chevron.right" size={24} color="#fff" style={styles.backIcon} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
          <LanguagePicker selected={locale} onPick={handlePick} />

          {__DEV__ && (
            <View style={styles.devSection}>
              <Text style={styles.sectionLabel}>Developer</Text>
              <Pressable
                onPress={confirmReset}
                style={({ pressed }) => [styles.devButton, pressed && styles.devButtonPressed]}
                testID="dev-reset"
              >
                <Text style={styles.devButtonText}>Reset onboarding flags</Text>
              </Pressable>
              <Text style={styles.devHint}>
                Wipes language pick, onboarding seen, and premium flag, then sends you back to the splash screen.
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    transform: [{ rotate: '180deg' }],
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff99',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginLeft: 8,
  },
  devSection: {
    marginTop: 32,
    gap: 10,
  },
  devButton: {
    backgroundColor: '#ef4444',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  devButtonPressed: {
    opacity: 0.85,
  },
  devButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  devHint: {
    color: '#ffffff77',
    fontSize: 12,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
});
