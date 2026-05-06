import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { LanguagePicker } from '@/components/language-picker';
import { useLocale, type SupportedLocale } from '@/hooks/use-locale';
import { useTranslation } from '@/hooks/use-translation';

export default function SettingsScreen() {
  const { locale, changeLocale } = useLocale();
  const { t } = useTranslation();

  function handlePick(picked: SupportedLocale) {
    changeLocale(picked);
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
});
