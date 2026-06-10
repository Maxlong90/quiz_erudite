import { useEffect, useRef } from 'react';
import { Animated, PanResponder } from 'react-native';

/**
 * Adds swipe-down-to-dismiss to a bottom-sheet modal. Returns an
 * Animated transform style to apply to the sheet container and a set
 * of `panHandlers` that should be spread on the drag-handle wrapper
 * (NOT the whole sheet — otherwise the scroll inside would fight the
 * drag).
 *
 * Drag of > 120px or a release velocity > 1.2 dismisses the sheet;
 * anything less springs back to rest.
 */
export function useSheetDrag(onClose: () => void, visible: boolean) {
  const translateY = useRef(new Animated.Value(0)).current;

  // When the modal mounts (visible flips to true), reset the offset
  // so a previously-dragged-out sheet shows fresh next time it opens.
  useEffect(() => {
    if (visible) translateY.setValue(0);
  }, [visible, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 1.2) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 8,
            tension: 60,
          }).start();
        }
      },
    }),
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    animatedStyle: { transform: [{ translateY }] },
  };
}
