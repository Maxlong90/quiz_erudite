import { Platform, Pressable, Share, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useContentCache } from '@/hooks/use-content-cache';
import { useTranslation } from '@/hooks/use-translation';
import { getStoreLinks } from '@/lib/store-links';
import type { Question } from '@/api/types';

interface Props {
  question: Question;
}

/**
 * Header-button companion to the report flag: lets the player send the
 * current question + correct answer to a friend via the system share
 * sheet. Always available — recipients see the answer regardless of
 * the sender's progress, so no spoiler check is needed.
 */
export function ShareQuestionButton({ question }: Props) {
  const { t } = useTranslation();
  const { snapshot } = useContentCache();
  const { storeUrl } = getStoreLinks(snapshot?.app, Platform.OS);

  async function handleShare() {
    const correct = question.options[question.correct_option] ?? '';
    const lines = [
      `"${question.question}"`,
      '',
      `✅ ${correct}`,
    ];
    if (question.explanation) {
      lines.push('', question.explanation.trim());
    }
    lines.push('', t('shareQuestion.footer', { url: storeUrl }));

    try {
      await Share.share({ message: lines.join('\n') });
    } catch {
      // user cancelled — nothing to do
    }
  }

  return (
    <Pressable
      onPress={handleShare}
      hitSlop={12}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessibilityLabel={t('shareQuestion.helper')}
      testID="share-question-button"
    >
      <IconSymbol name="square.and.arrow.up" size={20} color="#ffffffcc" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 6,
  },
  pressed: {
    opacity: 0.5,
  },
});
