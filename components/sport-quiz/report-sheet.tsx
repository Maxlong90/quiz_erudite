import { useEffect, useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

import { submitReport, type ReportReason } from '@/api/reports';
import { SQColors, SQRadius } from '@/constants/sport-quiz/theme';
import { useSQLabels, type SQLabels } from '@/constants/sport-quiz/labels';

/**
 * Sport Quiz "Report a question" bottom sheet. Same mechanic as the Logo Quiz
 * report flow — a reason picker + optional comment POSTed via the shared
 * `submitReport` API — in Sport Quiz's neon-glass look. Opened from the quiz
 * header's Report button.
 */

const REASONS: { id: ReportReason; labelKey: keyof SQLabels }[] = [
  { id: 'incorrect_answer', labelKey: 'reasonIncorrectAnswer' },
  { id: 'unclear_wording', labelKey: 'reasonUnclearWording' },
  { id: 'inappropriate', labelKey: 'reasonInappropriate' },
  { id: 'broken_media', labelKey: 'reasonBrokenMedia' },
  { id: 'translation_issue', labelKey: 'reasonTranslationIssue' },
  { id: 'other', labelKey: 'reasonOther' },
];

type Phase = 'idle' | 'submitting' | 'success' | 'error';

export function ReportSheet({
  visible,
  onClose,
  questionId,
  locale,
}: {
  visible: boolean;
  onClose: () => void;
  questionId: number;
  locale: string;
}) {
  const t = useSQLabels();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  // Reset to a fresh form every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setReason(null);
      setComment('');
      setPhase('idle');
    }
  }, [visible]);

  async function handleSubmit() {
    if (!reason) return;
    setPhase('submitting');
    try {
      await submitReport({
        contentType: 'question',
        contentId: questionId,
        reason,
        comment: comment.trim() ? comment.trim() : undefined,
        locale,
      });
      setPhase('success');
    } catch {
      setPhase('error');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <LinearGradient
            colors={[SQColors.glassStrong, SQColors.glass]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.handle} />

          {phase === 'success' ? (
            <View style={styles.successBox}>
              <Text style={styles.title}>{t.reportSentTitle}</Text>
              <Text style={styles.subtitle}>{t.reportSentBody}</Text>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [styles.primaryButton, styles.primaryFull, pressed && styles.pressed]}
              >
                <Text style={styles.primaryText}>{t.reportDone}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.title}>{t.reportTitle}</Text>
              <Text style={styles.subtitle}>{t.reportSubtitle}</Text>

              <View style={styles.reasons}>
                {REASONS.map((r) => {
                  const selected = reason === r.id;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => setReason(r.id)}
                      style={[styles.reasonRow, selected && styles.reasonRowSelected]}
                    >
                      <View style={[styles.radio, selected && { borderColor: SQColors.neon }]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                      <Text style={styles.reasonLabel}>{t[r.labelKey]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder={t.reportCommentPlaceholder}
                placeholderTextColor={SQColors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
                maxLength={2000}
                editable={phase !== 'submitting'}
              />

              {phase === 'error' && <Text style={styles.errorText}>{t.reportError}</Text>}

              <View style={styles.actions}>
                <Pressable
                  onPress={onClose}
                  disabled={phase === 'submitting'}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                >
                  <Text style={styles.secondaryText}>{t.reportCancel}</Text>
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
                    <ActivityIndicator color={SQColors.textOnNeon} />
                  ) : (
                    <Text style={styles.primaryText}>{t.reportSubmit}</Text>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(2,8,14,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: SQRadius.lg,
    borderTopRightRadius: SQRadius.lg,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorder,
    overflow: 'hidden',
    padding: 20,
    paddingTop: 12,
    paddingBottom: 32,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(143,169,194,0.5)',
    marginBottom: 8,
  },
  title: { color: SQColors.text, fontSize: 18, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
  subtitle: { color: SQColors.textMuted, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  reasons: { gap: 8 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: SQRadius.sm,
    borderWidth: 1.5,
    borderColor: SQColors.glassBorderDim,
    backgroundColor: 'rgba(9,24,40,0.5)',
  },
  reasonRowSelected: { borderColor: SQColors.neon, backgroundColor: 'rgba(43,255,179,0.10)' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: SQColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: SQColors.neon },
  reasonLabel: { color: SQColors.text, fontSize: 15, flexShrink: 1, fontWeight: '700' },
  commentInput: {
    color: SQColors.text,
    backgroundColor: 'rgba(9,24,40,0.5)',
    borderColor: SQColors.glassBorderDim,
    borderWidth: 1.5,
    borderRadius: SQRadius.sm,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 4,
    fontSize: 15,
  },
  errorText: { color: SQColors.neonPink, textAlign: 'center', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SQRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: SQColors.glassBorderDim,
    backgroundColor: 'rgba(9,24,40,0.5)',
  },
  secondaryText: { color: SQColors.text, fontSize: 16, fontWeight: '800' },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: SQRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: SQColors.neon,
  },
  primaryFull: { flex: undefined, alignSelf: 'stretch', marginTop: 8 },
  primaryText: { color: SQColors.textOnNeon, fontSize: 16, fontWeight: '900' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
  successBox: { alignItems: 'center', gap: 12, paddingVertical: 12 },
});
