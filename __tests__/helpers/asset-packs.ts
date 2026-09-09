/**
 * Reading the asset-pack contract off disk: the packs in `asset-packs/`, their
 * manifests, and the `require('@/assets/t/…')` calls that consume the staged copy.
 *
 * WHY THIS IS SHARED AND NOT A LOCAL HELPER
 * -----------------------------------------
 * Two suites derive their expectations from the SAME manifests, and must keep
 * deriving them rather than transcribing, or adding a sixth slot silently leaves
 * one of them checking five:
 *
 *   - __tests__/app/t-asset-packs.test.ts — the contract itself (manifest versus
 *     bytes, requires versus manifests, staged copy versus its pack).
 *   - __tests__/lib/easignore.test.ts — the pack sources are dropped from the EAS
 *     upload while every staged slot the build needs survives it.
 *
 * Living under __tests__/helpers/ keeps it out of jest's `testMatch` glob, so it
 * is a module and not a suite with no tests in it — as with ./png.ts.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

import { REPO_ROOT } from './repo-tree';

export const PACKS_DIR = join(REPO_ROOT, 'asset-packs');

/** Where a pack is staged. The one legal `target`, pinned by t-asset-packs. */
export const STAGING_DIR = join(REPO_ROOT, 'assets', 't');

/**
 * The pack whose artwork is committed in `assets/t/`, i.e. what every build
 * starts from before the build service stages anything else.
 */
export const DEFAULT_PACK = 'base';

export interface SlotSpec {
  w: number;
  h: number;
  title: string;
}

export interface PackManifest {
  schema: number;
  pack: string;
  title: string;
  onboarding_types: string[];
  target: string;
  slots: Record<string, SlotSpec>;
}

/** The `<name>.assets` directories, sorted. */
export function packNames(): string[] {
  return readdirSync(PACKS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export function manifestOf(packDir: string): PackManifest {
  return JSON.parse(readFileSync(join(PACKS_DIR, packDir, 'manifest.json'), 'utf8'));
}

/** The slot keys the default pack declares — the set every build consumes. */
export function defaultPackSlots(): string[] {
  return Object.keys(manifestOf(`${DEFAULT_PACK}.assets`).slots);
}

/** Every `require('@/assets/t/...')` argument in a source file, path only. */
export function stagedRequiresIn(relativeSourcePath: string): string[] {
  const source = readFileSync(join(REPO_ROOT, relativeSourcePath), 'utf8');
  return [...source.matchAll(/require\('@\/assets\/t\/([^']+)'\)/g)].map((m) => m[1]);
}
