import { View } from 'react-native';

/**
 * The vertical breathing room between blocks on the two Coat of Arms gameplay
 * screens.
 *
 * WHY A COMPONENT AND NOT JUST `marginTop`
 * ----------------------------------------
 * Both screens used to push their answer grid down with a fixed
 * `styles.options.marginTop`. With no flexible child anywhere in the page, ALL the
 * leftover height then piled up at the bottom — visible even on a 393pt phone and
 * roughly half the screen in an iPad window. That dead band is a large part of
 * what App Review called "crowded / difficult to use" (Guideline 4).
 *
 * A sibling spacer View of height N is layout-identical to `marginTop: N` (Yoga
 * has no margin collapsing), so on a phone this changes nothing at all. But once
 * the window is genuinely tall, the same spacer can GROW instead — and a screen
 * with two growing spacers distributes its slack between the blocks rather than
 * dumping it below them.
 *
 * Both a gap AND a tail spacer are needed: growing only the tail just re-parks the
 * dead band, and growing only the gap leaves it at the bottom.
 *
 * Two traps encoded here:
 *  - `flexGrow`, never `flex`. `flex: 0` ALSO sets `flexBasis: 0` and
 *    `flexShrink: 1`, which is not the same thing and collapses the spacer.
 *  - the grown height is BOUNDED. An unbounded split puts ~280pt of air between
 *    the coat and the answers on a tall iPad window, which reads worse than the
 *    bug it replaces.
 */
export function FlexSpacer({
  flexible,
  height,
  grow,
  minHeight,
  maxHeight,
}: {
  /** Grow to fill slack (tall window, no reveal panel competing for space). */
  flexible: boolean;
  /** Fixed height when not flexible. This is the value that shipped. */
  height: number;
  /** Share of the slack to claim, relative to the screen's other spacers. */
  grow: number;
  minHeight?: number;
  maxHeight?: number;
}) {
  return (
    <View
      style={flexible ? { flexGrow: grow, minHeight, maxHeight } : { height }}
      pointerEvents="none"
    />
  );
}
