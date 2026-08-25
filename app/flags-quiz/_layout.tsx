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
      <Stack.Screen name="index" />
      <Stack.Screen name="play" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
