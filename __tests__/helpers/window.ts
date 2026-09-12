/**
 * Pinning the window size a render test lays out at.
 *
 * WHY EVERY LAYOUT TEST NEEDS THIS
 * --------------------------------
 * React Native's jest preset hard-codes the window to 750 x 1334 pt
 * (node_modules/@react-native/jest-preset/jest/mocks/NativeModules.js), and
 * `useWindowDimensions` is mocked nowhere in this repo. 750 x 1334 is NOT a phone
 * size — it is above the 480 x 960 gate in hooks/use-responsive.ts — so a render
 * test that does not pin the window silently exercises the WIDE branch.
 *
 * That matters because the Coat of Arms adaptive-layout work is contractually
 * "phone layout unchanged". A suite that drifts onto the wide branch stops
 * covering the very path the change promises not to touch, and it does so without
 * a single failing assertion. Pin the window and the coverage is explicit.
 *
 * `useWindowDimensions` reads `Dimensions.get('window')` inside its `useState`
 * INITIALISER, so the spy has to be installed BEFORE `render()` — call this from
 * `beforeEach`, not from inside a test body after mounting.
 *
 * Living under __tests__/helpers/ keeps it out of jest's `testMatch` glob, which
 * collects only files ending in `.test.ts` / `.test.tsx`.
 */
import { Dimensions } from 'react-native';

/** iPhone 14/15/16 base — the reference phone the screens were designed on. */
export const PHONE_WINDOW = { width: 393, height: 852 } as const;
/** iPad Air 11-inch portrait — the device App Review rejected the build on. */
export const IPAD_WINDOW = { width: 820, height: 1180 } as const;

/**
 * Force `Dimensions.get('window')` — and therefore `useWindowDimensions()` — to
 * report this size for the rest of the test. Restored by jest's `restoreMocks`
 * between tests where configured; call `unpinWindow()` in `afterEach` otherwise.
 */
export function pinWindow(width: number, height: number): void {
  const realGet = jest.requireActual('react-native').Dimensions.get;
  jest.spyOn(Dimensions, 'get').mockImplementation((dim: string) => {
    if (dim === 'window') return { width, height, scale: 3, fontScale: 1 };
    // Anything asking for the physical SCREEN still gets the real mock value —
    // only the window is being resized here.
    return realGet.call(Dimensions, dim);
  });
}

/** Undo pinWindow(). */
export function unpinWindow(): void {
  (Dimensions.get as unknown as jest.SpyInstance).mockRestore?.();
}
