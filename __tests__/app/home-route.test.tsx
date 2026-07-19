/**
 * Integration tests for the template gate in HomeRoute (app/index.tsx).
 *
 * HomeRoute is the route expo-router opens on `/`. It is both the cold-start
 * intro gate AND the App Template gate: after the intro redirect, it reads the
 * backend template code from the content snapshot (snapshot.app.template),
 * resolves it via resolveExperience (lib/app-template.ts), and boots the
 * matching root experience:
 *   - 'logo_quiz'                      -> <Redirect href="/logo-quiz" />
 *   - 'erudite' / unknown / missing    -> <HomeScreen /> (trivia home)
 *
 * These assertions pin the acceptance criteria: the Logo Quiz home renders
 * ONLY for the logo_quiz template and never leaks into a trivia app like
 * Erudite Quiz, and an absent/unknown template safely defaults to trivia so
 * older (pre-`template`) snapshots keep working. resolveExperience itself is
 * exercised for real here (not mocked); the heavy HomeScreen dependency graph
 * is stubbed at its import boundaries, following the repo's screen-test pattern
 * (see __tests__/app/onboarding.test.tsx).
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// --- controllable mock state -------------------------------------------------

let mockColdStart = false;
let mockSnapshot: unknown = null;
// Records every href HomeRoute redirects to during a render, so a test can
// assert which branch was taken. `mock`-prefixed so jest allows the mock
// factory below to reference it despite hoisting.
let mockRedirectHrefs: string[] = [];

// --- module boundaries -------------------------------------------------------

jest.mock('expo-router', () => ({
  Redirect: ({ href }: { href: string }) => {
    mockRedirectHrefs.push(href);
    return null;
  },
  router: { push: jest.fn(), replace: jest.fn() },
}));

jest.mock('@/lib/intro-gate', () => ({
  consumeColdStart: () => mockColdStart,
}));

jest.mock('@/hooks/use-content-cache', () => ({
  useContentCache: () => ({ snapshot: mockSnapshot }),
}));

// HomeScreen leaf hooks — safe, inert defaults so the trivia branch mounts.
// NOTE: the returned function identities (t, reload, setPremium) must be STABLE
// across renders. HomeScreen's category effect depends on `t`, so a fresh `t`
// each render would re-run it, re-set the categories array, and loop forever.
const mockT = (key: string) => key;
const mockReloadLives = jest.fn();
const mockSetPremium = jest.fn();
const mockResetPremium = jest.fn();
jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/hooks/use-mistakes', () => ({ useMistakes: () => ({ count: 0 }) }));
jest.mock('@/hooks/use-premium', () => ({
  usePremium: () => ({ isPremium: false, setPremium: mockSetPremium, resetPremium: mockResetPremium }),
}));
jest.mock('@/hooks/use-lives', () => ({
  useLives: () => ({ count: 5, canClaim: false, reload: mockReloadLives }),
}));
jest.mock('@/hooks/use-translation', () => ({
  useTranslation: () => ({ t: mockT }),
}));

// No network: the trivia home falls back to fetchCategories when there's no
// snapshot — resolve empty so the mount settles without a real request.
jest.mock('@/api/categories', () => ({ fetchCategories: jest.fn().mockResolvedValue([]) }));
// Stub the API client so its axios import never loads (the fetch adapter's
// feature-detection throws a "stream already has a reader" error under the
// expo/jsdom stream polyfill). HomeScreen only needs the APP_SLUG constant.
jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  API_URL: 'https://example.test/api/v1',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));
jest.mock('@/lib/lives', () => ({ claimDaily: jest.fn().mockResolvedValue(undefined) }));

// Native / visual-only siblings — stub at the import boundary.
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock('@/components/ui/icon-symbol', () => ({ IconSymbol: () => null }));
jest.mock('@/components/bottom-bar', () => ({ BottomBar: () => null }));
jest.mock('@/components/lives/claim-lives-modal', () => ({ ClaimLivesModal: () => null }));
jest.mock('@/components/home/hard-mode-modal', () => ({ HardModeModal: () => null }));
jest.mock('@/components/home/quiz-config-modal', () => ({ QuizConfigModal: () => null }));
jest.mock('@/components/home/time-limit-modal', () => ({ TimeLimitModal: () => null }));

import HomeRoute from '@/app/index';

beforeEach(() => {
  mockColdStart = false;
  mockSnapshot = null;
  mockRedirectHrefs = [];
});

/** Render HomeRoute and let any post-mount effects (fetchCategories) settle. */
async function renderHome() {
  const utils = render(<HomeRoute />);
  await waitFor(() => {});
  return utils;
}

describe('HomeRoute template gate', () => {
  it('redirects the first cold-start mount to the intro flow, before the template gate', async () => {
    mockColdStart = true;
    mockSnapshot = { app: { template: 'logo_quiz' } }; // must NOT matter yet

    const { toJSON } = await renderHome();

    expect(mockRedirectHrefs).toEqual(['/splash']);
    expect(mockRedirectHrefs).not.toContain('/logo-quiz');
    expect(toJSON()).toBeNull(); // Redirect mock renders nothing
  });

  it('redirects to /logo-quiz when the template is logo_quiz', async () => {
    mockSnapshot = { app: { template: 'logo_quiz' } };

    const { toJSON } = await renderHome();

    expect(mockRedirectHrefs).toEqual(['/logo-quiz']);
    expect(toJSON()).toBeNull();
  });

  it('renders the trivia HomeScreen (no redirect) when the template is erudite', async () => {
    mockSnapshot = { app: { template: 'erudite' }, categories: [], questions: [] };

    const { toJSON } = await renderHome();

    expect(mockRedirectHrefs).toEqual([]);
    expect(toJSON()).not.toBeNull(); // HomeScreen mounted
  });

  it('defaults to the trivia HomeScreen when the snapshot has not loaded yet (template null)', async () => {
    mockSnapshot = null;

    const { toJSON } = await renderHome();

    expect(mockRedirectHrefs).toEqual([]);
    expect(toJSON()).not.toBeNull();
  });

  it('falls back to the trivia HomeScreen for an unknown template code (never leaks Logo Quiz)', async () => {
    mockSnapshot = { app: { template: 'coat_of_arms' }, categories: [], questions: [] };

    const { toJSON } = await renderHome();

    expect(mockRedirectHrefs).toEqual([]);
    expect(mockRedirectHrefs).not.toContain('/logo-quiz');
    expect(toJSON()).not.toBeNull();
  });
});
