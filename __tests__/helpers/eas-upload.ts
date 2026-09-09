/**
 * A model of the filter `eas build` runs over the working copy to decide what it
 * uploads — i.e. what an EAS worker will and will not find in the archive.
 *
 * WHY A MODEL AND NOT THE REAL THING
 * ----------------------------------
 * The real filter is eas-cli's `Ignore` class (`build/vcs/local.js`). Requiring
 * it would be strictly better, and it is not available: eas-cli is not a
 * dependency of this repo, and docs/development.md records that this host's
 * global `eas-cli@3.15.1` cannot even read the project. Installing a ~100 MB CLI
 * with its own `@expo/*` tree to reach one class is not proportionate.
 *
 * So what is modelled here is deliberately only the WIRING. The matching itself
 * is not re-implemented: `ignore` is the very module eas-cli's `Ignore`
 * instantiates, and it is declared in devDependencies at the major it resolves
 * (`^5.3.2`) rather than borrowed from the hoisted tree — `@typescript-eslint`
 * already ships a nested `ignore@7`, so relying on which copy wins the hoist is
 * a test that rots for reasons having nothing to do with `.easignore`.
 *
 * THE THREE DETAILS THAT ARE EASY TO GET WRONG
 * -------------------------------------------
 *  1. `.easignore` REPLACES `.gitignore`, it does not extend it. Expo's own
 *     reference is explicit both about the precedence and about the remedy:
 *     "the EAS CLI prioritizes it over the .gitignore file. When creating a
 *     .easignore file, include all files and directories from your .gitignore
 *     file and add additional files you want to ignore"
 *     (https://docs.expo.dev/build-reference/easignore/). That sentence is the
 *     whole reason the committed `.easignore` is a copy plus one rule.
 *  2. The layers are SEPARATE matchers, OR-ed — not one matcher fed both rule
 *     sets. eas-cli holds a list of `[prefix, Ignore]` pairs and returns true if
 *     any of them ignores the path, so a `!node_modules/x` negation cannot
 *     un-ignore the defaults. Merged into one instance it could, which is a
 *     different answer from identical-looking code.
 *  3. `DEFAULT_IGNORE` is exactly `.git` and `node_modules`, with no
 *     trailing-slash forms. This one comes from eas-cli's source rather than
 *     from the docs page, which does not mention it — so it is modelled as an
 *     extra layer that only ever excludes MORE. If eas-cli ever dropped the
 *     defaults, this model would be conservative rather than wrong.
 *
 * WHAT THIS MODELS, AND WHAT IT DOES NOT
 * --------------------------------------
 * eas-cli has two archive paths and this is the rule engine behind both, not a
 * model of either one's packaging. `NoVcsClient` (`EAS_NO_VCS=1`) walks the
 * working copy through exactly this filter. `GitClient` — the default — clones
 * the tracked tree and then applies the same `.easignore` via
 * `git ls-files --exclude-from`, so the RULES are shared but the candidate set
 * is narrower. `__tests__/lib/easignore.test.ts` drives that git command
 * directly for the delta, and uses this module for the per-path verdicts.
 *
 * Paths handed to `ignores()` must be repo-relative, `/`-separated and non-empty
 * (`ignore@5` throws on an absolute path), and must be FILE paths: a `foo/` rule
 * does not match the bare string `foo`, only `foo/something`. That is also what
 * eas-cli feeds it, since it is filtering a directory walk.
 *
 * Living under __tests__/helpers/ keeps it out of jest's `testMatch` glob, so it
 * is a module and not a suite with no tests in it — as with ./png.ts.
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

import makeIgnore from 'ignore';

/** Excluded no matter what any ignore file says. */
export const DEFAULT_IGNORE = ['.git', 'node_modules'].join('\n');

export interface UploadFilter {
  /** The ignore file whose rules are in force, relative to the repo root. */
  source: '.easignore' | '.gitignore' | null;
  /** Whether `eas build` would leave this repo-relative file out of the archive. */
  ignores: (repoRelativePath: string) => boolean;
}

/** One matcher per rule text, OR-ed — see detail 2 above. */
function orOf(ruleTexts: string[]): (repoRelativePath: string) => boolean {
  const layers = ruleTexts.map((text) => makeIgnore().add(text));
  return (repoRelativePath) => layers.some((layer) => layer.ignores(repoRelativePath));
}

/**
 * The filter as it stands in a checkout: `.easignore` if present, otherwise the
 * root `.gitignore`.
 *
 * The fallback is modelled as root-only where eas-cli applies every `.gitignore`
 * in the tree, keyed by its directory. That is exact for this repo rather than
 * an approximation — `__tests__/lib/easignore.test.ts` asserts the root file is
 * the only one — and the branch exists so that suite can show what the verdicts
 * were BEFORE `.easignore`, which is the only way to prove the file changed
 * anything at all.
 */
export function uploadFilterFor(rootDir: string, prefer: '.easignore' | '.gitignore'): UploadFilter {
  const source = existsSync(join(rootDir, prefer)) ? prefer : null;
  const ruleTexts = [DEFAULT_IGNORE];
  if (source) {
    ruleTexts.push(readFileSync(join(rootDir, source), 'utf8'));
  }
  return { source, ignores: orOf(ruleTexts) };
}
