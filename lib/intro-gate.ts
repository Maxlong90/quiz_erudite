// Cold-start intro gate.
//
// expo-router opens the app at the `/` URL on every cold launch, which renders
// `app/index.tsx` (Home) directly — the `initialRouteName="splash"` prop on the
// root <Stack> does NOT redirect the launch into the intro flow. So Home is the
// real entry point, and it must bounce a cold start into
// splash -> language -> onboarding -> (paywall) -> home.
//
// This module holds a single process-lifetime flag: true until the first Home
// mount consumes it. The first Home mount of a cold start redirects to /splash;
// every later return to Home (from onboarding, quiz, the bottom bar, etc.)
// renders Home normally. The flag resets only on a full app restart, so the
// full intro runs on every cold start — and, like the rest of the flow, it is
// never gated on any persisted AsyncStorage "seen"/"picked" flag.
let coldStartPending = true;

/**
 * Returns true exactly once per app process — on the first Home mount after a
 * cold start — then false forever after. Callers redirect into the intro flow
 * when it returns true.
 */
export function consumeColdStart(): boolean {
  if (!coldStartPending) {
    return false;
  }
  coldStartPending = false;
  return true;
}
