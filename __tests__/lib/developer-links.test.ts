/**
 * "Other apps" must open the PUBLISHER's page (every app we ship), not one
 * hardcoded sibling listing — otherwise each new release needs an app update to
 * become reachable. The App Store artist id below was read off the live listing
 * (itunes lookup -> artistId) and is NOT the Apple Team ID; these lock it in so a
 * copy-paste of some app id cannot quietly replace it.
 */
import { getDeveloperLinks } from '@/lib/store-links';

const DEV_ID = '6787385688';        // publisher (Maryia Pyzhyk)
const ERUDITE_APP_ID = '6787385686'; // a specific app — must NOT be linked here

describe('getDeveloperLinks — iOS', () => {
  const links = getDeveloperLinks('ios');

  it('points at the developer page, not at a single app listing', () => {
    expect(links.url).toBe(`https://apps.apple.com/developer/id${DEV_ID}`);
    expect(links.url).toContain('/developer/');
    expect(links.url).not.toContain(ERUDITE_APP_ID);
    expect(links.url).not.toContain('/app/');
  });

  it('deep-links into the App Store app at the same page', () => {
    expect(links.deepLink).toBe(`itms-apps://apps.apple.com/developer/id${DEV_ID}`);
  });

  it('omits the storefront locale and the name slug, so a rename cannot 404 it', () => {
    // Apple 301s the id-only form to /{locale}/developer/{slug}/id…
    expect(links.url).not.toMatch(/apps\.apple\.com\/[a-z]{2}\//);
    expect(links.url).not.toContain('maryia');
  });
});

describe('getDeveloperLinks — Android', () => {
  const links = getDeveloperLinks('android');

  it('never sends an Android device to an App Store URL', () => {
    // The button used to open apps.apple.com on every platform.
    expect(links.url).not.toContain('apps.apple.com');
    expect(links.deepLink).not.toContain('itms-apps');
  });

  it('falls back to our Play listing while the Play publisher id is unknown', () => {
    expect(links.url).toBe('https://play.google.com/store/apps/details?id=com.quizzzes.erudite');
    expect(links.deepLink).toBe('market://details?id=com.quizzzes.erudite');
  });
});
