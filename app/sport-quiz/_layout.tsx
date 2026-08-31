import { Stack } from 'expo-router';

import { SportQuizProvider } from '@/hooks/sport-quiz/use-sport-quiz';

/**
 * Sports Quiz feature layout. Headers hidden, transparent card background so the
 * screen's own dark-navy backdrop is the only thing painted underneath. The whole
 * feature is wrapped in SportQuizProvider so every screen shares the coins economy
 * (coins balance, wheel cooldown, rate reward).
 */
export default function SportQuizLayout() {
  return (
    <SportQuizProvider>
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
      </Stack>
    </SportQuizProvider>
  );
}
