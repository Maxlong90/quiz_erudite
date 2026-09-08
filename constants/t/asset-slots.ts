import type { ImageSourcePropType } from 'react-native';

/**
 * The configurable template's image slots: every bundled picture the `/t`
 * screens can draw, and the only place their paths are written down.
 *
 * WHY IMAGES DO NOT WORK LIKE COLOURS
 * -----------------------------------
 * The palette arrives at RUNTIME (lib/theme/), because ten hex strings fit in a
 * ~600-byte conditional GET. Artwork cannot: React Native has no dynamic
 * require, so Metro has to see a string literal at the call site to bundle a
 * file at all. There is no version of "fetch the operator's onboarding art"
 * that ends in a `require()`.
 *
 * So the delivery stage moves instead of the mechanism. Several asset packs live
 * in the repo under `asset-packs/<pack>.assets/`, and the build service copies
 * the selected one into `assets/t/` BEFORE Metro runs
 * (scripts/apply-asset-pack.mjs is the reference implementation). The five paths
 * below never change; only the bytes behind them do. That is the entire trick,
 * and it is why swapping a pack needs no code change and no runtime lookup.
 *
 * THE MANIFEST IS NOT CONSULTED HERE
 * ----------------------------------
 * Each pack ships a `manifest.json` — the build-time contract the backend reads
 * to populate its pack picker — and the staging copy brings it along into
 * `assets/t/`. It is NOT the source of truth for resolution: this file is. A
 * manifest-driven lookup would have to be dynamic, which is precisely the thing
 * that does not exist. __tests__/app/t-asset-packs.test.ts pins the two sides
 * together instead, asserting the requires below and the manifests' slot keys
 * are the same set.
 *
 * ADDING A SLOT IS A THREE-PLACE EDIT
 * -----------------------------------
 * This map, the `slots` object in EVERY pack manifest, and real artwork in every
 * pack. Miss the manifests and the test that compares the two sets fails; miss
 * the artwork and the manifest-versus-disk test fails. Miss this file and the
 * slot is simply never rendered — which is why the requires are centralised
 * here, where one scan can see all of them, rather than scattered across the
 * screens that draw them.
 *
 * Centralising costs nothing: Metro's constraint is on the ARGUMENT to
 * `require`, not on where the call sits.
 */
export type TAssetSlot =
  | 'splash/logo.png'
  | 'onboarding/step1.png'
  | 'onboarding/step2.png'
  | 'onboarding/step3.png'
  | 'paywall/hero.png';

/**
 * Slot key -> bundled image. Every value must be a literal `require(...)`; a
 * computed or manifest-derived entry would silently stop bundling.
 */
export const T_ASSET_SLOTS: Record<TAssetSlot, ImageSourcePropType> = {
  'splash/logo.png': require('@/assets/t/splash/logo.png'),
  'onboarding/step1.png': require('@/assets/t/onboarding/step1.png'),
  'onboarding/step2.png': require('@/assets/t/onboarding/step2.png'),
  'onboarding/step3.png': require('@/assets/t/onboarding/step3.png'),
  'paywall/hero.png': require('@/assets/t/paywall/hero.png'),
};
