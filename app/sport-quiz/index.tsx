import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppBackground } from '@/components/sport-quiz/app-background';
import { GlassPillButton } from '@/components/sport-quiz/ui';
import { useSQLabels } from '@/constants/sport-quiz/labels';

/**
 * Sport Quiz home. Logo-Quiz-style vertical stack of three glass pill buttons —
 * Play, Shop, Settings — sitting a little above centre over the colourful sports
 * backdrop. The locked "Aqua Neon Glass" look (home design variant 1).
 */
export default function SportQuizWelcome() {
  const t = useSQLabels();
  return (
    <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
      <AppBackground variant="color" />
      <StatusBar style="light" />

      <View style={styles.center}>
        <View style={styles.topSpacer} />
        <View style={styles.actions}>
          <GlassPillButton icon="play" label={t.play} fontSize={34} onPress={() => router.push('/sport-quiz/play')} />
          <GlassPillButton icon="bag-handle" label={t.shop} fontSize={30} onPress={() => router.push('/sport-quiz/shop')} />
          <GlassPillButton icon="settings" label={t.settings} fontSize={27} onPress={() => router.push('/sport-quiz/settings')} />
        </View>
        <View style={styles.bottomSpacer} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: 'transparent' },
  center: { flex: 1, alignItems: 'center', paddingHorizontal: 26 },
  topSpacer: { flex: 1 },
  bottomSpacer: { flex: 1.5 },
  actions: { width: '100%', alignItems: 'stretch', gap: 16 },
});
