/**
 * CROSS-REPO PARITY: the client's wire contract vs the backend's registry.
 *
 * This is the anti-drift pin for the failure this project just lived through:
 * the backend bumped its token contract to schema v2 and every installed client
 * silently rejected the whole envelope, so preset edits stopped reaching devices
 * without a single log line. Three cheap facts would have caught it before it
 * shipped, and they are what this file asserts:
 *
 *   1. the schema version the client declares equals the one the backend serves;
 *   2. REMOTE_TOKEN_KEYS is the backend's token list — same names, same ORDER,
 *      same count. Order is not decorative: it is part of the backend's ETag
 *      contract and the gallery's render order;
 *   3. every one of those tokens exists in BOTH bundled appearances, at exactly
 *      the bytes a preset-less app is served — the "an unmodified preset is a
 *      no-op" guarantee the whole three-tier design rests on.
 *
 * The literals live in __tests__/fixtures/remote-theme-v2.ts, the single
 * transcription of ColorTokenRegistry.php (its header explains why the erudite
 * slug is the transcription source). The live endpoint is NOT touched here — the
 * default suite is offline by design; __tests__/lib/theme-contract-live.livetest.ts
 * re-checks the real backend on demand (npm run check:theme-contract).
 *
 * IF THIS TEST FAILS BECAUSE YOU CHANGED THE CLIENT: that is not a test to
 * update in isolation. Either the backend registry must change in the same PR
 * (fixture first), or — if the backend really did move ahead — the client bump
 * below is the deliberate, reviewed move this test exists to force into the
 * open.
 */
import { EruditeColors } from '@/constants/theme';
import { CLIENT_THEME_SCHEMA_VERSION, REMOTE_TOKEN_KEYS } from '@/lib/theme/contract';
import {
  BACKEND_DARK_DEFAULTS_V2,
  BACKEND_LIGHT_DEFAULTS_V2,
  BACKEND_TOKEN_KEYS_V2,
  SCHEMA_VERSION_V2,
} from '@/__tests__/fixtures/remote-theme-v2';

describe('the client contract vs the backend registry', () => {
  it('declares the schema version the backend serves', () => {
    // A mismatch here is exactly the failure mode that shipped: the client
    // rejecting an envelope it had never been taught to read, silently.
    expect(CLIENT_THEME_SCHEMA_VERSION).toBe(SCHEMA_VERSION_V2);
  });

  it('lists the backend tokens — same names, same order, same count', () => {
    expect([...REMOTE_TOKEN_KEYS]).toEqual([...BACKEND_TOKEN_KEYS_V2]);
    expect(REMOTE_TOKEN_KEYS).toHaveLength(BACKEND_TOKEN_KEYS_V2.length);
  });

  it('matches every token against the light defaults a preset-less app is served', () => {
    for (const key of BACKEND_TOKEN_KEYS_V2) {
      expect({ key, value: EruditeColors.light[key] }).toEqual({
        key,
        value: BACKEND_LIGHT_DEFAULTS_V2[key],
      });
    }
  });

  it('matches every token against the dark defaults a preset-less app is served', () => {
    for (const key of BACKEND_TOKEN_KEYS_V2) {
      expect({ key, value: EruditeColors.dark[key] }).toEqual({
        key,
        value: BACKEND_DARK_DEFAULTS_V2[key],
      });
    }
  });

  it('covers the whole bundled palette — nothing stays unthemed', () => {
    // Since v2 the backend serves the full palette, so an operator can reach
    // every token a screen reads. A token added to EruditePalette but not to
    // the registry (or vice versa) is exactly the silent-ignore class of bug.
    expect(Object.keys(EruditeColors.light).sort()).toEqual([...BACKEND_TOKEN_KEYS_V2].sort());
    expect(Object.keys(EruditeColors.dark).sort()).toEqual([...BACKEND_TOKEN_KEYS_V2].sort());
  });
});
