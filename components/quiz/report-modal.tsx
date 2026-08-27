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

import { useTranslation } from '@/hooks/use-translation';
import { useThemeColors } from '@/hooks/use-theme-colors';
import type { EruditePalette } from '@/constants/theme';
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
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
                          ? { backgroundColor: colors.accentBg, borderColor: colors.accent }
                          : { backgroundColor: colors.surfaceSoft, borderColor: colors.border },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: selected ? colors.accent : colors.textFaint },
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
                placeholderTextColor={colors.textDisabled}
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
                    <ActivityIndicator color={colors.onAccent} />
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
    backgroundColor: c.accent,
  },
  reasonLabel: {
    color: c.text,
    fontSize: 15,
    flexShrink: 1,
  },
  commentInput: {
    color: c.text,
    backgroundColor: c.surfaceSoft,
    borderColor: c.borderStrong,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 4,
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
    marginTop: 8,
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
  primaryButtonFull: {
    flex: undefined,
    alignSelf: 'stretch',
    marginTop: 4,
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
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
});
