import { getAndroidPackage, getStoreLinks } from '@/lib/store-links';

const IOS_URL = 'https://apps.apple.com/us/app/erudite-quiz-trivia-crac-daily/id6787385686';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.foo.bar';

const DEFAULT_APP_STORE_URL = 'https://apps.apple.com/app/id0000000000';
const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.quizzzes.erudite';

describe('getStoreLinks — iOS', () => {
  it('uses the filled listing URL and derives the review deep link from its id', () => {
    const links = getStoreLinks({ app_url_ios: IOS_URL }, 'ios');
    expect(links.storeUrl).toBe(IOS_URL);
    expect(links.rateFallbackUrl).toBe(IOS_URL);
    expect(links.rateDeepLink).toBe(
      'itms-apps://itunes.apple.com/app/id6787385686?action=write-review',
    );
  });

  it('falls back to DEFAULT store URL + deep link when the field is empty', () => {
    const links = getStoreLinks({ app_url_ios: '' }, 'ios');
    expect(links.storeUrl).toBe(DEFAULT_APP_STORE_URL);
    expect(links.rateFallbackUrl).toBe(DEFAULT_APP_STORE_URL);
    expect(links.rateDeepLink).toBe(
      'itms-apps://itunes.apple.com/app/id0000000000?action=write-review',
    );
  });

  it('falls back to DEFAULT store URL + deep link when app config is null/undefined', () => {
    for (const app of [null, undefined]) {
      const links = getStoreLinks(app, 'ios');
      expect(links.storeUrl).toBe(DEFAULT_APP_STORE_URL);
      expect(links.rateDeepLink).toBe(
        'itms-apps://itunes.apple.com/app/id0000000000?action=write-review',
      );
    }
  });

  it('keeps the filled URL but uses the fallback deep link when the id cannot be parsed', () => {
    const malformed = 'https://apps.apple.com/us/app/some-app';
    const links = getStoreLinks({ app_url_ios: malformed }, 'ios');
    expect(links.storeUrl).toBe(malformed);
    expect(links.rateDeepLink).toBe(
      'itms-apps://itunes.apple.com/app/id0000000000?action=write-review',
    );
  });
});

describe('getStoreLinks — Android', () => {
  it('uses the filled listing URL and derives market:// from its package', () => {
    const links = getStoreLinks({ app_url_android: ANDROID_URL }, 'android');
    expect(links.storeUrl).toBe(ANDROID_URL);
    expect(links.rateFallbackUrl).toBe(ANDROID_URL);
    expect(links.rateDeepLink).toBe('market://details?id=com.foo.bar');
  });

  it('falls back to DEFAULT play URL + package when the field is empty', () => {
    const links = getStoreLinks({ app_url_android: '' }, 'android');
    expect(links.storeUrl).toBe(DEFAULT_PLAY_STORE_URL);
    expect(links.rateDeepLink).toBe('market://details?id=com.quizzzes.erudite');
  });

  it('falls back to the DEFAULT package when the URL carries no ?id=', () => {
    const noId = 'https://play.google.com/store/apps/details';
    const links = getStoreLinks({ app_url_android: noId }, 'android');
    expect(links.storeUrl).toBe(noId);
    expect(links.rateDeepLink).toBe('market://details?id=com.quizzzes.erudite');
  });

  it('parses the package even when other query params follow', () => {
    const links = getStoreLinks(
      { app_url_android: 'https://play.google.com/store/apps/details?id=com.foo.bar&hl=en' },
      'android',
    );
    expect(links.rateDeepLink).toBe('market://details?id=com.foo.bar');
  });
});

describe('getAndroidPackage', () => {
  it('extracts the package from a Play Store URL', () => {
    expect(getAndroidPackage({ app_url_android: ANDROID_URL })).toBe('com.foo.bar');
  });

  it('returns the DEFAULT bundle id when empty or unparseable', () => {
    expect(getAndroidPackage({ app_url_android: '' })).toBe('com.quizzzes.erudite');
    expect(getAndroidPackage(null)).toBe('com.quizzzes.erudite');
    expect(getAndroidPackage({ app_url_android: 'https://example.com/no-id' })).toBe(
      'com.quizzzes.erudite',
    );
  });
});
