/**
 * Walking the checked-out tree, for the suites that assert about FILES rather
 * than about modules.
 *
 * WHY THIS IS SHARED AND NOT A LOCAL HELPER
 * -----------------------------------------
 * Two suites need the same walk for the same reason — they reason about what a
 * BUILD will find on disk, which no `require()` can answer:
 *
 *   - __tests__/app/t-asset-packs.test.ts — every pack holds exactly its
 *     manifest and its slots, and `assets/t/` is the default pack byte for byte.
 *   - __tests__/lib/easignore.test.ts — every one of those files, and every file
 *     under `assets/`, gets the right verdict from the EAS upload filter.
 *
 * Living under __tests__/helpers/ rather than beside either caller keeps it out
 * of jest's `testMatch` glob (`__tests__/**\/*.test.{ts,tsx}`), so it is a module
 * and not a suite with no tests in it — the same arrangement as ./png.ts.
 */
import { readdirSync } from 'fs';
import { join } from 'path';

/** The repo root, from `__tests__/helpers/`. */
export const REPO_ROOT = join(__dirname, '..', '..');

/**
 * Every file under a directory, as paths relative to it, with `/` separators.
 *
 * `/` rather than `path.sep` is deliberate and load-bearing for both callers:
 * the results are compared against manifest slot keys and fed to gitignore-style
 * matchers, and both of those are `/`-only. On Windows a `join()`-built path
 * would silently never match — a guard that passes by failing to look.
 */
export function filesUnder(dir: string, prefix = ''): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    return entry.isDirectory() ? filesUnder(join(dir, entry.name), rel) : [rel];
  });
}
