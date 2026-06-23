import { useState } from 'react';
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
import { useTranslation } from '@/hooks/use-translation';

const COLORS = {
  sheet: '#1f1949',
  text: '#fff',
  textMuted: '#ffffffaa',
  border: '#ffffff1f',
  rowBackground: '#ffffff0d',
  accent: '#7c5cff',
  inputBorder: '#ffffff33',
  placeholder: '#ffffff66',
  error: '#ff8a8a',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Fired after the backend confirms the credentials. */
  onUnlocked: () => void;
}

type Phase = 'idle' | 'submitting';

export function ReviewerUnlockModal({ visible, onClose, onUnlocked }: Props) {
  const { t } = useTranslation();
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
            placeholderTextColor={COLORS.placeholder}
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
            placeholderTextColor={COLORS.placeholder}
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
                <ActivityIndicator color="#fff" />
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.sheet,
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
    backgroundColor: '#ffffff33',
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  input: {
    color: COLORS.text,
    backgroundColor: COLORS.rowBackground,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  errorText: {
    color: COLORS.error,
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
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  primaryButtonText: {
    color: '#fff',
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
