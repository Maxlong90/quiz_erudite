import { Stack } from 'expo-router';

/**
 * Italy Quiz feature layout (App Template: World). Declares the stack with headers
 * hidden and a TRANSPARENT content background so the app's dark base doesn't show
 * through — the landmarks artwork is the only background. The quiz flow itself is
 * not wired yet; for now the tree is splash → home → settings.
 */
export default function ItalyQuizLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      {/* Onboarding splash crossfades into the home screen (plain fade). The
          animation of the screen navigated TO is what plays, so `index` carries
          the fade. */}
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="categories" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="subcategories" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
