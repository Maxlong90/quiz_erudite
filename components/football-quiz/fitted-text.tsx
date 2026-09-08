import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type TextStyle } from 'react-native';

/**
 * Picks ONE font size that makes every given string fit a known width.
 *
 * Why measure instead of computing: the answer depends on the font the device
 * actually uses and on its screen width, and neither is knowable up front.
 * `fontWeight: '900'` resolves to Roboto Black on Android but San Francisco
 * Black on iOS, and SF is wider — a size derived from Roboto's metrics overflows
 * on an iPhone.
 *
 * How it works: each candidate is rendered once, off-screen, at a large
 * reference size, and `onTextLayout` reports the width the line actually took.
 * The widest candidate sets the scale, and every label then shares that single
 * size — which is what keeps the two mode cards typographically identical.
 *
 * THE MEASURING BOX MUST BE WIDER THAN THE STRING. An absolutely-positioned
 * Text is still bounded by its parent, so measuring inside a screen-width
 * container returns the screen width once the reference-size string exceeds it —
 * producing a scale that is too generous and a label that then gets clipped.
 * Hence PROBE_BOX below, which is deliberately absurd.
 *
 * `adjustsFontSizeToFit` is deliberately NOT used: with numberOfLines={2} it
 * breaks a word mid-way ("Классическ / ий"), and per-Text it would give each
 * label its own size.
 */
const REFERENCE_SIZE = 100;
/** Wide enough that a 100 dp string never wraps or clamps against it. */
const PROBE_BOX = 20000;
/**
 * Used until the measurement lands (and if a platform never fires
 * onTextLayout). Intentionally pessimistic: 0.75 em per character is wider than
 * any of our scripts actually need, so this can only ever under-shoot.
 */
function conservativeSize(candidates: string[], availableWidth: number, maxSize: number) {
  const longest = candidates.reduce((n, c) => Math.max(n, c.length), 1);
  return Math.max(11, Math.min(maxSize, Math.floor(availableWidth / (longest * 0.75))));
}

export function useFittedFontSize(
  candidates: string[],
  availableWidth: number,
  maxSize: number,
  weight: TextStyle['fontWeight'] = '900',
) {
  const [widths, setWidths] = useState<Record<string, number>>({});

  const onMeasured = useCallback((text: string, width: number) => {
    setWidths((prev) => (prev[text] === width ? prev : { ...prev, [text]: width }));
  }, []);

  const size = useMemo(() => {
    if (availableWidth <= 0) return null;
    const measured = candidates.every((c) => widths[c] > 0);
    if (!measured) return conservativeSize(candidates, availableWidth, maxSize);
    const widest = Math.max(...candidates.map((c) => widths[c]));
    const scale = (availableWidth / widest) * REFERENCE_SIZE;
    return Math.max(11, Math.min(maxSize, Math.floor(scale)));
  }, [availableWidth, candidates, widths, maxSize]);

  const probes = (
    <View style={styles.probeBox} pointerEvents="none">
      {candidates.map((text) => (
        <Text
          key={`probe-${text}`}
          style={{ fontSize: REFERENCE_SIZE, fontWeight: weight }}
          numberOfLines={1}
          onTextLayout={(e) => {
            const line = e.nativeEvent.lines?.[0];
            if (line?.width) onMeasured(text, line.width);
          }}
        >
          {text}
        </Text>
      ))}
    </View>
  );

  return { size, probes };
}

const styles = StyleSheet.create({
  probeBox: {
    position: 'absolute',
    left: -PROBE_BOX - 1000,
    top: -PROBE_BOX,
    width: PROBE_BOX,
    opacity: 0,
  },
});
