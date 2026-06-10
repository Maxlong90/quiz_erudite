import { useState } from 'react';
import {
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
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { usePremium } from '@/hooks/use-premium';
import { useTranslation } from '@/hooks/use-translation';

const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

type Mode = 'signup' | 'login';

export default function AccountScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // No auth backend yet — every submit path lands on the same friendly
  // "coming soon" notice. Swap these for real calls once auth is wired.
  function notImplemented() {
    Alert.alert(t('account.soon.title'), t('account.soon.body'));
  }

  const canSubmit = email.trim().length > 3 && password.length >= 6;

  return (
    <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('account.title')}</Text>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Text style={styles.premiumEmoji}>👑</Text>
                <Text style={styles.premiumText}>{t('account.premiumBadge')}</Text>
              </View>
            )}

            <View style={styles.segmented}>
              <Pressable
                onPress={() => setMode('signup')}
                style={[styles.segment, mode === 'signup' && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, mode === 'signup' && styles.segmentLabelActive]}>
                  {t('account.tab.signup')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setMode('login')}
                style={[styles.segment, mode === 'login' && styles.segmentActive]}
              >
                <Text style={[styles.segmentLabel, mode === 'login' && styles.segmentLabelActive]}>
                  {t('account.tab.login')}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>{t('account.email')}</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@example.com"
              placeholderTextColor="#ffffff55"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t('account.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor="#ffffff55"
              style={styles.input}
            />

            <Pressable
              onPress={notImplemented}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primary,
                !canSubmit && styles.primaryDisabled,
                pressed && canSubmit && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.primaryText}>
                {mode === 'signup' ? t('account.signup.cta') : t('account.login.cta')}
              </Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t('account.or')}</Text>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              onPress={notImplemented}
              style={({ pressed }) => [styles.social, styles.appleBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.appleIcon}></Text>
              <Text style={styles.appleText}>{t('account.apple')}</Text>
            </Pressable>

            <Pressable
              onPress={notImplemented}
              style={({ pressed }) => [styles.social, styles.googleBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.googleIcon}>G</Text>
              <Text style={styles.googleText}>{t('account.google')}</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode(mode === 'signup' ? 'login' : 'signup')}
              style={styles.switchLink}
            >
              <Text style={styles.switchText}>
                {mode === 'signup' ? t('account.signup.hint') : t('account.login.hint')}
              </Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>

        <BottomBar current="account" />
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffd23a22',
    borderColor: '#ffd23a66',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  premiumEmoji: { fontSize: 18 },
  premiumText: {
    color: '#ffd23a',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: '#7c5cff',
    borderRadius: 999,
    padding: 4,
    alignSelf: 'center',
    marginBottom: 24,
  },
  segment: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 999,
    minWidth: 130,
    alignItems: 'center',
  },
  segmentActive: { backgroundColor: '#fff' },
  segmentLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  segmentLabelActive: { color: '#7c5cff' },
  fieldLabel: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#ffffff10',
    borderWidth: 1,
    borderColor: '#ffffff33',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
  },
  primary: {
    backgroundColor: '#7c5cff',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff33',
  },
  dividerText: {
    color: '#ffffff99',
    fontSize: 13,
    fontWeight: '600',
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  appleBtn: { backgroundColor: '#000' },
  appleIcon: { color: '#fff', fontSize: 18 },
  appleText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  googleBtn: { backgroundColor: '#fff' },
  googleIcon: { color: '#4285F4', fontSize: 18, fontWeight: '900' },
  googleText: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
  switchLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  switchText: {
    color: '#a78bff',
    fontSize: 14,
    fontWeight: '600',
  },
});
