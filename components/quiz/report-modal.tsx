import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  submitReport,
  type ReportContentType,
  type ReportReason,
} from '@/api/reports';

const REASONS: { id: ReportReason; label: string }[] = [
  { id: 'incorrect_answer', label: 'Incorrect answer' },
  { id: 'unclear_wording', label: 'Unclear or poorly worded' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'broken_media', label: "Image or audio doesn't load" },
  { id: 'translation_issue', label: 'Translation issue' },
  { id: 'other', label: 'Other' },
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
  const theme = useColorScheme() ?? 'light';
  const palette = Colors[theme];
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
    } catch (err) {
      setPhase('error');
      setErrorText(err instanceof Error ? err.message : 'Could not send the report.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />

        <View style={[styles.sheet, { backgroundColor: palette.background }]}>
          {phase === 'success' ? (
            <View style={styles.successBox}>
              <ThemedText type="subtitle" style={styles.successTitle}>
                Thanks for the report
              </ThemedText>
              <ThemedText style={styles.successBody}>
                We'll review it and clean up the content.
              </ThemedText>
              <Pressable
                style={[styles.primaryButton, { backgroundColor: palette.tint }]}
                onPress={handleClose}
              >
                <ThemedText style={styles.primaryButtonText}>Close</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <ThemedText type="subtitle" style={styles.title}>
                Report a problem
              </ThemedText>
              <ThemedText style={styles.subtitle}>
                What's wrong with this item?
              </ThemedText>

              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const selected = reason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setReason(r.id)}
                      style={[
                        styles.reasonRow,
                        selected && { backgroundColor: palette.tint + '22', borderColor: palette.tint },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: selected ? palette.tint : palette.text + '55' },
                        ]}
                      >
                        {selected && (
                          <View style={[styles.radioDot, { backgroundColor: palette.tint }]} />
                        )}
                      </View>
                      <ThemedText style={styles.reasonLabel}>{r.label}</ThemedText>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={[
                  styles.commentInput,
                  { color: palette.text, borderColor: palette.text + '33' },
                ]}
                placeholder="Add details (optional)"
                placeholderTextColor={palette.text + '88'}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={2000}
                editable={phase !== 'submitting'}
              />

              {errorText && (
                <ThemedText style={styles.errorText}>{errorText}</ThemedText>
              )}

              <View style={styles.actions}>
                <Pressable
                  onPress={handleClose}
                  style={styles.secondaryButton}
                  disabled={phase === 'submitting'}
                >
                  <ThemedText style={[styles.secondaryButtonText, { color: palette.text }]}>
                    Cancel
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleSubmit}
                  disabled={!reason || phase === 'submitting'}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: palette.tint, opacity: !reason || phase === 'submitting' ? 0.5 : 1 },
                  ]}
                >
                  {phase === 'submitting' ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.primaryButtonText}>Send report</ThemedText>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
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
    borderColor: 'transparent',
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
  },
  reasonLabel: {
    fontSize: 15,
    flexShrink: 1,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 4,
  },
  errorText: {
    color: '#d24545',
    textAlign: 'center',
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
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  successBox: {
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  successTitle: {
    textAlign: 'center',
  },
  successBody: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: 8,
  },
});
