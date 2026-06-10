import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';
import type { StringKey } from '@/i18n/strings';

// Comparison rows. `free`/`premium` are either an i18n key (resolved
// via t()) or the literal check / cross marks rendered as-is.
const CHECK = '✓';
const CROSS = '✕';

interface CompareRow {
  labelKey: StringKey;
  // Either an i18n key (t() resolves it), a literal number string, or
  // the CHECK / CROSS marks.
  free: string;
  premium: string;
}

const COMPARE_ROWS: CompareRow[] = [
  { labelKey: 'paywall.row.lives', free: 'paywall.row.lives.free', premium: 'paywall.row.lives.premium' },
  { labelKey: 'paywall.row.ad', free: 'paywall.row.ad.free', premium: 'paywall.row.ad.premium' },
  { labelKey: 'paywall.row.modes', free: '3', premium: '9' },
  { labelKey: 'paywall.row.flashcards', free: CROSS, premium: CHECK },
  { labelKey: 'paywall.row.stats', free: 'paywall.row.stats.free', premium: 'paywall.row.stats.premium' },
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

        <View style={styles.table}>
          {/* Column headers */}
          <View style={styles.tableHeaderRow}>
            <View style={styles.featureCol} />
            <View style={styles.valueCol}>
              <Text style={styles.colHeaderFree}>{t('paywall.col.free')}</Text>
            </View>
            <View style={[styles.valueCol, styles.premiumCol]}>
              <Text style={styles.colHeaderPremium}>{t('paywall.col.premium')}</Text>
            </View>
          </View>

          {COMPARE_ROWS.map((row, idx) => (
            <View
              key={row.labelKey}
              style={[styles.tableRow, idx < COMPARE_ROWS.length - 1 && styles.rowDivider]}
            >
              <Text style={styles.featureLabel}>{t(row.labelKey)}</Text>
              <View style={styles.valueCol}>
                <CompareCell value={row.free} />
              </View>
              <View style={[styles.valueCol, styles.premiumCol]}>
                <CompareCell value={row.premium} premium />
              </View>
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

function CompareCell({ value, premium }: { value: string; premium?: boolean }) {
  const { t } = useTranslation();
  if (value === CHECK) {
    return <Text style={[styles.cellCheck, premium && styles.cellCheckPremium]}>{CHECK}</Text>;
  }
  if (value === CROSS) {
    return <Text style={styles.cellCross}>{CROSS}</Text>;
  }
  // Numeric literals ('3', '9') pass through t() unchanged; real keys
  // resolve to localized strings.
  return (
    <Text style={[styles.cellText, premium && styles.cellTextPremium]}>{t(value as StringKey)}</Text>
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
    paddingTop: 0,
    gap: 10,
  },
  trophy: {
    width: 96,
    height: 96,
    marginBottom: 2,
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
  table: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    borderRadius: 18,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    borderColor: '#ffffff14',
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff22',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff14',
  },
  featureCol: {
    flex: 1.4,
  },
  featureLabel: {
    flex: 1.4,
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  valueCol: {
    flex: 1,
    alignItems: 'center',
  },
  // Gold wash down the Premium column to set it apart as the paid tier.
  premiumCol: {
    backgroundColor: '#ffd23a14',
  },
  colHeaderFree: {
    color: '#ffffff99',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  colHeaderPremium: {
    color: '#ffd23a',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cellText: {
    color: '#ffffffcc',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  cellTextPremium: {
    color: '#ffd23a',
    fontWeight: '800',
  },
  cellCheck: {
    color: '#22c55e',
    fontSize: 18,
    fontWeight: '900',
  },
  cellCheckPremium: {
    color: '#ffd23a',
  },
  cellCross: {
    color: '#ffffff44',
    fontSize: 16,
    fontWeight: '800',
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
