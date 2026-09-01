module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    env: {
      // Jest runs code through Node's CommonJS runtime, where an untransformed
      // dynamic `import()` throws ("without --experimental-vm-modules"). Metro
      // (dev/prod bundles, incl. OTA) handles `import()` natively and never
      // uses this env, so rewriting it to require() is test-only and does not
      // affect the shipped bundle. Without it, helpers that lazy-import
      // AsyncStorage (readSeen/writeSeen) silently no-op under their
      // best-effort catch, making the cross-session `seen` logic untestable.
      test: {
        plugins: ['babel-plugin-dynamic-import-node'],
      },
    },
  };
};
