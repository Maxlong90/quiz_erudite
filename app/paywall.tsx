import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import type { StringKey } from '@/i18n/strings';

const FEATURES: { icon: string; key: StringKey }[] = [
  { icon: '∞', key: 'paywall.feature.unlimited' },
  { icon: '🚫', key: 'paywall.feature.adfree' },
  { icon: '🌐', key: 'paywall.feature.alllanguages' },
  { icon: '🔒', key: 'paywall.feature.exclusive' },
];

export default function PaywallScreen() {
  const { t } = useTranslation();
  const { setPremium } = usePremium();

  async function handleSubscribe() {
    // MVP: locally mark the user as premium. Replace with the
    // RevenueCat purchase flow when IAP is wired up.
    await setPremium(true);
    router.replace('/');
  }

  function handleDismiss() {
    router.replace('/');
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
          <View style={styles.spacer} />
          <Pressable
            onPress={handleDismiss}
            hitSlop={12}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            accessibilityLabel="Close paywall"
            testID="paywall-close"
          >
            <IconSymbol name="xmark" size={22} color="#ffffffcc" />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <Image
            source={require('@/assets/onboarding/trophy.png')}
            style={styles.trophy}
            resizeMode="contain"
          />
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.key} style={styles.featureRow}>
              <View style={styles.bullet}>
                <Text style={styles.bulletText}>{f.icon}</Text>
              </View>
              <Text style={styles.featureText}>{t(f.key)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleSubscribe}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            testID="paywall-subscribe"
          >
            <Text style={styles.ctaText}>{t('paywall.cta')}</Text>
          </Pressable>

          <Pressable onPress={handleDismiss} hitSlop={10} testID="paywall-dismiss">
            <Text style={styles.dismissText}>{t('paywall.continueFree')}</Text>
          </Pressable>

          <Text style={styles.disclaimer}>{t('paywall.disclaimer')}</Text>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  spacer: {
    flex: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonPressed: {
    opacity: 0.5,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 8,
    gap: 12,
  },
  trophy: {
    width: 140,
    height: 140,
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 0.4,
    textAlign: 'center',
    textShadowColor: 'rgba(124, 92, 255, 0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffffcc',
    textAlign: 'center',
  },
  features: {
    paddingHorizontal: 32,
    paddingTop: 28,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bullet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7c5cff33',
    borderWidth: 1,
    borderColor: '#7c5cff66',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bulletText: {
    fontSize: 18,
  },
  featureText: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
  },
  actions: {
    marginTop: 'auto',
    paddingHorizontal: 24,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 14,
  },
  cta: {
    width: '100%',
    backgroundColor: '#7c5cff',
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 8,
  },
  ctaPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  ctaText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  dismissText: {
    color: '#ffffff99',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 6,
  },
  disclaimer: {
    color: '#ffffff66',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
