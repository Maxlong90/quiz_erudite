// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Native-only packages that import React Native internals and cannot be
// bundled for web (expo-router pulls every route — and their transitive
// imports — into the web bundle via require.context, so a native-only import
// anywhere breaks `expo start --web`). Stub them to an empty module on web.
// Runtime code already guards these behind platform checks, so an empty web
// module changes no behaviour — it only unblocks web bundling (used for
// Playwright screenshots / previews).
const WEB_STUBBED_NATIVE_MODULES = new Set(['react-native-google-mobile-ads']);

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBBED_NATIVE_MODULES.has(moduleName)) {
    return { type: 'empty' };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
