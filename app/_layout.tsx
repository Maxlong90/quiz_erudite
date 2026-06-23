import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import * as SystemUI from 'expo-system-ui';
import 'react-native-reanimated';

import { ContentCacheProvider } from '@/hooks/use-content-cache';
import { LocaleProvider } from '@/hooks/use-locale';
import { PremiumProvider } from '@/hooks/use-premium';
// Side-effect import: initializes Sentry when EXPO_PUBLIC_SENTRY_DSN is set.
import { Sentry, sentryEnabled } from '@/lib/sentry';

// Force the system root-view background to match the app gradient so
// the Android navigation bar (which sits over edge-to-edge content
// and shows the root bg through translucent system buttons) stays
// dark even when a Modal pops its own window on top.
SystemUI.setBackgroundColorAsync('#1a1a47').catch(() => {});

// Every screen in the app sits on a hardcoded dark purple gradient,
// so we force a navigator theme whose card background also matches
// that base color. Without this, devices in light system mode flash
// the navigator's white card behind sliding screens.
const NAV_THEME = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#1a1a47',
    card: '#1a1a47',
  },
};

function RootLayout() {
  return (
    <LocaleProvider>
      <PremiumProvider>
      <ContentCacheProvider>
      <ThemeProvider value={NAV_THEME}>
        <View style={{ flex: 1, backgroundColor: '#1a1a47' }}>
        <Stack
          initialRouteName="splash"
          screenOptions={{
            // Underneath every screen, react-navigation renders a card
            // whose background is white by default. During slide
            // transitions that white card peeks through behind the
            // outgoing/incoming screens. Tint it dark so it blends with
            // the app gradient and the navigation animation reads as a
            // smooth purple-to-purple slide.
            contentStyle: { backgroundColor: '#1a1a47' },
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
        <StatusBar style="light" />
        </View>
      </ThemeProvider>
      </ContentCacheProvider>
      </PremiumProvider>
    </LocaleProvider>
  );
}

// Wrap with Sentry's touch/navigation instrumentation only when active;
// otherwise export the plain component so a DSN-less build is untouched.
export default sentryEnabled ? Sentry.wrap(RootLayout) : RootLayout;
