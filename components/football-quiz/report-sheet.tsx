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
import { FQColors, FQRadius } from '@/constants/football-quiz/theme';
import { useSQLabels, type SQLabels } from '@/constants/sport-quiz/labels';
import { GoldCta } from '@/components/football-quiz/ui';

/**
 * Football Quiz "Report a question" bottom sheet. Same mechanic and the same six
 * reasons as components/sport-quiz/report-sheet.tsx — a reason picker plus an
 * optional comment POSTed through the shared `submitReport` API — restyled to
 * the gold-on-grey-glass look.
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

export function FQReportSheet({
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
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.sheet}>
          <LinearGradient colors={[FQColors.glassStrong, FQColors.glass]} style={StyleSheet.absoluteFill} />
          <View style={styles.handle} />

          {phase === 'success' ? (
            <View style={styles.successBox}>
              <Text style={styles.title}>{t.reportSentTitle}</Text>
              <Text style={styles.subtitle}>{t.reportSentBody}</Text>
              <GoldCta label={t.reportDone} onPress={onClose} style={styles.fullCta} />
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
                      <View style={[styles.radio, selected && { borderColor: FQColors.gold }]}>
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
                placeholderTextColor={FQColors.textMuted}
                value={comment}
                onChangeText={setComment}
                multiline
              />

              {phase === 'error' && <Text style={styles.errorText}>{t.reportError}</Text>}

              <View style={styles.actions}>
                <Pressable onPress={onClose} style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.85 }]}>
                  <Text style={styles.cancelText}>{t.reportCancel}</Text>
                </Pressable>
                {phase === 'submitting' ? (
                  <View style={styles.submitBusy}>
                    <ActivityIndicator color={FQColors.gold} />
                  </View>
                ) : (
                  <GoldCta label={t.reportSubmit} onPress={handleSubmit} disabled={!reason} style={styles.submitCta} />
                )}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(4,6,8,0.62)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.5,
    borderBottomWidth: 0,
    borderColor: FQColors.glassBorder,
    overflow: 'hidden',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 10,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: FQColors.glassBorderDim,
    marginBottom: 8,
  },
  title: { fontSize: 20, fontWeight: '900', color: FQColors.text, textAlign: 'center' },
  subtitle: { fontSize: 14, color: FQColors.textMuted, textAlign: 'center', marginBottom: 6 },

  reasons: { gap: 8 },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: FQRadius.md,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
    backgroundColor: 'rgba(12,14,16,0.5)',
  },
  reasonRowSelected: { borderColor: FQColors.gold, backgroundColor: 'rgba(255,201,60,0.14)' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: FQColors.glassBorderDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: FQColors.gold },
  reasonLabel: { fontSize: 15, fontWeight: '700', color: FQColors.text, flex: 1 },

  commentInput: {
    minHeight: 74,
    borderRadius: FQRadius.md,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorderDim,
    backgroundColor: 'rgba(12,14,16,0.5)',
    color: FQColors.text,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
  },
  errorText: { color: FQColors.wrong, fontSize: 13, fontWeight: '700', textAlign: 'center' },

  actions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: FQRadius.pill,
    borderWidth: 1.5,
    borderColor: FQColors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: FQColors.text, fontWeight: '900', fontSize: 16 },
  submitCta: { flex: 1, height: 50 },
  submitBusy: { flex: 1, height: 50, alignItems: 'center', justifyContent: 'center' },

  successBox: { alignItems: 'center', gap: 10, paddingVertical: 10 },
  fullCta: { alignSelf: 'stretch', height: 50, marginTop: 6 },
});
