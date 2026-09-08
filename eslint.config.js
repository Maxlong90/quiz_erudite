// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * The whole configurable-template surface. `components/t/**` matches nothing
 * yet; a flat-config glob that matches no file is a no-op, so listing it now
 * means the directory arrives already covered instead of arriving unguarded.
 */
const T_SURFACE = [
  'app/t/**/*.{ts,tsx}',
  'components/t/**/*.{ts,tsx}',
  'constants/t/**/*.{ts,tsx}',
  'hooks/t/**/*.{ts,tsx}',
];

const NO_COLOUR_LITERALS =
  'No colour literals in the /t surface — use a useTemplateTheme() token or a ramp from constants/t/tile-palette.ts.';

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
    // The seam that is ALLOWED to hold literals. This must stay inside the same
    // object as `files`: on its own it would become a global ignore and stop
    // linting that file entirely rather than exempting it from one rule.
    ignores: ['constants/t/tile-palette.ts'],
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
