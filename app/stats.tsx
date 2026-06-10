import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AchievementRow } from '@/components/achievements/achievement-row';
import { BottomBar } from '@/components/bottom-bar';
import { useContentCache } from '@/hooks/use-content-cache';
import { useTranslation } from '@/hooks/use-translation';
import { localizeCategoryName } from '@/i18n/categories';
import {
  computeProgress,
  gatherMetrics,
  type AchievementProgress,
} from '@/lib/achievements';
import { getMistakeIds } from '@/lib/mistakes';
import { getAllSeenIds, getStats } from '@/lib/quiz-stats';

const GRADIENT = ['#1a1a47', '#2d1f5e', '#1a1a47'] as const;

interface PerSubject {
  /** Top-level slug, used to navigate / for keying. */
  slug: string;
  name: string;
  /** Distinct questions the player has been served from this subject. */
  seen: number;
  /** Total questions available in this subject right now. */
  total: number;
}

export default function StatsScreen() {
  const { t, locale } = useTranslation();
  const { snapshot } = useContentCache();
  const [quizzesTaken, setQuizzesTaken] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [seenIds, setSeenIds] = useState<Set<number>>(() => new Set());
  const [mistakeIds, setMistakeIds] = useState<number[]>([]);
  const [achievements, setAchievements] = useState<AchievementProgress[]>([]);

  // Re-pull stats every time the screen comes into focus, not just on
  // first mount. Without this, navigating Quiz → Home → Stats via the
  // bottom bar can show stale totals because the Stats component may
  // not actually remount between visits.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([
        getStats(),
        getAllSeenIds(),
        getMistakeIds(),
        gatherMetrics(snapshot),
      ])
        .then(([stats, seen, mistakes, metrics]) => {
          if (cancelled) return;
          setQuizzesTaken(stats.quizzesTaken);
          setTotalSeconds(stats.totalSeconds);
          setTotalQuestions(stats.totalQuestions);
          setTotalCorrect(stats.totalCorrect);
          setSeenIds(seen);
          setMistakeIds(mistakes);
          setAchievements(computeProgress(metrics));
        })
        .catch(() => {
          // ignore — empty state will render
        });
      return () => {
        cancelled = true;
      };
    }, [snapshot]),
  );

  // Aggregate per top-level subject: sum the seen counts of every leaf
  // (subcategory) that belongs to the parent, divide by the total
  // questions available in those leaves.
  const subjects = useMemo<PerSubject[]>(() => {
    if (!snapshot) return [];
    return snapshot.categories
      .map((top) => {
        const slugSet = new Set<string>([top.slug, ...top.subcategories.map((s) => s.slug)]);
        // Walk the snapshot questions once per subject: a question
        // belongs to this subject if its category slug is the parent or
        // any of its leaves. `seen` counts those whose id is in the
        // global seen set — so mixed-category modes attribute correctly.
        let total = 0;
        let seen = 0;
        for (const q of snapshot.questions) {
          if (q.category_slug && slugSet.has(q.category_slug)) {
            total++;
            if (seenIds.has(q.id)) seen++;
          }
        }
        return {
          slug: top.slug,
          name: localizeCategoryName(top.slug, locale, top.name),
          seen,
          total,
        };
      })
      .filter((s) => s.total > 0);
  }, [snapshot, seenIds, locale]);

  const totalSeenAcrossSubjects = subjects.reduce((acc, s) => acc + s.seen, 0);
  const totalAvailableAcrossSubjects = subjects.reduce((acc, s) => acc + s.total, 0);

  const accuracy = totalQuestions > 0
    ? Math.round((totalCorrect / totalQuestions) * 100)
    : 0;

  const avgSecondsPerQuestion = totalQuestions > 0
    ? Math.round(totalSeconds / totalQuestions)
    : 0;

  const isEmpty = quizzesTaken === 0 && totalSeenAcrossSubjects === 0;

  return (
    <LinearGradient colors={GRADIENT} locations={[0, 0.55, 1]} style={styles.flex}>
      <StatusBar style="light" />
      <SafeAreaView style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('stats.title')}</Text>
        </View>

        {isEmpty ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>{t('stats.empty.title')}</Text>
            <Text style={styles.emptySubtitle}>{t('stats.empty.subtitle')}</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            style={styles.flex}
          >
            <Text style={styles.sectionLabel}>{t('stats.totalActivity')}</Text>
            <View style={styles.card}>
              <Row label={t('stats.quizzesTaken')} value={String(quizzesTaken)} />
              <Divider />
              <Row label={t('stats.totalTime')} value={formatMinutes(totalSeconds)} />
              <Divider />
              <Row label={t('stats.timePerQuestion')} value={formatSeconds(avgSecondsPerQuestion)} />
              <Divider />
              <Row label={t('stats.accuracy')} value={`${accuracy}%`} accent={accuracy >= 70 ? '#22c55e' : accuracy >= 40 ? '#f59e0b' : '#ef4444'} />
              <Divider />
              <Row label={t('stats.correct')} value={`${totalCorrect} / ${totalQuestions}`} />
              <Divider />
              <Row label={t('stats.mistakes')} value={String(mistakeIds.length)} />
            </View>

            <Text style={styles.sectionLabel}>{t('stats.viewedBySubject')}</Text>
            <View style={styles.card}>
              <View style={styles.tableHeader}>
                <Text style={[styles.th, styles.thSubject]}>{t('stats.headerSubject')}</Text>
                <Text style={[styles.th, styles.thCell]}>{t('stats.headerViewed')}</Text>
                <Text style={[styles.th, styles.thCell]}>{t('stats.headerTotal')}</Text>
              </View>
              {subjects.map((s, idx) => (
                <View key={s.slug}>
                  {idx > 0 && <Divider />}
                  <View style={styles.tableRow}>
                    <Text style={[styles.td, styles.tdSubject]} numberOfLines={2}>
                      {s.name}
                    </Text>
                    <Text style={[styles.td, styles.tdCell]}>{s.seen}</Text>
                    <Text style={[styles.td, styles.tdCell]}>{s.total}</Text>
                  </View>
                </View>
              ))}
              <Divider />
              <View style={styles.tableRow}>
                <Text style={[styles.td, styles.tdSubject, styles.totalLabel]}>
                  {t('stats.totalRow')}
                </Text>
                <Text style={[styles.td, styles.tdCell, styles.totalLabel]}>
                  {totalSeenAcrossSubjects}
                </Text>
                <Text style={[styles.td, styles.tdCell, styles.totalLabel]}>
                  {totalAvailableAcrossSubjects}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>{t('stats.performanceBySubject')}</Text>
            <View style={styles.card}>
              {subjects.map((s, idx) => {
                const ratio = s.total > 0 ? Math.min(1, s.seen / s.total) : 0;
                const pct = Math.round(ratio * 100);
                return (
                  <View key={s.slug}>
                    {idx > 0 && <View style={styles.perfSpacer} />}
                    <View style={styles.perfRow}>
                      <Text style={styles.perfName} numberOfLines={1}>{s.name}</Text>
                      <Text style={styles.perfPct}>{pct}%</Text>
                    </View>
                    <View style={styles.perfBarTrack}>
                      <View style={[styles.perfBarFill, { width: `${pct}%` }]} />
                    </View>
                    <Text style={styles.perfMeta}>
                      {s.seen} / {s.total}
                    </Text>
                  </View>
                );
              })}
            </View>

            <Text style={styles.sectionLabel}>{t('achievements.title')}</Text>
            <View style={styles.card}>
              {achievements.map((p, idx) => (
                <View key={p.def.id}>
                  {idx > 0 && <Divider />}
                  <AchievementRow progress={p} />
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <BottomBar current="stats" />
      </SafeAreaView>
    </LinearGradient>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, accent && { color: accent }]}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function formatMinutes(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSeconds(sec: number): string {
  return `${sec}s`;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: '#ffffffaa',
    fontSize: 14,
    textAlign: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 4,
  },
  sectionLabel: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#ffffff0f',
    borderRadius: 18,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#ffffff14',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowLabel: {
    color: '#ffffffd9',
    fontSize: 15,
  },
  rowValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#ffffff1f',
    marginHorizontal: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff1f',
  },
  th: {
    color: '#ffffff99',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  thSubject: {
    flex: 2,
  },
  thCell: {
    flex: 1,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  td: {
    color: '#ffffffd9',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  tdSubject: {
    flex: 2,
  },
  tdCell: {
    flex: 1,
    textAlign: 'right',
    fontWeight: '600',
    color: '#fff',
  },
  totalLabel: {
    color: '#fff',
    fontWeight: '800',
  },
  perfRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  perfName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  perfPct: {
    color: '#a78bff',
    fontSize: 14,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  perfBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff1f',
    marginHorizontal: 16,
    overflow: 'hidden',
  },
  perfBarFill: {
    height: '100%',
    backgroundColor: '#7c5cff',
    borderRadius: 3,
  },
  perfMeta: {
    color: '#ffffff99',
    fontSize: 12,
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 14,
    fontVariant: ['tabular-nums'],
  },
  perfSpacer: {
    height: 4,
  },
});
