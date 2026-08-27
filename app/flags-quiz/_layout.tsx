import { Stack } from 'expo-router';

import { FlagsQuizContentProvider } from '@/hooks/flags-quiz/use-flags-quiz-content';

/**
 * Flags Quiz feature layout (App Template: Geography). Wraps the whole flow in
 * the content provider so the backend snapshot ("All countries" flags) and the
 * image-answer questions ("By continent" flag pictures) are fetched once and
 * shared across every screen (and cached offline). Declares the stack with
 * headers hidden and a TRANSPARENT content background so the app's dark base
 * doesn't show through — the flags artwork is the only background.
 */
export default function FlagsQuizLayout() {
  return (
    <FlagsQuizContentProvider>
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
    </FlagsQuizContentProvider>
  );
}
