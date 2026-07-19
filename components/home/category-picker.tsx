import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import type { ContentSnapshot } from '@/lib/content-cache';
import { localizeCategoryName } from '@/i18n/categories';
import type { SupportedLocale } from '@/hooks/use-locale';

interface Props {
  snapshot: ContentSnapshot | null;
  locale: SupportedLocale;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/**
 * Multi-select tree of categories and their subcategories. Stores the
 * selection as a flat set of leaf (subcategory) slugs — top-level rows
 * are convenience togglers that flip every leaf under them at once.
 */
export function CategoryPicker({ snapshot, locale, selected, onChange }: Props) {
  const tops = snapshot?.categories ?? [];
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  // Hide categories that have no questions yet — a checkbox that
  // resolves to an empty pool is just confusing.
  const visibleTops = useMemo(
    () =>
      tops
        .map((top) => {
          const subs = top.subcategories.filter((sub) =>
            (snapshot?.questions ?? []).some((q) => q.category_slug === sub.slug),
          );
          return { ...top, subcategories: subs };
        })
        .filter((top) => top.subcategories.length > 0),
    [tops, snapshot],
  );

  function toggleSub(slug: string) {
    const next = new Set(selected);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    onChange(next);
  }

  function toggleTop(top: { subcategories: { slug: string }[] }) {
    const subSlugs = top.subcategories.map((s) => s.slug);
    const allSelected = subSlugs.every((s) => selected.has(s));
    const next = new Set(selected);
    if (allSelected) {
      for (const s of subSlugs) next.delete(s);
    } else {
      for (const s of subSlugs) next.add(s);
    }
    onChange(next);
  }

  function toggleExpand(slug: string) {
    const next = new Set(expanded);
    if (next.has(slug)) next.delete(slug);
    else next.add(slug);
    setExpanded(next);
  }

  const allSubSlugs = visibleTops.flatMap((t) => t.subcategories.map((s) => s.slug));
  const allSelected = allSubSlugs.length > 0 && allSubSlugs.every((s) => selected.has(s));

  function toggleAll() {
    if (allSelected) onChange(new Set());
    else onChange(new Set(allSubSlugs));
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Pressable onPress={toggleAll} style={styles.allRow}>
        <Checkbox checked={allSelected} />
        <Text style={styles.allText}>All categories</Text>
      </Pressable>

      {visibleTops.map((top) => {
        const subSlugs = top.subcategories.map((s) => s.slug);
        const all = subSlugs.every((s) => selected.has(s));
        const some = !all && subSlugs.some((s) => selected.has(s));
        const isExpanded = expanded.has(top.slug);
        return (
          <View key={top.slug} style={styles.topBlock}>
            <View style={styles.topRow}>
              <Pressable onPress={() => toggleTop(top)} style={styles.topCheckTap}>
                <Checkbox checked={all} indeterminate={some} />
                <Text style={styles.topName} numberOfLines={1}>
                  {localizeCategoryName(top.slug, locale, top.name)}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => toggleExpand(top.slug)}
                hitSlop={12}
                style={styles.chevronTap}
              >
                <IconSymbol
                  name="chevron.right"
                  size={18}
                  color="#ffffff99"
                  style={isExpanded ? styles.chevronOpen : undefined}
                />
              </Pressable>
            </View>
            {isExpanded && (
              <View style={styles.subList}>
                {top.subcategories.map((sub) => {
                  const checked = selected.has(sub.slug);
                  return (
                    <Pressable
                      key={sub.slug}
                      onPress={() => toggleSub(sub.slug)}
                      style={styles.subRow}
                    >
                      <Checkbox checked={checked} small />
                      <Text style={styles.subName} numberOfLines={1}>
                        {localizeCategoryName(sub.slug, locale, sub.name)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

function Checkbox({
  checked,
  indeterminate,
  small,
}: {
  checked: boolean;
  indeterminate?: boolean;
  small?: boolean;
}) {
  const size = small ? 18 : 22;
  return (
    <View
      style={[
        cbStyles.box,
        { width: size, height: size, borderRadius: small ? 5 : 6 },
        checked && cbStyles.boxChecked,
        indeterminate && !checked && cbStyles.boxIndeterminate,
      ]}
    >
      {checked && <View style={cbStyles.checkmark} />}
      {!checked && indeterminate && <View style={cbStyles.dash} />}
    </View>
  );
}

const cbStyles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: '#ffffff66',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: '#7c5cff',
    borderColor: '#7c5cff',
  },
  boxIndeterminate: {
    borderColor: '#7c5cff',
  },
  checkmark: {
    width: 6,
    height: 10,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '45deg' }, { translateY: -1 }],
  },
  dash: {
    width: 8,
    height: 2,
    backgroundColor: '#7c5cff',
    borderRadius: 1,
  },
});

const styles = StyleSheet.create({
  scroll: {
    maxHeight: 360,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  allRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ffffff22',
    marginBottom: 4,
  },
  allText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  topBlock: {
    paddingVertical: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  topCheckTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  chevronTap: {
    padding: 4,
  },
  chevronOpen: {
    transform: [{ rotate: '90deg' }],
  },
  subList: {
    paddingLeft: 38,
    gap: 2,
    paddingBottom: 4,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingRight: 8,
  },
  subName: {
    color: '#ffffffd9',
    fontSize: 14,
    flexShrink: 1,
  },
});
