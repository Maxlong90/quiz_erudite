import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ContentCacheProvider } from '@/hooks/use-content-cache';
import { useImmersiveNavBar } from '@/hooks/use-immersive-nav-bar';
import { LocaleProvider } from '@/hooks/use-locale';
import { PremiumProvider } from '@/hooks/use-premium';
import { ThemePrefProvider, useThemePref } from '@/hooks/use-theme-pref';
import { useThemeColors } from '@/hooks/use-theme-colors';
import { currentTemplate } from '@/constants/app-templates';
// Side-effect import: initializes Sentry when EXPO_PUBLIC_SENTRY_DSN is set.
import { Sentry, sentryEnabled } from '@/lib/sentry';
// Side-effect import: configures RevenueCat on supported Android builds; a
// no-op in Expo Go / web / iOS (see lib/revenuecat.ts).
import '@/lib/revenuecat';

// Rendered UNDER the theme providers so it can consume the app-selected
// appearance. Everything that used to be a hardcoded dark constant here
// (system root bg, navigator theme, status bar, card backgrounds) is now
// driven reactively from useThemeColors(), so flipping the appearance
// repaints the whole navigator without a restart.
function ThemedRoot() {
  const colors = useThemeColors();
  const { theme, ready } = useThemePref();

  // An app-template build paints the whole root scaffold (system bg, navigator
  // card/background, per-screen content bg) in ITS OWN base colour, so the
  // erudite default-DARK navy never shows behind its screens during the
  // cold-start hand-off (native splash → index redirect → the app's splash).
  // Without this the navy scaffold bled through the transition and read as a
  // separate dark "first" splash — visible on any template whose palette isn't
  // navy (it was reported on the light Logo Quiz). The erudite build keeps the
  // theme-driven colors.bgSolid. See constants/app-templates.ts.
  const scaffoldBg = currentTemplate()?.scaffoldBg ?? colors.bgSolid;

  // Android: keep the system nav bar hidden everywhere; a bottom-edge swipe
  // reveals it transiently and it auto-hides again after 3s.
  useImmersiveNavBar();

  // Force the system root-view background to match the app gradient so the
  // Android navigation bar (which sits over edge-to-edge content and shows the
  // root bg through translucent system buttons) stays on-theme even when a
  // Modal pops its own window on top.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(scaffoldBg).catch(() => {});
  }, [scaffoldBg]);

  // Every screen sits on the app gradient; each Stack.Screen's card background
  // is tinted to the base color via `contentStyle` below (and the wrapping View
  // fills the same base), so sliding screens never flash a default white card.
  // (Previously this used react-navigation's ThemeProvider, dropped in SDK 56.)

  // On cold start the persisted preference loads asynchronously; a light-pref
  // user would otherwise get one frame of the default-dark bg. Hold a neutral
  // fill until the stored value is known.
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: scaffoldBg }} />;
  }

  return (
      <View style={{ flex: 1, backgroundColor: scaffoldBg }}>
        <Stack
          initialRouteName="splash"
          screenOptions={{
            // Underneath every screen, react-navigation renders a card
            // whose background is white by default. During slide
            // transitions that white card peeks through behind the
            // outgoing/incoming screens. Tint it to the base color so it
            // blends with the app gradient and the navigation animation reads
            // as a smooth same-color slide.
            contentStyle: { backgroundColor: scaffoldBg },
          }}
        >
        <Stack.Screen
          name="splash"
          options={{ headerShown: false, gestureEnabled: false, animation: 'none' }}
        />
        <Stack.Screen
          name="language"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* App templates: no slide into the group. Entering it IS the cold-start
            hand-off from the native splash to the app's own splash, and both sit
            on the same background — an instant swap reads as one continuous
            splash, while a slide briefly reveals the scaffold behind it. */}
        <Stack.Screen name="logo-quiz" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="flags-quiz" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="coat-of-arms" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="sport-quiz" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="italy-quiz" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="settings"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="category/[slug]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="quiz-mode/[slug]"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="paywall"
          options={{ headerShown: false, gestureEnabled: false, animation: 'fade' }}
        />
        <Stack.Screen
          name="quiz"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="results"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="stats"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="shop"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="account"
          options={{ headerShown: false, animation: 'slide_from_right' }}
        />
        </Stack>
        <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      </View>
  );
}

function RootLayout() {
  return (
    <LocaleProvider>
      <ThemePrefProvider>
        <PremiumProvider>
          <ContentCacheProvider>
            <ThemedRoot />
          </ContentCacheProvider>
        </PremiumProvider>
      </ThemePrefProvider>
    </LocaleProvider>
  );
}

// Wrap with Sentry's touch/navigation instrumentation only when active;
// otherwise export the plain component so a DSN-less build is untouched.
export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
