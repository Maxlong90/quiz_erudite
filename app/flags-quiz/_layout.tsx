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
      {/* Onboarding splash DISSOLVES to reveal the home screen underneath (a
          CapCut-style "mix" cross-dissolve), rather than home sliding/fading in
          on top. `router.replace('/flags-quiz')` from the splash is a replace, so
          `animationTypeForReplace: 'pop'` runs the CLOSING animation on the
          outgoing splash — combined with `animation: 'fade'`, the splash fades
          out while home sits beneath it. */}
      <Stack.Screen
        name="index"
        options={{ animation: 'fade', animationTypeForReplace: 'pop' }}
      />
      <Stack.Screen name="play" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="continents" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="continent-quiz" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="quiz" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="result" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
