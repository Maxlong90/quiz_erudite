import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

/**
 * Crash & error reporting. Disabled by default: nothing is sent until a
 * DSN is provided via EXPO_PUBLIC_SENTRY_DSN (set in .env / EAS secrets),
 * so the app builds and runs identically with Sentry "off". This keeps
 * local dev and credential-less builds free of telemetry.
 */
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** True when a DSN is configured and Sentry has been initialized. */
export const sentryEnabled = !!dsn;

if (sentryEnabled) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version,
    // Avoid flooding the project with noise from local dev runs; opt in by
    // setting EXPO_PUBLIC_SENTRY_DEBUG=1 when you specifically want to test.
    enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_DEBUG === '1',
    // Performance tracing: full in dev, sampled in production.
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,
    // Don't capture user IP / personal context by default — this app has no
    // user accounts and we don't want to widen the data-safety surface.
    sendDefaultPii: false,
  });
}

export { Sentry };
