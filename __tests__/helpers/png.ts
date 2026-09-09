/**
 * Reading a PNG's real dimensions out of its IHDR chunk — no dependency, and it
 * starts by proving the file IS a PNG.
 *
 * WHY THIS IS SHARED AND NOT A LOCAL HELPER
 * -----------------------------------------
 * Two suites need the same thing for the same reason: they assert that an image
 * the BUILD will consume is present and well-formed, and neither can `require()`
 * it to find out. jest-expo's asset transformer rewrites every image module to
 * `module.exports = 1` (node_modules/jest-expo/src/preset/assetFileTransformer.js),
 * so the identity of a PNG is gone before the test runs. The only way to check an
 * image in this repo is to open the bytes.
 *
 *   - __tests__/app/t-asset-packs.test.ts — every asset-pack slot matches the
 *     size its manifest declares.
 *   - __tests__/app/splash-native-config.test.ts — the native splash icon is a
 *     real PNG, and big enough for the largest density prebuild will draw.
 *
 * Living under __tests__/helpers/ rather than beside either caller keeps it out
 * of jest's `testMatch` glob, which collects only files ending in `.test.ts` or
 * `.test.tsx`, so it is a module and not a suite with no tests in it.
 *
 * The signature check is an `expect`, not a thrown error, on purpose: a truncated
 * write or a JPEG renamed to `.png` should fail as a named assertion pointing at
 * the file, not as an unreadable `RangeError` from `readUInt32BE` reading past
 * the end of a buffer.
 */
import { readFileSync } from 'fs';

/** The 8 bytes every PNG starts with. */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** A PNG's pixel dimensions, read from the IHDR chunk at a fixed offset. */
export function pngSize(absolutePath: string): { w: number; h: number } {
  const bytes = readFileSync(absolutePath);
  expect({ file: absolutePath, png: bytes.subarray(0, 8).equals(PNG_SIGNATURE) }).toEqual({
    file: absolutePath,
    png: true,
  });
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}
