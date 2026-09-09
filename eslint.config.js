// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * The whole configurable-template surface.
 *
 * `components/t/**` was listed here while it still matched nothing — a
 * flat-config glob over an empty set is a no-op — precisely so the directory
 * would arrive already covered rather than arriving unguarded. It has since
 * arrived, holding the template's own bottom bar, and needed no rule change to
 * be linted from its first commit. Keep the same habit for the next one.
 */
const T_SURFACE = [
  'app/t/**/*.{ts,tsx}',
  'components/t/**/*.{ts,tsx}',
  'constants/t/**/*.{ts,tsx}',
  'hooks/t/**/*.{ts,tsx}',
];

const NO_COLOUR_LITERALS =
  'No colour literals in the /t surface — use a useTemplateTheme() token, a ramp from constants/t/tile-palette.ts, or (third-party sign-in buttons only) constants/t/oauth-brand.ts.';

module.exports = defineConfig([
  expoConfig,
  {
    // An object carrying ONLY `ignores` is a GLOBAL ignore.
    ignores: ['dist/*'],
  },
  {
    // The configurable AppTemplate resolves its whole palette from the remote
    // theme engine, so a hardcoded colour there is a bug by definition. This
    // flags one in the editor; __tests__/app/t-no-color-literals.test.ts stays
    // the authority — it scans forms an AST selector cannot see (template
    // literals, computed strings) and follows the imports these files make.
    files: T_SURFACE,
    // The two seams that are ALLOWED to hold literals, for opposite reasons:
    // tile-palette.ts is the temporary home of the tile spectrum until it moves
    // onto the wire, while oauth-brand.ts holds Apple/Google brand colour that
    // must NEVER become operator data — remoting it would ship a vendor
    // guideline violation. Each file's own docblock carries the argument, and
    // __tests__/app/t-no-color-literals.test.ts asserts this list stays in step
    // with the exemptions there.
    //
    // This must stay inside the same object as `files`: on its own it would
    // become a global ignore and stop linting those files entirely rather than
    // exempting them from one rule.
    ignores: ['constants/t/tile-palette.ts', 'constants/t/oauth-brand.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: NO_COLOUR_LITERALS,
        },
        {
          selector: 'Literal[value=/^(rgba?|hsla?)\\(/]',
          message: NO_COLOUR_LITERALS,
        },
      ],
    },
  },
]);
