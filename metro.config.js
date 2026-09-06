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

// Native BUILD OUTPUT inside node_modules (Gradle's `android/build`, its `.cxx`
// cache, Xcode's `ios/build`). Metro's file watcher used to crawl into these and
// crash the whole dev server with
//   ENOENT: watch '.../android/build/generated/source/codegen'
// whenever a Gradle run deleted a directory mid-walk — which killed the running
// preview at random. Nothing in there is ever imported, so ignore it outright.
const NATIVE_BUILD_OUTPUT = /[/\\]node_modules[/\\].*[/\\](?:android[/\\](?:build|\.cxx)|ios[/\\]build)[/\\].*/;
const previousBlockList = config.resolver.blockList;
config.resolver.blockList = Array.isArray(previousBlockList)
  ? [...previousBlockList, NATIVE_BUILD_OUTPUT]
  : previousBlockList
    ? [previousBlockList, NATIVE_BUILD_OUTPUT]
    : [NATIVE_BUILD_OUTPUT];

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBBED_NATIVE_MODULES.has(moduleName)) {
    return { type: 'empty' };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
