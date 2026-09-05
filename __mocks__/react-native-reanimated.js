/**
 * Test double for react-native-reanimated.
 *
 * Reanimated 4 removed the usable `react-native-reanimated/mock` entry point:
 * requiring it now pulls in the real `src/index` → `react-native-worklets`,
 * which tries to install native unpackers and throws
 * "Cannot read properties of undefined (reading 'loadUnpackers')" under Jest.
 * So every suite that renders an animated screen needs a hand-rolled mock.
 *
 * Jest picks this file up AUTOMATICALLY for the node module of the same name —
 * a root-level `__mocks__/<package>.js` needs no `jest.mock()` call — so all
 * component suites share this one definition instead of repeating it.
 *
 * Animations are no-ops: `Animated.View` is a plain `View` and every entering/
 * exiting animator is a chainable builder that records nothing. Children render
 * IMMEDIATELY and at full opacity, which is what lets tests assert on what a
 * reveal puts on screen without pumping timers.
 */
const { View, Text, ScrollView, Image, FlatList } = require('react-native');

/**
 * Entering/exiting animators are used fluently in app code —
 * `FadeIn.delay(900).duration(600)`, `FadeInUp.duration(900).easing(...)`.
 * Every method has to return something chainable, so hand back the same object.
 */
function createAnimationBuilder() {
  const builder = {};
  const chain = () => builder;
  for (const method of [
    'delay',
    'duration',
    'easing',
    'springify',
    'damping',
    'mass',
    'stiffness',
    'withInitialValues',
    'withCallback',
    'randomDelay',
    'reduceMotion',
    'build',
  ]) {
    builder[method] = chain;
  }
  return builder;
}

/** Same fluent shape, but usable as `Layout`/`LinearTransition` too. */
const animationBuilders = [
  'FadeIn',
  'FadeInUp',
  'FadeInDown',
  'FadeInLeft',
  'FadeInRight',
  'FadeOut',
  'FadeOutUp',
  'FadeOutDown',
  'SlideInRight',
  'SlideInLeft',
  'SlideOutRight',
  'SlideOutLeft',
  'ZoomIn',
  'ZoomOut',
  'LinearTransition',
  'Layout',
  'CurvedTransition',
  'FadingTransition',
];

const mock = {};

for (const name of animationBuilders) {
  Object.defineProperty(mock, name, {
    // A getter so each access starts a fresh chain, mirroring the real API
    // where `FadeIn.delay(x)` does not mutate a shared singleton.
    get: () => createAnimationBuilder(),
    enumerable: true,
  });
}

// `Animated.View` and friends: forward every prop (style, testID, children) to
// the plain RN component so queries by testID keep working.
const Animated = {
  View,
  Text,
  ScrollView,
  Image,
  FlatList,
  createAnimatedComponent: (Component) => Component,
};

const Easing = {
  linear: (t) => t,
  ease: (t) => t,
  quad: (t) => t,
  cubic: (t) => t,
  poly: () => (t) => t,
  sin: (t) => t,
  circle: (t) => t,
  exp: (t) => t,
  elastic: () => (t) => t,
  back: () => (t) => t,
  bounce: (t) => t,
  bezier: () => ({ factory: () => (t) => t }),
  bezierFn: () => (t) => t,
  in: (fn) => fn,
  out: (fn) => fn,
  inOut: (fn) => fn,
};

// Timing helpers resolve to their target value immediately and invoke any
// completion callback, so `withDelay(500, withTiming(1))` settles synchronously.
const finish = (callback) => {
  if (typeof callback === 'function') callback(true);
};

module.exports = {
  __esModule: true,
  default: Animated,
  ...mock,
  Animated,
  Easing,
  useSharedValue: (initial) => ({ value: initial }),
  useAnimatedStyle: (factory) => {
    try {
      return factory();
    } catch {
      return {};
    }
  },
  useDerivedValue: (factory) => ({ value: factory() }),
  useAnimatedRef: () => ({ current: null }),
  useAnimatedScrollHandler: () => () => {},
  withTiming: (toValue, _config, callback) => {
    finish(callback);
    return toValue;
  },
  withSpring: (toValue, _config, callback) => {
    finish(callback);
    return toValue;
  },
  withDelay: (_delay, animation) => animation,
  withRepeat: (animation) => animation,
  withSequence: (...animations) => animations[animations.length - 1],
  cancelAnimation: () => {},
  runOnJS: (fn) => fn,
  runOnUI: (fn) => fn,
  interpolate: (value) => value,
  interpolateColor: (_value, _input, output) => output[0],
  Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
  createAnimatedComponent: (Component) => Component,
};
