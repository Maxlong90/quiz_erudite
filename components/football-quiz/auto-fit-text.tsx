import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

/**
 * Text that always fits its own box, on any screen, in any language, in
 * whatever font the platform actually resolves.
 *
 * Three bugs led to this component; all three came from computing what should
 * have been measured:
 *   1. adjustsFontSizeToFit + numberOfLines={2} makes RN break a WORD instead of
 *      shrinking the type ("Классическ / ий").
 *   2. A size derived from Roboto Black's metrics is wrong on iOS, where
 *      fontWeight '900' resolves to the wider San Francisco Black.
 *   3. Even measuring the string is not enough if the AVAILABLE width is
 *      computed by hand: subtracting paddings but forgetting the 2 dp border on
 *      each side and the letterSpacing cost ~6 dp, and the label clipped again.
 *
 * So both sides are measured on the device: the box reports its width through
 * onLayout, and the string reports its natural width through onTextLayout at a
 * large reference size. The ratio gives the size. Nothing is assumed about the
 * font, the screen or the surrounding styles.
 *
 * Wrap several labels in <FittedGroup> to make them share ONE size — that is
 * what keeps a row of buttons typographically consistent instead of each label
 * shrinking independently.
 */
const REFERENCE_SIZE = 100;
/** Absorbs sub-pixel rounding between layout and text measurement. */
const SAFETY_DP = 2;
/** Wide enough that a reference-size string never wraps or clamps against it. */
const PROBE_BOX = 20000;

type GroupApi = {
  report: (key: string, ratio: number) => void;
  /** Smallest size any member can take; null until at least one has measured. */
  size: number | null;
};

const FittedGroupContext = createContext<GroupApi | null>(null);

/**
 * Shares one font size across every AutoFitText inside it. Each child reports
 * the size IT could take; the group publishes the smallest, so no member
 * overflows and all of them match.
 */
export function FittedGroup({ children }: { children: ReactNode }) {
  const [sizes, setSizes] = useState<Record<string, number>>({});

  const report = useCallback((key: string, size: number) => {
    setSizes((prev) => (prev[key] === size ? prev : { ...prev, [key]: size }));
  }, []);

  const size = useMemo(() => {
    const values = Object.values(sizes);
    return values.length ? Math.min(...values) : null;
  }, [sizes]);

  const api = useMemo<GroupApi>(() => ({ report, size }), [report, size]);
  return <FittedGroupContext.Provider value={api}>{children}</FittedGroupContext.Provider>;
}

export function AutoFitText({
  children,
  maxFontSize,
  minFontSize = 11,
  style,
  lineHeightRatio = 1.14,
}: {
  children: string;
  maxFontSize: number;
  minFontSize?: number;
  style?: StyleProp<TextStyle>;
  lineHeightRatio?: number;
}) {
  const group = useContext(FittedGroupContext);
  const [boxWidth, setBoxWidth] = useState(0);
  const [naturalWidth, setNaturalWidth] = useState(0);

  // The size THIS label can take, given its own box and its own string.
  const own = useMemo(() => {
    if (boxWidth <= 0 || naturalWidth <= 0) return null;
    const usable = Math.max(0, boxWidth - SAFETY_DP);
    const scaled = Math.floor((usable / naturalWidth) * REFERENCE_SIZE);
    return Math.max(minFontSize, Math.min(maxFontSize, scaled));
  }, [boxWidth, naturalWidth, maxFontSize, minFontSize]);

  // Reporting is an effect, not a render-time call: setState during render of a
  // parent is invalid and would loop.
  const report = group?.report;
  useEffect(() => {
    if (report && own != null) report(children, own);
  }, [report, children, own]);

  // Inside a group everyone waits for the group's minimum, so the row is
  // uniform. Standalone, the label uses its own result.
  const resolved = group ? group.size : own;
  // Before the first measurement the label renders at its maximum. Rendering it
  // at the minimum instead would make every button flash tiny text, and in a
  // content-width container (a price chip, say) it would simply stay tiny.
  const fontSize = resolved ?? maxFontSize;

  return (
    <View style={styles.box} onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}>
      <View style={styles.probeBox} pointerEvents="none">
        <Text
          style={[style, { fontSize: REFERENCE_SIZE }]}
          numberOfLines={1}
          onTextLayout={(e) => {
            const w = e.nativeEvent.lines?.[0]?.width;
            if (w) setNaturalWidth(w);
          }}
        >
          {children}
        </Text>
      </View>

      <Text
        style={[style, { fontSize, lineHeight: Math.round(fontSize * lineHeightRatio) }]}
        numberOfLines={1}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Full width of whatever contains it — that measured width IS the budget,
  // borders and paddings of the parent already accounted for.
  box: { width: '100%' },
  probeBox: {
    position: 'absolute',
    left: -PROBE_BOX - 1000,
    top: -PROBE_BOX,
    width: PROBE_BOX,
    opacity: 0,
  },
});
