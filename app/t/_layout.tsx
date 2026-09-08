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
      {/* The browse path: a subject's subcategory grid, then the per-subcategory
          mode picker. Both mirror the options app/_layout.tsx gives the Erudite
          originals, so the push animation is unchanged by the port. */}
      <Stack.Screen name="category/[slug]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="quiz-mode/[slug]" options={{ animation: 'slide_from_right' }} />
      {/* The paywall, reached from a premium-locked tile on the home or the mode
          picker, and from the onboarding's last slide. The back gesture is off
          because both of its exits are WITHHELD ON PURPOSE: the backend's
          `seconds_before_quit_button_shown` hides the ✕ for a configured number
          of seconds, and a swipe-back would hand the player the dismissal the
          operator paid to delay. */}
      <Stack.Screen name="paywall" options={{ gestureEnabled: false, animation: 'fade' }} />
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
