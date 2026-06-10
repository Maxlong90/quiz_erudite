import { Modal, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { AchievementBadge } from '@/components/achievements/achievement-badge';
import { useTranslation } from '@/hooks/use-translation';
import type { AchievementProgress } from '@/lib/achievements';

interface Props {
  visible: boolean;
  progress: AchievementProgress | null;
  onDismiss: () => void;
}

/**
 * Celebration popup shown right after a quiz when the player crosses
 * a new achievement threshold. Designed to be queued — the parent
 * shows one modal at a time and dismisses to advance through the
 * unlock list.
 */
export function AchievementUnlockModal({ visible, progress, onDismiss }: Props) {
  const { t } = useTranslation();
  if (!progress) return null;

  async function handleShare() {
    if (!progress) return;
    const message = t('achievements.share.text', {
      title: t(progress.def.titleKey),
      level: progress.isMaxed ? t('achievements.maxLevel') : String(progress.level),
    });
    try {
      await Share.share({ message });
    } catch {
      // user cancelled or platform refused — silent fallback is fine
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation?.()}>
          <Text style={styles.eyebrow}>{t('achievements.unlocked.title')}</Text>
          <View style={styles.badgeWrap}>
            <AchievementBadge progress={progress} size={108} />
          </View>
          <Text style={styles.levelLabel}>
            {progress.isMaxed
              ? t('achievements.maxLevel')
              : t('achievements.level', { n: progress.level })}
          </Text>
          <Text style={styles.title}>{t(progress.def.titleKey)}</Text>
          <Text style={styles.subtitle}>{t(progress.def.subtitleKey)}</Text>

          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.share, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.shareIcon}>📤</Text>
            <Text style={styles.shareText}>{t('achievements.unlocked.share')}</Text>
          </Pressable>
          <Pressable
            onPress={onDismiss}
            style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.6 }]}
          >
            <Text style={styles.continueText}>{t('achievements.unlocked.cta')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1f1949',
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 8,
  },
  eyebrow: {
    color: '#a78bff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  badgeWrap: {
    marginTop: 10,
    marginBottom: 4,
    shadowColor: '#7c5cff',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 10,
  },
  levelLabel: {
    color: '#a78bff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 4,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    color: '#ffffffaa',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  share: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 8,
  },
  shareIcon: {
    fontSize: 18,
  },
  shareText: {
    color: '#7c5cff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  continueBtn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  continueText: {
    color: '#ffffffcc',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
