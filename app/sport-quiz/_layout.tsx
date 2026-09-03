import { Stack } from 'expo-router';

import { SportQuizProvider } from '@/hooks/sport-quiz/use-sport-quiz';
import { SportQuizContentProvider } from '@/hooks/sport-quiz/use-sport-quiz-content';

/**
 * Sports Quiz feature layout. Headers hidden, transparent card background so the
 * screen's own dark-navy backdrop is the only thing painted underneath. The whole
 * feature is wrapped in SportQuizProvider (coins economy + level progress) and
 * SportQuizContentProvider (offline-first backend questions for the Classic quiz).
 */
export default function SportQuizLayout() {
  return (
    <SportQuizProvider>
      <SportQuizContentProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: 'transparent' },
          }}
        >
          <Stack.Screen name="splash" options={{ animation: 'none' }} />
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
          <Stack.Screen name="play" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="settings" />
          <Stack.Screen name="shop" />
          <Stack.Screen name="wheel" />
          <Stack.Screen name="levels" />
          <Stack.Screen name="quiz" />
          <Stack.Screen name="level-complete" />
          <Stack.Screen name="legends-levels" />
          <Stack.Screen name="legends-grid" />
          <Stack.Screen name="legends-quiz" />
        </Stack>
      </SportQuizContentProvider>
    </SportQuizProvider>
  );
}
