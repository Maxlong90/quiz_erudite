import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

/**
 * Picks ONE font size that makes every given string fit a known width.
 *
 * Why this exists instead of a hardcoded number: the size depends on the font
 * the device actually uses and on the device's width, and neither is knowable
 * here. `fontWeight: '900'` resolves to Roboto Black on Android but to San
 * Francisco Black on iOS, and SF is the wider of the two — a size computed from
 * Roboto's metrics overflows on an iPhone. Screen width varies as well, so the
 * usable width per card is not a constant either.
 *
 * So we measure on the device. Every candidate string is rendered once, off-screen
 * and unconstrained, at a reference size; `onTextLayout` reports its natural
 * width; the widest one decides the scale. All labels then share that single
 * size, which is what keeps the two mode cards typographically identical.
 *
 * `adjustsFontSizeToFit` is deliberately NOT used: combined with
 * numberOfLines={2} it breaks a word mid-way ("Классическ / ий"), and per-Text
 * it would give each label its own size.
 */
const REFERENCE_SIZE = 100; // measure big, scale down — keeps rounding error tiny

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

  const measured = candidates.every((c) => widths[c] != null);

  const size = useMemo(() => {
    if (!measured || availableWidth <= 0) return null;
    const widest = Math.max(...candidates.map((c) => widths[c]));
    if (widest <= 0) return null;
    const scale = (availableWidth / widest) * REFERENCE_SIZE;
    return Math.max(11, Math.min(maxSize, Math.floor(scale)));
  }, [measured, availableWidth, candidates, widths, maxSize]);

  /**
   * Render this next to the labels. It is positioned far off-screen so it never
   * affects layout and is never visible, but it is a real Text, so it is laid
   * out with the real font.
   */
  const probes = candidates.map((text) => (
    <Text
      key={`probe-${text}`}
      style={[styles.probe, { fontSize: REFERENCE_SIZE, fontWeight: weight }]}
      numberOfLines={1}
      onTextLayout={(e) => {
        const line = e.nativeEvent.lines?.[0];
        if (line?.width) onMeasured(text, line.width);
      }}
    >
      {text}
    </Text>
  ));

  return { size, probes };
}

const styles = StyleSheet.create({
  probe: {
    position: 'absolute',
    left: -10000,
    top: -10000,
    // No width constraint — we need the string's natural width.
    includeFontPadding: false,
  },
});
