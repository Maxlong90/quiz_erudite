/**
 * Sport Quiz — the answer-reveal phasing contract.
 *
 * After a correct pick the wrong options fade out while the correct one glides up
 * under the question; the Explanation must be at FULL opacity on the frame that
 * glide lands. Both quiz screens originally delayed the fade by the whole MOVE_MS,
 * so the text only STARTED appearing as the answer parked and the player sat
 * through a short dead beat with nothing moving on screen.
 *
 * These timings cannot be asserted through the screens themselves: the global
 * reanimated double (`__mocks__/react-native-reanimated.js`) turns
 * `FadeIn.delay(x).duration(y)` into a chainable no-op that records nothing, by
 * design, so every reveal renders instantly in tests. The phasing therefore lives
 * in pure constants and is locked here instead — which is also what keeps the
 * Classic quiz and Sports Legends from drifting apart, since both import these.
 */
import {
  EXPLANATION_DELAY_MS,
  FADE_MS,
  MOVE_MS,
  UI_FADE_MS,
} from '@/lib/sport-quiz/reveal-timing';

describe('explanation is fully revealed as the answer lands', () => {
  it('finishes its fade exactly when the glide ends, not when it starts', () => {
    expect(EXPLANATION_DELAY_MS + UI_FADE_MS).toBe(MOVE_MS);
  });

  it('starts the fade BEFORE the answer parks, so the two overlap', () => {
    // The regression this guards: delaying by the full MOVE_MS (the old value)
    // would make the block start where it should have finished.
    expect(EXPLANATION_DELAY_MS).toBeLessThan(MOVE_MS);
    expect(EXPLANATION_DELAY_MS).toBeGreaterThan(0);
  });

  it('keeps the fade short enough to sit inside the glide', () => {
    // A fade longer than the glide would have to start before the answer even
    // begins moving, which reads as the explanation pre-empting the reveal.
    expect(UI_FADE_MS).toBeLessThan(MOVE_MS);
  });
});

describe('the surrounding choreography is unchanged', () => {
  it('keeps the glide at its deliberate, operator-approved pace', () => {
    // Guards against "fixing" a late explanation by speeding the answer up.
    expect(MOVE_MS).toBe(1700);
  });

  it('clears the wrong options well before the answer parks', () => {
    expect(FADE_MS).toBeLessThan(MOVE_MS);
  });
});
