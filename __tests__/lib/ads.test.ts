/**
 * Unit tests for lib/ads.ts — the rewarded-ad reward path.
 *
 * The module decides `adsEnabled` at import time from the platform, the Expo
 * execution environment, and whether the native SDK can be required. Each
 * scenario re-imports the module in isolation with mocked `react-native`,
 * `expo-constants`, `react-native-google-mobile-ads`, and `@/lib/lives`, so no
 * real native code is ever loaded. `watchAdForLife` must grant +1 life ONLY
 * when the SDK fires EARNED_REWARD before CLOSED — nothing on a bare dismiss, a
 * load/show error, or when ads are unavailable (Expo Go / web / missing SDK).
 */

type Listener = (payload?: unknown) => void;

interface AdsMock {
  module: {
    __esModule: true;
    default: () => { initialize: jest.Mock };
    RewardedAd: { createForAdRequest: jest.Mock };
    RewardedAdEventType: { LOADED: string; EARNED_REWARD: string };
    AdEventType: { CLOSED: string; ERROR: string };
  };
  listeners: Map<string, Listener>;
  rewarded: { addAdEventListener: jest.Mock; load: jest.Mock; show: jest.Mock };
  fire: (type: string, payload?: unknown) => void;
}

// Event key strings mirror the real enum values so the module's registrations
// land under the same keys the test drives.
const EVT = {
  LOADED: 'rewarded_loaded',
  EARNED_REWARD: 'rewarded_earned_reward',
  CLOSED: 'closed',
  ERROR: 'error',
};

function makeAdsMock(): AdsMock {
  const listeners = new Map<string, Listener>();
  const rewarded = {
    addAdEventListener: jest.fn((type: string, cb: Listener) => {
      listeners.set(type, cb);
      return () => listeners.delete(type);
    }),
    load: jest.fn(),
    show: jest.fn().mockResolvedValue(undefined),
  };
  return {
    module: {
      __esModule: true,
      default: () => ({ initialize: jest.fn().mockResolvedValue([]) }),
      RewardedAd: { createForAdRequest: jest.fn(() => rewarded) },
      RewardedAdEventType: { LOADED: EVT.LOADED, EARNED_REWARD: EVT.EARNED_REWARD },
      AdEventType: { CLOSED: EVT.CLOSED, ERROR: EVT.ERROR },
    },
    listeners,
    rewarded,
    fire: (type, payload) => listeners.get(type)?.(payload),
  };
}

const mockAddLives = jest.fn().mockResolvedValue(undefined);

interface LoadOptions {
  platform?: string;
  execEnv?: 'storeClient' | 'standalone';
  /** Provide a module factory; throw inside it to simulate a missing SDK. */
  adsFactory?: () => unknown;
}

function loadAds(opts: LoadOptions = {}): typeof import('@/lib/ads') {
  let mod!: typeof import('@/lib/ads');
  jest.isolateModules(() => {
    jest.doMock('react-native', () => ({ Platform: { OS: opts.platform ?? 'android' } }));
    jest.doMock('expo-constants', () => ({
      __esModule: true,
      default: { executionEnvironment: opts.execEnv ?? 'standalone' },
      ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
    }));
    jest.doMock('@/lib/lives', () => ({ addLives: (...a: unknown[]) => mockAddLives(...a) }));
    if (opts.adsFactory) {
      jest.doMock('react-native-google-mobile-ads', opts.adsFactory);
    }
    mod = require('@/lib/ads');
  });
  return mod;
}

/** Load the module ENABLED (Android standalone) with a drivable SDK mock. */
function loadEnabled(): { ads: typeof import('@/lib/ads'); sdk: AdsMock } {
  const sdk = makeAdsMock();
  const ads = loadAds({ platform: 'android', execEnv: 'standalone', adsFactory: () => sdk.module });
  return { ads, sdk };
}

afterEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  mockAddLives.mockClear().mockResolvedValue(undefined);
});

describe('adsEnabled gating', () => {
  it('is false on web (SDK never required)', () => {
    const sdk = makeAdsMock();
    const ads = loadAds({ platform: 'web', adsFactory: () => sdk.module });
    expect(ads.adsEnabled).toBe(false);
    expect(sdk.module.RewardedAd.createForAdRequest).not.toHaveBeenCalled();
  });

  it('is false on iOS (Android-only, placeholder app id)', () => {
    const sdk = makeAdsMock();
    const ads = loadAds({ platform: 'ios', adsFactory: () => sdk.module });
    expect(ads.adsEnabled).toBe(false);
  });

  it('is false in Expo Go (executionEnvironment === storeClient)', () => {
    const sdk = makeAdsMock();
    const ads = loadAds({ platform: 'android', execEnv: 'storeClient', adsFactory: () => sdk.module });
    expect(ads.adsEnabled).toBe(false);
  });

  it('is false when the native module is missing (require throws)', () => {
    const ads = loadAds({
      platform: 'android',
      execEnv: 'standalone',
      adsFactory: () => {
        throw new Error('Native module RNGoogleMobileAds not found');
      },
    });
    expect(ads.adsEnabled).toBe(false);
  });

  it('is true on a configured Android build and initializes the SDK', () => {
    const { ads } = loadEnabled();
    expect(ads.adsEnabled).toBe(true);
  });
});

describe('watchAdForLife — disabled (no ad can be served)', () => {
  it('returns "unavailable" and grants NOTHING on web', async () => {
    const ads = loadAds({ platform: 'web' });
    await expect(ads.watchAdForLife()).resolves.toBe('unavailable');
    expect(mockAddLives).not.toHaveBeenCalled();
  });

  it('returns "unavailable" and grants NOTHING in Expo Go', async () => {
    const sdk = makeAdsMock();
    const ads = loadAds({ platform: 'android', execEnv: 'storeClient', adsFactory: () => sdk.module });
    await expect(ads.watchAdForLife()).resolves.toBe('unavailable');
    expect(mockAddLives).not.toHaveBeenCalled();
    expect(sdk.module.RewardedAd.createForAdRequest).not.toHaveBeenCalled();
  });
});

describe('watchAdForLife — enabled (real rewarded flow)', () => {
  it('grants +1 life ONLY after EARNED_REWARD, then CLOSED', async () => {
    const { ads, sdk } = loadEnabled();
    const promise = ads.watchAdForLife();

    // Ad loads → the module shows it.
    sdk.fire(EVT.LOADED);
    expect(sdk.rewarded.show).toHaveBeenCalledTimes(1);

    // User earns the reward, then the ad closes.
    sdk.fire(EVT.EARNED_REWARD, { amount: 999, type: 'coins' }); // value ignored
    sdk.fire(EVT.CLOSED);

    await expect(promise).resolves.toBe('granted');
    expect(mockAddLives).toHaveBeenCalledTimes(1);
    expect(mockAddLives).toHaveBeenCalledWith(1); // always +1, ignoring AdMob amount
  });

  it('grants NOTHING when the ad is dismissed without earning', async () => {
    const { ads, sdk } = loadEnabled();
    const promise = ads.watchAdForLife();

    sdk.fire(EVT.LOADED);
    sdk.fire(EVT.CLOSED); // closed without EARNED_REWARD

    await expect(promise).resolves.toBe('no-reward');
    expect(mockAddLives).not.toHaveBeenCalled();
  });

  it('grants NOTHING on a load/show error (no-fill)', async () => {
    const { ads, sdk } = loadEnabled();
    const promise = ads.watchAdForLife();

    sdk.fire(EVT.ERROR, new Error('no-fill'));

    await expect(promise).resolves.toBe('no-reward');
    expect(mockAddLives).not.toHaveBeenCalled();
  });

  it('grants exactly once — a stray CLOSED after settling cannot double-grant', async () => {
    const { ads, sdk } = loadEnabled();
    const promise = ads.watchAdForLife();

    sdk.fire(EVT.LOADED);
    sdk.fire(EVT.EARNED_REWARD);
    sdk.fire(EVT.CLOSED);
    await promise;

    // Listeners are detached after settling; a late CLOSED is a no-op.
    sdk.fire(EVT.CLOSED);
    expect(mockAddLives).toHaveBeenCalledTimes(1);
  });
});
