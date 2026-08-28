import { Stack } from 'expo-router';

/**
 * Coat of Arms feature layout. Declares the stack with headers hidden and a
 * TRANSPARENT content background so the app's dark base doesn't show through —
 * the coats artwork is the only background. Mirrors the Flags Quiz layout; the
 * home + settings screens reuse the Flags Quiz buttons/theme verbatim, so no
 * content provider is needed until the quiz flow is wired.
 */
export default function CoatOfArmsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
