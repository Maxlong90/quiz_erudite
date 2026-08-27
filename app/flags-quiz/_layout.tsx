import { Stack } from 'expo-router';

/**
 * Flags Quiz feature layout (App Template: Geography). Declares the stack with
 * headers hidden and a TRANSPARENT content background so the app's dark base
 * doesn't show through — the flags artwork is the only background. Only the home
 * screen exists so far — Play / Shop / Settings destinations land here as the
 * feature is built out.
 */
export default function FlagsQuizLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      {/* Onboarding splash crossfades into the home screen (plain fade, not the
          right-to-left slide). The animation of the screen navigated TO is what
          plays, so `index` carries the fade. */}
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="play" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="continents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="continent-quiz" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="quiz" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
