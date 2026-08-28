import { StyleSheet, View } from 'react-native';
import Svg, { ClipPath, Defs, Path, Rect } from 'react-native-svg';

import type { SupportedLocale } from '@/hooks/use-locale';

// Aspect ratio (width / height) per flag so each renders in its true proportions:
// the Union Jack is 2:1, Russia, Spain and France are 3:2. English maps to the
// Union Jack to match the main app's language picker.
const RATIO: Record<SupportedLocale, number> = { en: 2, es: 1.5, ru: 1.5, fr: 1.5 };

/**
 * Small vector flag chip for the currently selected language. Drawn with
 * react-native-svg (not emoji) so it renders identically on Android, where
 * regional-indicator flag emoji are not supported by the system font.
 */
export function Flag({ locale, height = 18 }: { locale: SupportedLocale; height?: number }) {
  const ratio = RATIO[locale];
  const width = Math.round(height * ratio);
  // viewBox is 60 wide; its height follows the flag's own ratio.
  const vbHeight = 60 / ratio;

  return (
    <View style={[styles.frame, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 60 ${vbHeight}`}>
        {locale === 'ru' && <RussiaFlag />}
        {locale === 'es' && <SpainFlag />}
        {locale === 'en' && <UnionJack />}
        {locale === 'fr' && <FrenchFlag />}
      </Svg>
    </View>
  );
}

// Three equal horizontal bands: white / blue / red (viewBox 60×40).
function RussiaFlag() {
  return (
    <>
      <Rect x={0} y={0} width={60} height={40} fill="#ffffff" />
      <Rect x={0} y={13.333} width={60} height={13.334} fill="#0039A6" />
      <Rect x={0} y={26.667} width={60} height={13.333} fill="#D52B1E" />
    </>
  );
}

// Red / yellow / red horizontal bands (1:2:1), coat of arms omitted (viewBox 60×40).
function SpainFlag() {
  return (
    <>
      <Rect x={0} y={0} width={60} height={40} fill="#AA151B" />
      <Rect x={0} y={10} width={60} height={20} fill="#F1BF00" />
    </>
  );
}

// Three equal vertical bands: blue / white / red (viewBox 60×40).
function FrenchFlag() {
  return (
    <>
      <Rect x={0} y={0} width={20} height={40} fill="#0055A4" />
      <Rect x={20} y={0} width={20} height={40} fill="#FFFFFF" />
      <Rect x={40} y={0} width={20} height={40} fill="#EF4135" />
    </>
  );
}

// Canonical minimal Union Jack construction (viewBox 60×30). The clip path
// counter-changes the diagonal St Patrick saltire into the correct quadrants.
function UnionJack() {
  return (
    <>
      <Defs>
        <ClipPath id="uk-diagonals">
          <Path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
        </ClipPath>
      </Defs>
      <Rect x={0} y={0} width={60} height={30} fill="#012169" />
      <Path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth={6} />
      <Path
        d="M0,0 L60,30 M60,0 L0,30"
        clipPath="url(#uk-diagonals)"
        stroke="#C8102E"
        strokeWidth={4}
      />
      <Path d="M30,0 V30 M0,15 H60" stroke="#ffffff" strokeWidth={10} />
      <Path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth={6} />
    </>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 3,
    overflow: 'hidden',
    // Hairline outline so the white bands stay legible on light/gold surfaces.
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.18)',
  },
});
