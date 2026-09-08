import { Stack } from 'expo-router';

/**
 * Football Quiz feature layout. Headers hidden, transparent card background so
 * each screen's own backdrop is the only thing painted underneath.
 *
 * NOTE — prototype. Unlike Sport Quiz there is no provider here yet: the backend
 * app (id 4) has no content categories, so these screens run on the fixtures in
 * lib/football-quiz/mock.ts. The real providers (economy + offline content) get
 * wired in once the backend has questions.
 */
export default function FootballQuizLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      <Stack.Screen name="play" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="settings" />
      <Stack.Screen name="shop" />
      <Stack.Screen name="wheel" />
      <Stack.Screen name="levels" />
      <Stack.Screen name="quiz" />
    </Stack>
  );
}
