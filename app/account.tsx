import { useMemo, useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomBar } from '@/components/bottom-bar';
import { ScreenBackground } from '@/components/screen-background';
import { usePremium } from '@/hooks/use-premium';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';

type Mode = 'signup' | 'login';

export default function AccountScreen() {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
    <ScreenBackground>
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
              placeholderTextColor={colors.textFaint}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t('account.password')}</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textFaint}
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
    </ScreenBackground>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    color: c.text,
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
    color: c.gold,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  segmented: {
    flexDirection: 'row',
    backgroundColor: c.accent,
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
  segmentActive: { backgroundColor: c.onAccent },
  segmentLabel: { color: c.onAccent, fontSize: 15, fontWeight: '700' },
  segmentLabelActive: { color: c.accent },
  fieldLabel: {
    color: c.textFaint,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: c.surfaceSoft,
    borderWidth: 1,
    borderColor: c.borderStrong,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: c.text,
    fontSize: 16,
    marginBottom: 16,
  },
  primary: {
    backgroundColor: c.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryDisabled: { opacity: 0.4 },
  primaryText: {
    color: c.onAccent,
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
    backgroundColor: c.borderStrong,
  },
  dividerText: {
    color: c.textFaint,
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
    color: c.accentSoft,
    fontSize: 14,
    fontWeight: '600',
  },
});
