/**
 * Unit tests for the cold-start intro gate (lib/intro-gate.ts).
 *
 * Home ('/') is the route expo-router opens on every cold launch, so it acts as
 * the entry gate and must bounce the FIRST mount of a process into the intro
 * flow (splash -> language -> onboarding -> paywall -> home), then render Home
 * normally on every subsequent return. consumeColdStart() encodes exactly that:
 * true once per process, false forever after. jest.resetModules() gives each
 * test a fresh module instance, standing in for a fresh app process.
 */
describe('consumeColdStart', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns true on the first call of a process, then false thereafter', () => {
    const { consumeColdStart } = require('@/lib/intro-gate');

    expect(consumeColdStart()).toBe(true);
    expect(consumeColdStart()).toBe(false);
    expect(consumeColdStart()).toBe(false);
  });

  it('resets to true for a fresh module instance (a new cold start)', () => {
    const first = require('@/lib/intro-gate');
    expect(first.consumeColdStart()).toBe(true);
    expect(first.consumeColdStart()).toBe(false);

    jest.resetModules();

    const second = require('@/lib/intro-gate');
    expect(second.consumeColdStart()).toBe(true);
  });
});
