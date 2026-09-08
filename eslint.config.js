// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // The configurable AppTemplate resolves its whole palette from the remote
    // theme engine, so a hardcoded colour there is a bug by definition. This
    // flags one in the editor; __tests__/app/t-no-color-literals.test.ts stays
    // the authority — it scans forms an AST selector cannot see.
    files: ['app/t/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message:
            'No colour literals in app/t — use a useThemeColors() token or a ramp from constants/t/tile-palette.ts.',
        },
        {
          selector: 'Literal[value=/^(rgba?|hsla?)\\(/]',
          message:
            'No colour literals in app/t — use a useThemeColors() token or a ramp from constants/t/tile-palette.ts.',
        },
      ],
    },
  },
]);
