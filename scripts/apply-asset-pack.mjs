#!/usr/bin/env node
/**
 * Stage an asset pack into the template's fixed image directory.
 *
 *   node scripts/apply-asset-pack.mjs <pack>      # e.g. `base`, `neon`
 *
 * WHY THIS EXISTS AT ALL
 * ----------------------
 * React Native has no dynamic require: Metro must see a string literal at the
 * call site to bundle an asset. So a pack cannot be *selected* at runtime the
 * way the palette is (lib/theme/). Instead the paths stay frozen —
 * constants/t/asset-slots.ts requires `@/assets/t/...` and nothing else — and
 * the BYTES behind them are swapped before Metro ever runs.
 *
 * This script is that swap, and it is also the SPEC. The production copy runs
 * inside the backend's ProcessBuildTask against a fresh git clone; this file is
 * the reference the PHP side transliterates, and the thing to re-read when the
 * two disagree. Zero dependencies on purpose, for the same reason.
 *
 * CLEAR-THEN-COPY IS LOAD-BEARING
 * -------------------------------
 * The target is wiped, not merged into. A pack that renamed or dropped a slot
 * would otherwise leave the previous pack's file in place, the `require()` would
 * keep resolving to it, and a shipped APK would carry one image from the wrong
 * pack with nothing anywhere reporting a problem.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PACKS_DIR = 'asset-packs';

/**
 * A manifest names its own destination (see docs/configurable-template.md), which
 * keeps `assets/t` from being duplicated knowledge on the backend side. That also
 * makes the field an attacker-controlled path if it is ever trusted blindly: a
 * pack declaring `assets/onboarding` would delete the shipped Erudite artwork
 * that app/onboarding.tsx statically requires 22 times. Hence an allowlist rather
 * than a traversal check — the set of legal targets is one entry long, and the
 * backend is specified to apply the same rule.
 */
const ALLOWED_TARGETS = ['assets/t'];

function fail(message) {
  console.error(`apply-asset-pack: ${message}`);
  process.exit(1);
}

const packName = process.argv[2];
if (!packName) fail('usage: node scripts/apply-asset-pack.mjs <pack>');
if (!/^[a-z0-9-]+$/.test(packName)) fail(`bad pack name "${packName}" (expected [a-z0-9-]+)`);

const packDir = join(REPO_ROOT, PACKS_DIR, `${packName}.assets`);
if (!existsSync(packDir)) fail(`no such pack: ${PACKS_DIR}/${packName}.assets`);

const manifestPath = join(packDir, 'manifest.json');
if (!existsSync(manifestPath)) fail(`pack "${packName}" has no manifest.json`);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (error) {
  fail(`manifest.json is not valid JSON: ${error.message}`);
}

if (manifest.pack !== packName) {
  fail(`manifest says pack "${manifest.pack}" but it lives in ${packName}.assets`);
}

const target = manifest.target ?? ALLOWED_TARGETS[0];
if (!ALLOWED_TARGETS.includes(target)) {
  fail(`manifest target "${target}" is not allowed (expected one of: ${ALLOWED_TARGETS.join(', ')})`);
}

const slotKeys = Object.keys(manifest.slots ?? {});
if (slotKeys.length === 0) fail(`pack "${packName}" declares no slots`);

const targetDir = join(REPO_ROOT, target);
rmSync(targetDir, { recursive: true, force: true });

/** Copy one file, creating intermediate directories, and prove it landed. */
function stage(relativePath) {
  const from = join(packDir, relativePath);
  const to = join(targetDir, relativePath);
  if (!existsSync(from)) fail(`pack "${packName}" declares ${relativePath} but the file is missing`);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  // Re-stat rather than trust the copy: a truncated slot resolves fine through
  // Metro and shows up as a blank image on a device, which is the failure mode
  // this whole mechanism is least able to explain after the fact.
  if (statSync(to).size === 0) fail(`staged ${relativePath} is empty`);
}

for (const relativePath of slotKeys) {
  if (relativePath.includes('..') || relativePath.startsWith('/') || relativePath.includes('\\')) {
    fail(`slot key "${relativePath}" is not a safe relative path`);
  }
  stage(relativePath);
}
// The manifest travels with the art, so a built clone carries an on-disk record
// of which pack produced it — and the token gallery can name it on a device.
stage('manifest.json');

console.log(`apply-asset-pack: staged "${packName}" (${slotKeys.length} slots) into ${target}/`);
