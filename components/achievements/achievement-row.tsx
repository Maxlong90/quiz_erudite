import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AchievementBadge } from '@/components/achievements/achievement-badge';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { useTranslation } from '@/hooks/use-translation';
import type { AchievementProgress } from '@/lib/achievements';
import type { EruditePalette } from '@/constants/theme';

interface Props {
  progress: AchievementProgress;
}

/** Single row of the achievements list on the Stats screen. */
export function AchievementRow({ progress }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { def, value, level, isMaxed, nextThreshold, ratio } = progress;

  const levelLabel = isMaxed
    ? t('achievements.maxLevel')
    : t('achievements.level', { n: level });

  // Bottom-right counter mirrors the reference: "value / nextThreshold"
  // while progressing, just the value once every threshold is crossed.
  const countLabel = isMaxed ? `${value}` : `${Math.min(value, nextThreshold ?? 0)}/${nextThreshold}`;

  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <AchievementBadge progress={progress} />
        <Text style={[styles.levelLabel, level === 0 && styles.levelLabelLocked]}>
          {levelLabel}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.title} numberOfLines={1}>
          {t(def.titleKey)}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {t(def.subtitleKey)}
        </Text>
        <View style={styles.barRow}>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.round(ratio * 100)}%`,
                  backgroundColor: level === 0 ? colors.borderStrong : colors.accent,
                },
              ]}
            />
          </View>
          <Text style={[styles.count, level === 0 && styles.countLocked]}>
            {countLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (c: EruditePalette) => StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  left: {
    width: 72,
    alignItems: 'center',
    gap: 6,
  },
  levelLabel: {
    color: c.accentSoft,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  levelLabelLocked: {
    color: c.textDisabled,
  },
  right: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: c.textFaint,
    fontSize: 13,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: c.borderSoft,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  count: {
    color: c.accentSoft,
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    minWidth: 48,
    textAlign: 'right',
  },
  countLocked: {
    color: c.textDisabled,
  },
});
