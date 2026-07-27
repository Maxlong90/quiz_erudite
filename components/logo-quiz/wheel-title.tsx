import { Fragment } from 'react';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

/**
 * A stylised "Wheel of Fortune" wordmark that echoes the bitmap LogoQuiz title
 * (assets/logo-quiz/title.png): fat rounded letters, a festive top-to-bottom
 * colour gradient (cyan → blue → pink → gold), a thick rounded WHITE outline, and
 * a soft drop shadow. The bitmap's exact font can't be reused, so this recreates
 * its VISUAL language with SVG text (real stroke outline + gradient fill) instead
 * of the previous plain <Text>. Localised labels are split onto up to two balanced
 * lines — mirroring the two-line logo — so the type stays large in every language.
 */

const TITLE_GRADIENT_ID = 'wheelTitleGrad';
/** Cyan → blue → pink → gold, matching the title.png palette. */
const TITLE_STOPS = ['#3FC6FF', '#6A7CFF', '#FF5CAA', '#FFC93C'] as const;

/** Split a phrase onto two lines at the word boundary that best balances length. */
function splitBalanced(text: string): string[] {
  const words = text.trim().split(/\s+/);
  if (words.length <= 1) return [text.trim()];
  let bestAt = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ').length;
    const b = words.slice(i).join(' ').length;
    const diff = Math.abs(a - b);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestAt = i;
    }
  }
  return [words.slice(0, bestAt).join(' '), words.slice(bestAt).join(' ')];
}

export function WheelTitle({ text, width }: { text: string; width: number }) {
  const lines = splitBalanced(text);
  const maxChars = Math.max(1, ...lines.map((l) => l.length));
  // Fit the widest line into ~92% of the given width (≈0.6 em per bold glyph),
  // clamped to a sensible on-screen range.
  const fontSize = Math.max(20, Math.min(46, (width * 0.92) / (maxChars * 0.6)));
  const stroke = fontSize * 0.13;
  const lineHeight = fontSize * 1.04;
  const topPad = stroke + fontSize * 0.12;
  const height = topPad + fontSize + (lines.length - 1) * lineHeight + fontSize * 0.42;
  const cx = width / 2;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={TITLE_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
          {TITLE_STOPS.map((color, i) => (
            <Stop key={i} offset={i / (TITLE_STOPS.length - 1)} stopColor={color} stopOpacity="1" />
          ))}
        </LinearGradient>
      </Defs>

      {lines.map((line, k) => {
        const baseline = topPad + fontSize + k * lineHeight;
        return (
          <Fragment key={k}>
            {/* Soft drop shadow. */}
            <SvgText
              x={cx}
              y={baseline + fontSize * 0.06}
              fill="#3A2F8A"
              fillOpacity={0.28}
              fontSize={fontSize}
              fontWeight="900"
              textAnchor="middle"
            >
              {line}
            </SvgText>
            {/* Thick rounded white outline. */}
            <SvgText
              x={cx}
              y={baseline}
              fill="#FFFFFF"
              stroke="#FFFFFF"
              strokeWidth={stroke}
              strokeLinejoin="round"
              fontSize={fontSize}
              fontWeight="900"
              textAnchor="middle"
            >
              {line}
            </SvgText>
            {/* Festive gradient fill on top. */}
            <SvgText
              x={cx}
              y={baseline}
              fill={`url(#${TITLE_GRADIENT_ID})`}
              fontSize={fontSize}
              fontWeight="900"
              textAnchor="middle"
            >
              {line}
            </SvgText>
          </Fragment>
        );
      })}
    </Svg>
  );
}
