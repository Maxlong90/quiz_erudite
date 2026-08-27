import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { reviewerUnlock } from '@/api/paywall';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fired after the backend confirms the credentials. */
  onUnlocked: () => void;
}

type Phase = 'idle' | 'submitting';

export function ReviewerUnlockModal({ visible, onClose, onUnlocked }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  function handleClose() {
    setLogin('');
    setPassword('');
    setPhase('idle');
    setErrorText(null);
    onClose();
  }

  async function handleSubmit() {
    if (phase === 'submitting') return;
    if (!login.trim() || !password) {
      setErrorText(t('paywall.review.invalid'));
      return;
    }
    setPhase('submitting');
    setErrorText(null);
    try {
      const ok = await reviewerUnlock(login.trim(), password);
      if (ok) {
        // Reset before handing control back so a re-open starts clean.
        setLogin('');
        setPassword('');
        setPhase('idle');
        onUnlocked();
        return;
      }
      setPhase('idle');
      setErrorText(t('paywall.review.invalid'));
    } catch {
      setPhase('idle');
      setErrorText(t('paywall.review.networkError'));
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={styles.sheet}>
          <View style={styles.handle} />

          <Text style={styles.title}>{t('paywall.review.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.review.subtitle')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('paywall.review.login')}
            placeholderTextColor={colors.textDisabled}
            value={login}
            onChangeText={setLogin}
            autoCapitalize="none"
            autoCorrect={false}
            editable={phase !== 'submitting'}
            testID="paywall-review-login"
          />
          <TextInput
            style={styles.input}
            placeholder={t('paywall.review.password')}
            placeholderTextColor={colors.textDisabled}
            value={password}
            onChangeText={setPassword}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={phase !== 'submitting'}
            testID="paywall-review-password"
          />

          {errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.actions}>
            <Pressable
              onPress={handleClose}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
              disabled={phase === 'submitting'}
            >
              <Text style={styles.secondaryButtonText}>{t('paywall.review.cancel')}</Text>
            </Pressable>
            <Pressable
              onPress={handleSubmit}
              disabled={phase === 'submitting'}
              style={({ pressed }) => [
                styles.primaryButton,
                phase === 'submitting' && styles.disabled,
                pressed && styles.pressed,
              ]}
              testID="paywall-review-submit"
            >
              {phase === 'submitting' ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={styles.primaryButtonText}>{t('paywall.review.submit')}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: c.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.sheet,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 12,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.borderStrong,
    marginBottom: 8,
  },
  title: {
    color: c.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: c.textFaint,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    color: c.text,
    backgroundColor: c.surfaceSoft,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: {
    color: c.danger,
    textAlign: 'center',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  secondaryButtonText: {
    color: c.text,
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.accent,
  },
  primaryButtonText: {
    color: c.onAccent,
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
});
