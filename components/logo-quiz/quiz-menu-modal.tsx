import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { submitReport, type ReportReason } from '@/api/reports';
import { getStoreLinks } from '@/lib/store-links';
import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useLQLabels, type LQLabels } from '@/constants/logo-quiz/labels';
import { BG_BASE } from '@/components/logo-quiz/app-background';
import { LQColors } from '@/constants/logo-quiz/theme';
import type { ContentSnapshot } from '@/lib/content-cache';
import type { LogoQuizQuestion } from '@/lib/logo-quiz/content';

// Bottom-sheet palette matched to the Logo Quiz screens themselves: the sheet
// uses the screens' base background (BG_BASE) with the light LQ palette on top,
// so the in-quiz menu reads as part of the same surface rather than a dark,
// contrasting overlay.
const COLORS = {
  sheet: BG_BASE,
  text: LQColors.text,
  textMuted: LQColors.textMuted,
  border: 'rgba(21,27,46,0.12)',
  rowBackground: LQColors.surface,
  accent: LQColors.primary,
  accentSoft: 'rgba(76,111,255,0.15)',
  inputBorder: 'rgba(21,27,46,0.15)',
  placeholder: LQColors.textFaint,
  error: LQColors.wrong,
  handle: 'rgba(21,27,46,0.25)',
};

// Backend report reasons paired with their localized logo-quiz label key.
const REASONS: { id: ReportReason; labelKey: keyof LQLabels }[] = [
  { id: 'incorrect_answer', labelKey: 'reasonIncorrectAnswer' },
  { id: 'unclear_wording', labelKey: 'reasonUnclearWording' },
  { id: 'inappropriate', labelKey: 'reasonInappropriate' },
  { id: 'broken_media', labelKey: 'reasonBrokenMedia' },
  { id: 'translation_issue', labelKey: 'reasonTranslationIssue' },
  { id: 'other', labelKey: 'reasonOther' },
];

type MenuView = 'menu' | 'report';
type Phase = 'idle' | 'submitting' | 'success' | 'error';

interface Props {
  visible: boolean;
  onClose: () => void;
  question: LogoQuizQuestion;
  appConfig: ContentSnapshot['app'] | undefined;
  locale: string;
}

/**
 * In-quiz "…" menu, styled like the settings language picker. Offers two
 * actions on the current question:
 *   - Report → a reason picker + optional comment, POSTed via submitReport.
 *   - Share  → the system share sheet with a localized invite + store link.
 * The report flow reuses the shared `submitReport` API and mirrors the
 * erudite ReportModal structure (radio reasons, comment, success state).
 */
export function QuizMenuModal({ visible, onClose, question, appConfig, locale }: Props) {
  const t = useLQLabels();
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);

  const [view, setView] = useState<MenuView>('menu');
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');

  // Reset to a fresh menu every time the sheet opens.
  useEffect(() => {
    if (visible) {
      setView('menu');
      setReason(null);
      setComment('');
      setPhase('idle');
    }
  }, [visible]);

  async function handleShare() {
    const { storeUrl } = getStoreLinks(appConfig, Platform.OS);
    const message = t.shareInvite.replace('{url}', storeUrl);
    // Present the system share sheet BEFORE closing the modal. Closing first
    // unmounts the RN Modal while iOS is trying to present the share sheet, which
    // drops the presentation and the sheet never appears — the reason share was
    // broken. Mirrors the working erudite ShareQuestionButton (share, then close).
    try {
      await Share.share({ message });
    } catch {
      // user cancelled or the platform rejected — nothing to do
    } finally {
      onClose();
    }
  }

  async function handleSubmit() {
    if (!reason) return;
    setPhase('submitting');
    try {
      await submitReport({
        contentType: 'question',
        contentId: question.id,
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
      {view === 'menu' ? (
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Animated.View
            style={[styles.sheet, animatedStyle]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.handleArea} {...panHandlers}>
              <View style={styles.handle} />
            </View>
            <Text style={styles.title}>{t.menuTitle}</Text>

            <Pressable
              onPress={() => setView('report')}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              testID="quiz-menu-report"
            >
              <Ionicons name="flag-outline" size={20} color={COLORS.text} />
              <Text style={styles.rowLabel}>{t.reportQuestion}</Text>
            </Pressable>

            <Pressable
              onPress={handleShare}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              testID="quiz-menu-share"
            >
              <Ionicons name="share-social-outline" size={20} color={COLORS.text} />
              <Text style={styles.rowLabel}>{t.shareQuestion}</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      ) : (
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <View style={styles.sheet}>
            <View style={styles.handleStatic} />

            {phase === 'success' ? (
              <View style={styles.successBox}>
                <Text style={styles.title}>{t.reportSentTitle}</Text>
                <Text style={styles.subtitle}>{t.reportSentBody}</Text>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    styles.primaryButtonFull,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryButtonText}>{t.reportDone}</Text>
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
                        <Text style={styles.reasonLabel}>{t[r.labelKey]}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <TextInput
                  style={styles.commentInput}
                  placeholder={t.reportCommentPlaceholder}
                  placeholderTextColor={COLORS.placeholder}
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
                    style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                    disabled={phase === 'submitting'}
                  >
                    <Text style={styles.secondaryButtonText}>{t.reportCancel}</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSubmit}
                    disabled={!reason || phase === 'submitting'}
                    style={({ pressed }) => [
                      styles.primaryButton,
                      (!reason || phase === 'submitting') && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                    testID="quiz-report-submit"
                  >
                    {phase === 'submitting' ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>{t.reportSubmit}</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      )}
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
    gap: 10,
  },
  handleArea: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.handle,
  },
  handleStatic: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.handle,
    marginBottom: 8,
  },
  title: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.rowBackground,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rowLabel: {
    flex: 1,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
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
