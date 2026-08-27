// Cold-start intro gate.
//
// expo-router opens the app at the `/` URL on every cold launch, which renders
// `app/index.tsx` (Home) directly — the `initialRouteName="splash"` prop on the
// root <Stack> does NOT redirect the launch into the intro flow. So Home is the
// real entry point, and it must bounce a cold start into
// splash -> language -> onboarding -> (paywall) -> home.
//
// This module holds a single process-lifetime flag: true until the first Home
// mount consumes it. The first Home mount of a cold start redirects to /splash,
// so the QUIZZES splash plays on every cold start. The splash then branches on
// the persisted `onboarding.seen.v1` flag: the first launch ever continues into
// the language picker + onboarding carousel, while every later launch skips
// straight to Home. So the splash shows each launch, but the rest of the intro
// shows exactly once. Every later return to Home (from onboarding, quiz, the
// bottom bar, etc.) renders Home normally.
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
