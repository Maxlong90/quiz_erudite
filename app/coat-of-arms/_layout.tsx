import { Stack } from 'expo-router';

import { CoatContentProvider } from '@/hooks/coat-of-arms/use-coat-content';

/**
 * Coat of Arms feature layout. Wraps the flow in the content provider so the
 * backend snapshot ("All countries" coats-of-arms image_questions) is fetched
 * once and shared across every screen (and cached offline). Declares the stack
 * with headers hidden and a TRANSPARENT content background so the app's dark
 * base doesn't show through — the coats artwork is the only background.
 */
export default function CoatOfArmsLayout() {
  return (
    <CoatContentProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="splash" options={{ animation: 'none' }} />
        {/* Onboarding splash crossfades into the home screen — the animation of the
            screen navigated TO is what plays, so `index` carries the fade. */}
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="play" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="quiz" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </CoatContentProvider>
  );
}
