import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { FQColors } from '@/constants/football-quiz/theme';

/**
 * Football Quiz backdrop. Three arts, all derived from the SAME stadium photo so
 * the app never looks like two different products:
 *  - 'home' — the sharp original, home screen only.
 *  - 'haze' — "light haze": blurred, desaturated, darkened. Every inner screen.
 *  - 'deep' — a much heavier blur for the in-level quiz screen, so the question
 *    and the four answers read cleanly. Mirrors Sport Quiz's variant="deep".
 *
 * The background is rendered OUTSIDE the SafeAreaView by each screen (it is an
 * absolute-fill layer), so it also paints under the status bar and the home
 * indicator instead of leaving a strip of the scaffold colour showing.
 */
export const FQ_BG_HOME = require('../../assets/football-quiz/backgrounds/fq-bg-home.jpg');
export const FQ_BG_HAZE = require('../../assets/football-quiz/backgrounds/fq-bg-haze.jpg');
export const FQ_BG_DEEP = require('../../assets/football-quiz/backgrounds/fq-bg-deep.jpg');

/** Keep in sync with APP_TEMPLATES['football-quiz'].scaffoldBg. */
export const BG_BASE = FQColors.bgBase;

export type FQBgVariant = 'home' | 'haze' | 'deep';

function moduleFor(v: FQBgVariant) {
  return v === 'home' ? FQ_BG_HOME : v === 'deep' ? FQ_BG_DEEP : FQ_BG_HAZE;
}

export function AppBackground({ variant = 'haze' }: { variant?: FQBgVariant }) {
  const isHome = variant === 'home';
  const base = variant === 'deep' ? FQColors.bgDeep : FQColors.bgBase;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: base }]} />
      <Image
        source={moduleFor(variant)}
        style={styles.img}
        contentFit="cover"
        cachePolicy="memory-disk"
        priority="high"
        transition={0}
      />
      {isHome && <View style={styles.topScrim} />}
    </View>
  );
}

const styles = StyleSheet.create({
  img: { width: '100%', height: '100%' },
  topScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '26%',
    backgroundColor: 'rgba(4,10,20,0.42)',
  },
});
