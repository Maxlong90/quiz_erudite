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

import { useTranslation } from '@/hooks/use-translation';
import {
  submitReport,
  type ReportContentType,
  type ReportReason,
} from '@/api/reports';
import type { StringKey } from '@/i18n/strings';

const REASONS: { id: ReportReason; labelKey: StringKey }[] = [
  { id: 'incorrect_answer', labelKey: 'report.reason.incorrect_answer' },
  { id: 'unclear_wording', labelKey: 'report.reason.unclear_wording' },
  { id: 'inappropriate', labelKey: 'report.reason.inappropriate' },
  { id: 'broken_media', labelKey: 'report.reason.broken_media' },
  { id: 'translation_issue', labelKey: 'report.reason.translation_issue' },
  { id: 'other', labelKey: 'report.reason.other' },
];

const COLORS = {
  sheet: '#1f1949',
  text: '#fff',
  textMuted: '#ffffffaa',
  border: '#ffffff1f',
  rowBackground: '#ffffff0d',
  accent: '#7c5cff',
  accentSoft: '#7c5cff33',
  inputBorder: '#ffffff33',
  placeholder: '#ffffff66',
  error: '#ff8a8a',
};

interface Props {
  visible: boolean;
  contentType: ReportContentType;
  contentId: number;
  locale?: string;
  onClose: () => void;
}

type Phase = 'idle' | 'submitting' | 'success' | 'error';

export function ReportModal({ visible, contentType, contentId, locale, onClose }: Props) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [errorText, setErrorText] = useState<string | null>(null);

  function handleClose() {
    setReason(null);
    setComment('');
    setPhase('idle');
    setErrorText(null);
    onClose();
  }

  async function handleSubmit() {
    if (!reason) return;
    setPhase('submitting');
    setErrorText(null);
    try {
      await submitReport({
        contentType,
        contentId,
        reason,
        comment: comment.trim() ? comment.trim() : undefined,
        locale,
      });
      setPhase('success');
    } catch {
      setPhase('error');
      setErrorText(t('report.error'));
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

          {phase === 'success' ? (
            <View style={styles.successBox}>
              <Text style={styles.title}>{t('report.successTitle')}</Text>
              <Text style={styles.subtitle}>{t('report.successBody')}</Text>
              <Pressable
                onPress={handleClose}
                style={({ pressed }) => [
                  styles.primaryButton,
                  styles.primaryButtonFull,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.primaryButtonText}>{t('report.done')}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t('report.title')}</Text>
              <Text style={styles.subtitle}>{t('report.subtitle')}</Text>

              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const selected = reason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setReason(r.id)}
                      style={[
                        styles.reasonRow,
                        selected
                          ? { backgroundColor: COLORS.accentSoft, borderColor: COLORS.accent }
                          : { backgroundColor: COLORS.rowBackground, borderColor: COLORS.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: selected ? COLORS.accent : COLORS.textMuted },
                        ]}
                      >
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.reasonLabel}>{t(r.labelKey)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder={t('report.commentPlaceholder')}
                placeholderTextColor={COLORS.placeholder}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={2000}
                editable={phase !== 'submitting'}
              />

              {errorText && <Text style={styles.errorText}>{errorText}</Text>}

              <View style={styles.actions}>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                  disabled={phase === 'submitting'}
                >
                  <Text style={styles.secondaryButtonText}>{t('report.cancel')}</Text>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!reason || phase === 'submitting'}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    (!reason || phase === 'submitting') && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {phase === 'submitting' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryButtonText}>{t('report.submit')}</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
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
  reasons: {
    gap: 8,
    marginTop: 4,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.accent,
  },
  reasonLabel: {
    color: COLORS.text,
    fontSize: 15,
    flexShrink: 1,
  },
  commentInput: {
    color: COLORS.text,
    backgroundColor: COLORS.rowBackground,
    borderColor: COLORS.inputBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 4,
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
    marginTop: 8,
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
  primaryButtonFull: {
    flex: undefined,
    alignSelf: 'stretch',
    marginTop: 4,
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
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
});
