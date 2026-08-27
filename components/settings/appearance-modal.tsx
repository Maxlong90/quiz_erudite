import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useSheetDrag } from '@/hooks/use-sheet-drag';
import { useTranslation } from '@/hooks/use-translation';
import type { ThemePref } from '@/hooks/use-theme-pref';
import type { StringKey } from '@/i18n/strings';

const OPTIONS: {
  value: ThemePref;
  labelKey: StringKey;
  icon: React.ComponentProps<typeof IconSymbol>['name'];
}[] = [
  { value: 'dark', labelKey: 'settings.theme.dark', icon: 'moon.fill' },
  { value: 'light', labelKey: 'settings.theme.light', icon: 'sun.max.fill' },
];

interface Props {
  visible: boolean;
  selected: ThemePref;
  onClose: () => void;
  onPick: (theme: ThemePref) => void;
}

/**
 * Bottom-sheet appearance switcher, matching the visual style of the language
 * modal (handle on top, dark purple sheet, rounded row tiles with a check on
 * the active option — light vs dark).
 */
export function AppearanceModal({ visible, selected, onClose, onPick }: Props) {
  const { t } = useTranslation();
  const { panHandlers, animatedStyle } = useSheetDrag(onClose, visible);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View style={[styles.sheet, animatedStyle]} onStartShouldSetResponder={() => true}>
          <View style={styles.handleArea} {...panHandlers}>
            <View style={styles.handle} />
          </View>
          <Text style={styles.title}>{t('settings.appearanceModal.title')}</Text>

          {OPTIONS.map((opt) => {
            const active = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => {
                  onPick(opt.value);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.row,
                  active && styles.rowActive,
                  pressed && { opacity: 0.85 },
                ]}
                testID={`theme-modal-${opt.value}`}
              >
                <IconSymbol name={opt.icon} size={22} color={active ? '#fff' : '#a78bff'} />
                <Text style={[styles.label, active && styles.labelActive]}>
                  {t(opt.labelKey)}
                </Text>
                {active && <View style={styles.check} />}
              </Pressable>
            );
          })}
        </Animated.View>
      </Pressable>
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
    backgroundColor: '#1f1949',
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
    backgroundColor: '#ffffff33',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#ffffff0d',
    borderWidth: 1,
    borderColor: '#ffffff1f',
  },
  rowActive: {
    backgroundColor: '#7c5cff33',
    borderColor: '#7c5cff',
  },
  label: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  labelActive: {
    color: '#fff',
  },
  check: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7c5cff',
  },
});
