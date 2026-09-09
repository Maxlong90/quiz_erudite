/**
 * Jest config for the OPT-IN live backend checks.
 *
 * The default suite (jest.config.js) is offline by documented design. The
 * `.livetest.ts` files deliberately do not match its testMatch, so `npm test`
 * never touches the network. This config selects ONLY those files; run it
 * explicitly via `npm run check:theme-contract`.
 *
 * Inherits everything else — preset, setup, the `@/` alias — from the default.
 */
module.exports = {
  ...require('./jest.config'),
  testMatch: ['<rootDir>/__tests__/**/*.livetest.ts'],
};
