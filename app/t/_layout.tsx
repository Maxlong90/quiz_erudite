import { Stack } from 'expo-router';

/**
 * The configurable AppTemplate (task Э0-B). Every screen here draws its colours
 * from the remote theme engine (hooks/use-app-theme.ts) rather than from a
 * checked-in palette, which is what makes this template one app per operator
 * preset instead of one app per build.
 *
 * The card background stays transparent so each screen's own ScreenBackground
 * gradient — the themed one — is the only thing painted underneath.
 */
export default function TTemplateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="splash" options={{ animation: 'none' }} />
      {/* Reached from the splash on a first launch only; its artwork is whichever
          asset pack the build staged (constants/t/asset-slots.ts). */}
      <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
      <Stack.Screen name="index" options={{ animation: 'fade' }} />
      {/* The token gallery, pushed from a long-press on the home wordmark. */}
      <Stack.Screen name="tokens" options={{ animation: 'slide_from_right' }} />
      {/* The quiz loop. Both mirror the options app/_layout.tsx gives the
          Erudite originals: the back gesture is disabled so a swipe cannot
          abandon a run mid-question or skip past the score — leaving a run is
          the explicit close button, which spends the life it owes and flushes
          queued answers first. */}
      <Stack.Screen name="quiz" options={{ gestureEnabled: false }} />
      <Stack.Screen name="results" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
