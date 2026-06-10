import { Platform, Pressable, Share, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useTranslation } from '@/hooks/use-translation';
import type { Question } from '@/api/types';

const APP_BUNDLE_ID = 'com.quizzzes.erudite';
const IOS_APP_ID = '0000000000';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${APP_BUNDLE_ID}`;
const APP_STORE_URL = `https://apps.apple.com/app/id${IOS_APP_ID}`;

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
  const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;

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
