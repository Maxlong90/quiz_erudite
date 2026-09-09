import { useState } from 'react';
import { router } from 'expo-router';

import { ScreenBackground } from '@/components/screen-background';
import { T_ONBOARDING_VARIANTS } from '@/components/t/onboarding';
import type { TOnboardingStep } from '@/components/t/onboarding/contract';
import { revenueCatEnabled } from '@/lib/revenuecat';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useOnboardingType } from '@/hooks/t/use-onboarding-type';
import { useTemplateCopy } from '@/hooks/t/use-template-copy';
import { T_ONBOARDING_DEFAULT } from '@/lib/onboarding/onboarding-type';

/**
 * The configurable template's onboarding HOST.
 *
 * It draws nothing. What lives here is everything with a consequence: the slide
 * list, which page the player is on, marking onboarding seen, the store-billing
 * gate, both route literals and the button's label. The pixels belong to a
 * variant under components/t/onboarding/, chosen by the backend-supplied
 * `onboarding_type` — see that directory's contract.ts for the ownership rule.
 *
 * That division is not filing. Keeping navigation up here is what keeps
 * __tests__/app/t-routes.test.ts's paywall-entry-point assertion pointed at a
 * file that really holds the literal, and keeps
 * __tests__/app/t-onboarding.test.tsx's markSeen()-before-navigate proof binding
 * on every variant that will ever exist, rather than on the one that happened to
 * be written first.
 *
 * MODELLED ON app/onboarding.tsx, NOT SHARED WITH IT
 * --------------------------------------------------
 * Same reasoning already recorded for app/t/index.tsx in
 * docs/configurable-template.md. The Erudite screen is shipped, largely
 * untested code carrying its own concerns — a language-picker back button, a
 * content-snapshot wait, the per-platform forced-paywall gate — none of which
 * belong to a template whose whole point is that an operator configures it.
 * Extracting a shared component would mean editing a file five live apps render
 * in order to add a sixth caller. The structure is copied; the code is not. The
 * host/variant split above is INTERNAL to the template and changes none of that.
 */

/**
 * The three intro slides. Keys are the existing `onboarding.*` set, which is
 * already complete in all four locales — the template introduces no new copy.
 *
 * They live here rather than in a variant because they are content: every
 * variant shows these three steps, and only disagrees about how.
 */
const SLIDES: TOnboardingStep[] = [
  {
    slot: 'onboarding/step1.png',
    titleKey: 'onboarding.page1.title',
    subtitleKey: 'onboarding.page1.subtitle',
  },
  {
    slot: 'onboarding/step2.png',
    titleKey: 'onboarding.page2.title',
    subtitleKey: 'onboarding.page2.subtitle',
  },
  {
    slot: 'onboarding/step3.png',
    titleKey: 'onboarding.page3.title',
    subtitleKey: 'onboarding.page3.subtitle',
  },
];

/** Slides plus the closing premium pitch, which owns the `paywall/hero` slot. */
const SLIDE_COUNT = SLIDES.length + 1;

export default function TTemplateOnboarding() {
  const [page, setPage] = useState(0);
  const { markSeen } = useOnboarding();
  const { t } = useTemplateCopy();

  // Already frozen at first render inside the hook, which is where that
  // decision is documented — swapping the variant mid-flow would remount the
  // screen and reset the page the player was on.
  const type = useOnboardingType();
  /**
   * Structural selection, never a name comparison — and the `??` is load-bearing
   * rather than defensive dressing. Э2/Э3 will repoint useOnboardingType() at a
   * different transport with different parsing guarantees, and `classic` is an
   * unconfirmed enum string besides (the backend may well omit the key for the
   * base shape rather than naming it), so a rename has to stay a one-constant
   * change. Never throw here: docs/configurable-template.md records the rule as
   * `reject a set you cannot half-apply; degrade a scalar you can`, and a
   * scalar naming a screen degrades to the screen that ships.
   */
  const Variant = T_ONBOARDING_VARIANTS[type] ?? T_ONBOARDING_VARIANTS[T_ONBOARDING_DEFAULT];

  const isPremiumSlide = page === SLIDE_COUNT - 1;
  // The closing slide only sells anything where a store can actually charge.
  // Without billing it degrades to a plain "get started", the same
  // capability-driven gating the Erudite flow uses — a build that cannot take
  // money must never show a pitch a reviewer would then be unable to complete.
  const offersPremium = isPremiumSlide && revenueCatEnabled;

  /**
   * Leave onboarding for good.
   *
   * markSeen() is awaited BEFORE navigating on every path, the paywall included,
   * and that ordering is deliberate rather than tidy. The paywall is PUSHED, not
   * replaced, so this screen stays mounted underneath it — and a player who
   * dismisses the paywall lands on /t, which is a fresh navigation rather than a
   * pop back to here. Marking first is what makes that a normal return home
   * instead of a second trip through onboarding: the flag is already written by
   * the time any of those transitions can run, whatever order they arrive in.
   *
   * (Until app/t/paywall.tsx existed this ordering also papered over a harder
   * bug — the Erudite paywall exits via `router.replace('/')`, which on a
   * template build redirects to /t/splash and sent the player back through the
   * splash. The ported paywall exits to '/t' directly, so that hazard is gone.)
   */
  async function leave(to: '/t' | '/t/paywall') {
    await markSeen();
    if (to === '/t/paywall') {
      router.push(to);
      return;
    }
    router.replace(to);
  }

  async function onPrimaryPress() {
    if (isPremiumSlide) {
      await leave(offersPremium ? '/t/paywall' : '/t');
      return;
    }
    // Advancing the page is all the host does; moving the pixels to match is the
    // variant's job, and how it does that is its own business.
    setPage(page + 1);
  }

  const primaryLabel = offersPremium
    ? t('paywall.cta')
    : isPremiumSlide
      ? t('onboarding.start')
      : t('onboarding.next');

  return (
    <ScreenBackground>
      <Variant
        steps={SLIDES}
        premiumSlot="paywall/hero.png"
        // Brand-neutral copy on purpose. `paywall.title` reads "Quizzzes
        // Premium" in every locale, and this template ships under whatever name
        // an operator gives it — so the pitch borrows the two existing keys that
        // name a benefit rather than a brand. No new strings.
        premiumTitleKey="paywall.subtitle"
        premiumSubtitleKey="paywall.feature.unlimited"
        page={page}
        pageCount={SLIDE_COUNT}
        primaryLabel={primaryLabel}
        skipLabel={t('onboarding.skip')}
        t={t}
        onPrimaryPress={onPrimaryPress}
        onSkip={() => leave('/t')}
        onPageChange={setPage}
      />
    </ScreenBackground>
  );
}
