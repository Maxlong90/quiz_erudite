import type { SupportedLocale } from '@/hooks/use-locale';

export type StringKey =
  // splash
  | 'splash.tagline'
  // language picker
  | 'language.title'
  | 'language.subtitle'
  // onboarding
  | 'onboarding.skip'
  | 'onboarding.next'
  | 'onboarding.start'
  | 'onboarding.page1.title'
  | 'onboarding.page1.subtitle'
  | 'onboarding.page2.title'
  | 'onboarding.page2.subtitle'
  | 'onboarding.page3.title'
  | 'onboarding.page3.subtitle'
  // settings
  | 'settings.title'
  | 'settings.language'
  | 'settings.section.preferences'
  | 'settings.section.account'
  | 'settings.section.help'
  | 'settings.section.about'
  | 'settings.section.share'
  | 'settings.darkMode'
  | 'settings.restorePurchases'
  | 'settings.subscriptionManagement'
  | 'settings.contactUs'
  | 'settings.recommend'
  | 'settings.rateUs'
  | 'settings.privacyPolicy'
  | 'settings.termsOfUse'
  | 'settings.recommend.text'
  | 'settings.restorePurchases.titleAlert'
  | 'settings.restorePurchases.messageAlert'
  | 'settings.restorePurchases.dismiss'
  | 'settings.signIn'
  | 'settings.signIn.titleAlert'
  | 'settings.signIn.messageAlert'
  | 'settings.languageModal.title'
  | 'settings.appearance'
  | 'settings.appearanceModal.title'
  | 'settings.theme.light'
  | 'settings.theme.dark'
  | 'settings.version'
  | 'common.cancel'
  | 'lives.outOf.title'
  | 'lives.outOf.body'
  | 'lives.outOf.watchAd'
  | 'lives.outOf.watching'
  | 'lives.outOf.buy'
  | 'lives.outOf.later'
  | 'ads.failed.title'
  | 'ads.failed.body'
  | 'buyLives.title'
  | 'buyLives.subtitle'
  | 'account.title'
  | 'account.premiumBadge'
  | 'account.tab.signup'
  | 'account.tab.login'
  | 'account.email'
  | 'account.password'
  | 'account.signup.cta'
  | 'account.login.cta'
  | 'account.or'
  | 'account.apple'
  | 'account.google'
  | 'account.signup.hint'
  | 'account.login.hint'
  | 'account.soon.title'
  | 'account.soon.body'
  | 'lives.claim.title'
  | 'lives.claim.body'
  | 'lives.claim.cta'
  | 'lives.claim.claiming'
  | 'lives.claim.later'
  | 'lives.info.title'
  | 'lives.info.dismiss'
  | 'lives.info.daily.title'
  | 'lives.info.daily.subtitle'
  | 'lives.info.ad.title'
  | 'lives.info.ad.subtitle'
  | 'lives.info.buy.title'
  | 'lives.info.buy.subtitle'
  | 'hintsInfo.title'
  | 'hintsInfo.dismiss'
  | 'hintsInfo.balanceSection'
  | 'hintsInfo.sourcesSection'
  | 'hintsInfo.fiftyFifty.title'
  | 'hintsInfo.fiftyFifty.subtitle'
  | 'hintsInfo.statistics.title'
  | 'hintsInfo.statistics.subtitle'
  | 'hintsInfo.replaceQuestion.title'
  | 'hintsInfo.replaceQuestion.subtitle'
  | 'hintsInfo.source.ad.title'
  | 'hintsInfo.source.ad.subtitle'
  | 'hintsInfo.source.buy.title'
  | 'hintsInfo.source.buy.subtitle'
  // in-quiz hint bar (short button labels + feedback)
  | 'hint.fiftyFifty'
  | 'hint.statistics'
  | 'hint.replaceQuestion'
  | 'hint.replaceQuestion.unavailable'
  | 'shareQuestion.helper'
  | 'shareQuestion.footer'
  | 'shop.title'
  | 'shop.balance.lives'
  | 'shop.balance.hints'
  | 'shop.section.freeLives'
  | 'shop.section.lives'
  | 'shop.section.hints'
  | 'shop.section.combo'
  | 'shop.freeLives.title'
  | 'shop.freeLives.subtitle'
  | 'shop.freeLives.cta'
  | 'shop.freeLives.watching'
  | 'shop.thanks.title'
  | 'shop.thanks.body'
  | 'shop.error.title'
  | 'shop.error.body'
  | 'shop.lives.small.title'
  | 'shop.lives.small.subtitle'
  | 'shop.lives.medium.title'
  | 'shop.lives.medium.subtitle'
  | 'shop.lives.large.title'
  | 'shop.lives.large.subtitle'
  | 'shop.hints.small.title'
  | 'shop.hints.small.subtitle'
  | 'shop.hints.medium.title'
  | 'shop.hints.medium.subtitle'
  | 'shop.hints.large.title'
  | 'shop.hints.large.subtitle'
  | 'shop.combo.small.title'
  | 'shop.combo.small.subtitle'
  | 'shop.combo.medium.title'
  | 'shop.combo.medium.subtitle'
  | 'shop.combo.large.title'
  | 'shop.combo.large.subtitle'
  // home
  | 'home.tile.soon'
  | 'home.tile.meta'
  | 'home.tile.coming.title'
  | 'home.tile.coming.meta'
  | 'home.error.load'
  | 'home.tabs.categories'
  | 'home.tabs.modes'
  | 'home.mode.random10.title'
  | 'home.mode.random10.subtitle'
  | 'home.mode.byTopic.title'
  | 'home.mode.byTopic.subtitle'
  | 'home.mode.timed.title'
  | 'home.mode.timed.subtitle'
  | 'home.mode.challenge.title'
  | 'home.mode.challenge.subtitle'
  | 'home.mode.survival.title'
  | 'home.mode.survival.subtitle'
  | 'home.mode.mistakes.title'
  | 'home.mode.mistakes.subtitle'
  | 'home.mode.hard.title'
  | 'home.mode.hard.subtitle'
  | 'home.mode.flashcards.title'
  | 'home.mode.flashcards.subtitle'
  | 'home.mode.today.title'
  | 'home.mode.today.subtitle'
  | 'home.mode.timeLimit.title'
  | 'home.mode.timeLimit.subtitle'
  | 'home.mode.mistakes.empty'
  | 'home.timeLimit.subtitle'
  | 'home.config.start'
  | 'home.config.byTopic.title'
  | 'home.config.timed.title'
  | 'home.config.flashcards.title'
  // stats
  | 'stats.title'
  | 'stats.empty.title'
  | 'stats.empty.subtitle'
  | 'stats.totalActivity'
  | 'stats.quizzesTaken'
  | 'stats.totalTime'
  | 'stats.timePerQuestion'
  | 'stats.accuracy'
  | 'stats.correct'
  | 'stats.mistakes'
  | 'stats.viewedBySubject'
  | 'stats.performanceBySubject'
  | 'stats.headerSubject'
  | 'stats.headerViewed'
  | 'stats.headerTotal'
  | 'stats.totalRow'
  | 'achievements.title'
  | 'achievements.level'
  | 'achievements.maxLevel'
  | 'achievements.locked'
  | 'achievements.unlocked.title'
  | 'achievements.unlocked.cta'
  | 'achievements.activity.title'
  | 'achievements.activity.subtitle'
  | 'achievements.knowledge.title'
  | 'achievements.knowledge.subtitle'
  | 'achievements.accuracy.title'
  | 'achievements.accuracy.subtitle'
  | 'achievements.time.title'
  | 'achievements.time.subtitle'
  | 'achievements.explorer.title'
  | 'achievements.explorer.subtitle'
  | 'achievements.mistakes.title'
  | 'achievements.mistakes.subtitle'
  | 'achievements.perfect.title'
  | 'achievements.perfect.subtitle'
  | 'achievements.unlocked.share'
  | 'achievements.share.text'
  | 'home.hard.modalTitle'
  | 'home.hard.modalSubtitle'
  | 'home.hard.typing.title'
  | 'home.hard.typing.subtitle'
  | 'home.hard.letters.title'
  | 'home.hard.letters.subtitle'
  | 'hard.typing.placeholder'
  | 'hard.typing.lengthHint'
  | 'hard.letters.assemble'
  | 'hard.letters.available'
  | 'hard.check'
  // quiz
  | 'quiz.loading'
  | 'quiz.error.title'
  | 'quiz.error.retry'
  | 'quiz.error.home'
  | 'quiz.next'
  | 'quiz.results'
  // results
  | 'results.title'
  | 'results.scoreLabel'
  | 'results.playAgain'
  | 'results.home'
  | 'results.messageExcellent'
  | 'results.messageGood'
  | 'results.messageKeepGoing'
  // report
  | 'report.title'
  | 'report.subtitle'
  | 'report.commentPlaceholder'
  | 'report.cancel'
  | 'report.submit'
  | 'report.done'
  | 'report.successTitle'
  | 'report.successBody'
  | 'report.helper'
  | 'report.error'
  | 'report.reason.incorrect_answer'
  | 'report.reason.unclear_wording'
  | 'report.reason.inappropriate'
  | 'report.reason.broken_media'
  | 'report.reason.translation_issue'
  | 'report.reason.other'
  // paywall
  | 'paywall.title'
  | 'paywall.subtitle'
  | 'paywall.feature.unlimited'
  | 'paywall.feature.adfree'
  | 'paywall.feature.alllanguages'
  | 'paywall.feature.exclusive'
  | 'paywall.cta'
  | 'paywall.tier.weekly'
  | 'paywall.tier.monthly'
  | 'paywall.tier.yearly'
  | 'paywall.price.perWeek'
  | 'paywall.price.perMonth'
  | 'paywall.price.perYear'
  | 'paywall.badge.bestValue'
  | 'paywall.badge.save'
  | 'paywall.continueFree'
  | 'paywall.disclaimer'
  | 'paywall.thanks'
  | 'paywall.col.free'
  | 'paywall.col.premium'
  | 'paywall.row.lives'
  | 'paywall.row.lives.free'
  | 'paywall.row.lives.premium'
  | 'paywall.row.ad'
  | 'paywall.row.ad.free'
  | 'paywall.row.ad.premium'
  | 'paywall.row.modes'
  | 'paywall.row.flashcards'
  | 'paywall.row.stats'
  | 'paywall.row.stats.free'
  | 'paywall.row.stats.premium'
  | 'paywall.reviewAccess'
  | 'paywall.review.title'
  | 'paywall.review.subtitle'
  | 'paywall.review.login'
  | 'paywall.review.password'
  | 'paywall.review.submit'
  | 'paywall.review.cancel'
  | 'paywall.review.invalid'
  | 'paywall.review.networkError'
  | 'paywall.restore'
  | 'paywall.restore.none.title'
  | 'paywall.restore.none.body'
  | 'paywall.error.title'
  | 'paywall.error.body'
  // quiz mode picker
  | 'mode.title'
  | 'mode.daily.title'
  | 'mode.daily.subtitle'
  | 'mode.random.title'
  | 'mode.random.subtitle'
  | 'mode.quick.title'
  | 'mode.quick.subtitle'
  | 'mode.timed.title'
  | 'mode.timed.subtitle'
  | 'mode.timed.questionsLabel'
  | 'mode.timed.startCta'
  | 'mode.survival.title'
  | 'mode.survival.subtitle'
  | 'mode.flashcards.title'
  | 'mode.flashcards.subtitle'
  | 'mode.lockedSoon'
  // timed quiz
  | 'quiz.timeUp'
  // survival
  | 'quiz.survival.streak'
  | 'quiz.survival.over';

type Bundle = Record<StringKey, string>;

export const STRINGS: Record<SupportedLocale, Bundle> = {
  en: {
    'splash.tagline': 'Sharpen your mind',
    'language.title': 'Choose your language',
    'language.subtitle': 'You can change this later in Settings',

    'onboarding.skip': 'Skip',
    'onboarding.next': 'Next',
    'onboarding.start': 'Get started',
    'onboarding.page1.title': 'Sharpen your mind',
    'onboarding.page1.subtitle':
      'Discover new facts and test what you know across the topics you love.',
    'onboarding.page2.title': 'Pick your topics',
    'onboarding.page2.subtitle':
      'Geography, history, science, arts, sports — play what you actually like.',
    'onboarding.page3.title': 'Track your progress',
    'onboarding.page3.subtitle':
      'Earn points, keep your streak alive, and climb the leaderboard.',

    'settings.title': 'Settings',
    'settings.language': 'Language',
    'settings.section.preferences': 'Preferences',
    'settings.section.account': 'Account',
    'settings.section.help': 'Help',
    'settings.section.about': 'About',
    'settings.section.share': 'Spread the word',
    'settings.darkMode': 'Dark mode',
    'settings.restorePurchases': 'Restore purchases',
    'settings.subscriptionManagement': 'Manage subscription',
    'settings.contactUs': 'Contact us',
    'settings.recommend': 'Recommend to a friend',
    'settings.rateUs': 'Rate us',
    'settings.privacyPolicy': 'Privacy policy',
    'settings.termsOfUse': 'Terms of use',
    'settings.recommend.text': 'I’ve been playing Quizzes — check it out!',
    'settings.restorePurchases.titleAlert': 'No purchases to restore',
    'settings.restorePurchases.messageAlert': 'In-app purchases are not connected yet in this build.',
    'settings.restorePurchases.dismiss': 'OK',
    'settings.signIn': 'Sign in',
    'settings.signIn.titleAlert': 'Sign in is coming soon',
    'settings.signIn.messageAlert': 'Accounts will be optional — keep your progress across devices once signed in.',
    'settings.languageModal.title': 'Choose language',
    'settings.appearance': 'Appearance',
    'settings.appearanceModal.title': 'Appearance',
    'settings.theme.light': 'Light',
    'settings.theme.dark': 'Dark',
    'settings.version': 'Version',
    'common.cancel': 'Cancel',

    'lives.outOf.title': 'Out of lives',
    'lives.outOf.body': 'Lives refill daily, or you can grab more right now.',
    'lives.outOf.watchAd': 'Watch ad for +1 life',
    'lives.outOf.watching': 'Loading ad…',
    'lives.outOf.buy': 'Buy lives',
    'lives.outOf.later': 'Maybe later',
    'ads.failed.title': 'No reward',
    'ads.failed.body': "The ad wasn't finished, so no life was added. Please try again.",
    'buyLives.title': 'Get more lives',
    'buyLives.subtitle': 'Top up and keep playing',
    'account.title': 'Account',
    'account.premiumBadge': 'Premium active',
    'account.tab.signup': 'Sign up',
    'account.tab.login': 'Log in',
    'account.email': 'Email',
    'account.password': 'Password',
    'account.signup.cta': 'Create account',
    'account.login.cta': 'Log in',
    'account.or': 'or',
    'account.apple': 'Continue with Apple',
    'account.google': 'Continue with Google',
    'account.signup.hint': 'Already have an account? Log in',
    'account.login.hint': "Don't have an account? Sign up",
    'account.soon.title': 'Almost there',
    'account.soon.body': 'Accounts are not connected yet in this build — coming soon.',
    'lives.claim.title': 'Daily bonus',
    'lives.claim.body': 'Come back tomorrow for 10 more.',
    'lives.claim.cta': 'Claim 10 lives',
    'lives.claim.claiming': 'Claiming…',
    'lives.claim.later': 'Skip for now',
    'lives.info.title': 'How to get more lives',
    'lives.info.dismiss': 'Got it',
    'lives.info.daily.title': '+{n} every day',
    'lives.info.daily.subtitle': 'Open the app once a day and tap Claim. Skip a day, miss a day — no make-up.',
    'lives.info.ad.title': 'Watch a short ad',
    'lives.info.ad.subtitle': 'Each rewarded video grants +1 life.',
    'lives.info.buy.title': 'Buy a bundle',
    'lives.info.buy.subtitle': 'Lives bundles in the shop scale from 10 to 100.',

    'hintsInfo.title': 'Your hints',
    'hintsInfo.dismiss': 'Got it',
    'hintsInfo.balanceSection': 'What you have left',
    'hintsInfo.sourcesSection': 'How to get more',
    'hintsInfo.fiftyFifty.title': '50/50',
    'hintsInfo.fiftyFifty.subtitle': 'Removes two wrong options, leaving one right and one wrong',
    'hintsInfo.statistics.title': 'Player stats',
    'hintsInfo.statistics.subtitle': 'Shows how often other players pick each option',
    'hintsInfo.replaceQuestion.title': 'Replace question',
    'hintsInfo.replaceQuestion.subtitle': 'Swaps in a fresh question from the same topic',
    'hintsInfo.source.ad.title': 'Watch a short ad',
    'hintsInfo.source.ad.subtitle': 'Each rewarded video grants a hint.',
    'hintsInfo.source.buy.title': 'Buy a bundle',
    'hintsInfo.source.buy.subtitle': 'Hint bundles in the shop pack 5 to 20 of each type.',
    'hint.fiftyFifty': '50/50',
    'hint.statistics': 'Stats',
    'hint.replaceQuestion': 'Swap',
    'hint.replaceQuestion.unavailable': 'No other question to swap in right now.',
    'shareQuestion.helper': 'Share this question',
    'shareQuestion.footer': '📱 Play Quizzzes - Sharpen your Mind — {url}',

    'shop.title': 'Shop',
    'shop.balance.lives': 'Lives',
    'shop.balance.hints': 'Hints',
    'shop.section.freeLives': 'Free lives',
    'shop.section.lives': 'Lives bundles',
    'shop.section.hints': 'Hint bundles',
    'shop.section.combo': 'Combo bundles',
    'shop.freeLives.title': 'Watch a short video',
    'shop.freeLives.subtitle': '+1 life — once per ad break.',
    'shop.freeLives.cta': 'Watch',
    'shop.freeLives.watching': 'Loading…',
    'shop.thanks.title': 'Thanks!',
    'shop.thanks.body': 'Your purchase has been added.',
    'shop.error.title': 'Purchase failed',
    'shop.error.body': 'Please try again.',
    'shop.lives.small.title': '10 lives',
    'shop.lives.small.subtitle': 'A short play session',
    'shop.lives.medium.title': '30 lives',
    'shop.lives.medium.subtitle': 'A weekend of quizzes',
    'shop.lives.large.title': '100 lives',
    'shop.lives.large.subtitle': 'Best value',
    'shop.hints.small.title': '5 of each',
    'shop.hints.small.subtitle': '15 hints across 3 types',
    'shop.hints.medium.title': '10 of each',
    'shop.hints.medium.subtitle': '30 hints across 3 types',
    'shop.hints.large.title': '20 of each',
    'shop.hints.large.subtitle': '60 hints across 3 types',
    'shop.combo.small.title': '10 lives + 5 hints',
    'shop.combo.small.subtitle': '10 lives & 5 of each hint',
    'shop.combo.medium.title': '30 lives + 10 hints',
    'shop.combo.medium.subtitle': '30 lives & 10 of each hint',
    'shop.combo.large.title': '100 lives + 20 hints',
    'shop.combo.large.subtitle': '100 lives & 20 of each hint',

    'home.tile.soon': 'Coming soon',
    'home.tile.meta': '{questions} questions · {topics} topics',
    'home.tile.coming.title': 'More categories',
    'home.tile.coming.meta': 'Coming soon',
    'home.error.load': "Couldn't load categories",
    'home.tabs.categories': 'Categories',
    'home.tabs.modes': 'Modes',
    'home.mode.random10.title': '10 random questions',
    'home.mode.random10.subtitle': 'A quick mix from every topic',
    'home.mode.byTopic.title': 'Quiz by topic',
    'home.mode.byTopic.subtitle': 'Pick a category to focus on',
    'home.mode.timed.title': 'Timed quiz',
    'home.mode.timed.subtitle': 'Beat the clock on every question',
    'home.mode.challenge.title': 'Challenge',
    'home.mode.challenge.subtitle': 'All-or-nothing run',
    'home.mode.survival.title': 'Survival mode',
    'home.mode.survival.subtitle': "One mistake and you're out",
    'home.mode.mistakes.title': 'Mistakes',
    'home.mode.mistakes.subtitle': 'Replay questions you got wrong',
    'home.mode.hard.title': 'Hard quiz',
    'home.mode.hard.subtitle': 'Only the tough ones',
    'home.mode.flashcards.title': 'Flashcards',
    'home.mode.flashcards.subtitle': 'Browse to learn, no scoring',
    'home.mode.today.title': "Today's question",
    'home.mode.today.subtitle': 'A single random question',
    'home.mode.timeLimit.title': 'Time limit',
    'home.mode.timeLimit.subtitle': 'Total time is what matters',
    'home.mode.mistakes.empty': 'No mistakes yet',
    'home.timeLimit.subtitle': 'Pick how long the whole quiz lasts',
    'home.config.start': 'Start quiz',
    'home.config.byTopic.title': 'Quiz by topic',
    'home.config.timed.title': 'Timed quiz',
    'home.config.flashcards.title': 'Flashcards',

    'stats.title': 'Quiz stats',
    'stats.empty.title': 'No stats yet',
    'stats.empty.subtitle': 'Finish a quiz to start tracking your progress',
    'stats.totalActivity': 'Total activity',
    'stats.quizzesTaken': 'Quizzes taken',
    'stats.totalTime': 'Quiz time',
    'stats.timePerQuestion': 'Time per question',
    'stats.accuracy': 'Accuracy',
    'stats.correct': 'Correct',
    'stats.mistakes': 'Mistakes',
    'stats.viewedBySubject': 'Questions seen by subject',
    'stats.performanceBySubject': 'Performance by subject',
    'stats.headerSubject': 'Subject',
    'stats.headerViewed': 'Seen',
    'stats.headerTotal': 'Total',
    'stats.totalRow': 'Total',

    'achievements.title': 'Achievements',
    'achievements.level': 'LEVEL {n}',
    'achievements.maxLevel': 'MAX',
    'achievements.locked': 'Locked',
    'achievements.unlocked.title': 'Achievement unlocked',
    'achievements.unlocked.cta': 'Awesome',
    'achievements.activity.title': 'Quiz champion',
    'achievements.activity.subtitle': 'Complete quizzes',
    'achievements.knowledge.title': 'Knowledge seeker',
    'achievements.knowledge.subtitle': 'Answer questions',
    'achievements.accuracy.title': 'Sharp shooter',
    'achievements.accuracy.subtitle': 'Get correct answers',
    'achievements.time.title': 'Time scholar',
    'achievements.time.subtitle': 'Time spent learning',
    'achievements.explorer.title': 'Explorer',
    'achievements.explorer.subtitle': 'Touch different subjects',
    'achievements.mistakes.title': 'Learning from mistakes',
    'achievements.mistakes.subtitle': 'Mistakes recorded',
    'achievements.perfect.title': 'Perfect run',
    'achievements.perfect.subtitle': 'Quizzes finished without a single miss',
    'achievements.unlocked.share': 'Share',
    'achievements.share.text': "I just unlocked '{title}' — Level {level} on Quizzes!",

    'home.hard.modalTitle': 'Hard quiz',
    'home.hard.modalSubtitle': 'Pick how you want to enter answers',
    'home.hard.typing.title': 'Type the answer',
    'home.hard.typing.subtitle': 'Type each letter yourself',
    'home.hard.letters.title': 'Assemble from letters',
    'home.hard.letters.subtitle': 'Tap the right letters in order',
    'hard.typing.placeholder': 'Type your answer…',
    'hard.typing.lengthHint': 'Hint: {n} characters',
    'hard.letters.assemble': 'Assemble the word from letters',
    'hard.letters.available': 'Available letters',
    'hard.check': 'Check answer',

    'quiz.loading': 'Loading questions...',
    'quiz.error.title': 'Something went wrong',
    'quiz.error.retry': 'Try Again',
    'quiz.error.home': 'Go Home',
    'quiz.next': 'Next',
    'quiz.results': 'See Results',

    'results.title': 'Quiz Complete!',
    'results.scoreLabel': '{score} of {total}',
    'results.playAgain': 'Play Again',
    'results.home': 'Home',
    'results.messageExcellent': "Excellent! You're a true erudite!",
    'results.messageGood': 'Good job! Keep learning.',
    'results.messageKeepGoing': "Keep practicing, you'll get there!",

    'report.title': 'Report a problem',
    'report.subtitle': "What's wrong with this item?",
    'report.commentPlaceholder': 'Add details (optional)',
    'report.cancel': 'Cancel',
    'report.submit': 'Send report',
    'report.done': 'Done',
    'report.successTitle': 'Thanks for the report',
    'report.successBody': "We'll review it and clean up the content.",
    'report.helper': 'Report a problem with this question',
    'report.error': "Couldn't send the report",
    'report.reason.incorrect_answer': 'Incorrect answer',
    'report.reason.unclear_wording': 'Unclear or poorly worded',
    'report.reason.inappropriate': 'Inappropriate content',
    'report.reason.broken_media': "Image or audio doesn't load",
    'report.reason.translation_issue': 'Translation issue',
    'report.reason.other': 'Other',

    'paywall.title': 'Quizzzes Premium',
    'paywall.subtitle': 'Unlock the full experience',
    'paywall.feature.unlimited': 'Unlimited quizzes every day',
    'paywall.feature.adfree': 'Ad-free, distraction-free',
    'paywall.feature.alllanguages': 'All languages and topics',
    'paywall.feature.exclusive': 'Exclusive premium-only categories',
    'paywall.cta': 'Continue',
    'paywall.tier.weekly': 'Weekly',
    'paywall.tier.monthly': 'Monthly',
    'paywall.tier.yearly': 'Yearly',
    'paywall.price.perWeek': '/wk',
    'paywall.price.perMonth': '/mo',
    'paywall.price.perYear': '/yr',
    'paywall.badge.bestValue': 'Best value',
    'paywall.badge.save': 'Save {percent}%',
    'paywall.continueFree': 'Maybe later',
    'paywall.disclaimer': 'Cancel anytime in App Store settings.',
    'paywall.thanks': 'Welcome to Premium 🎉',
    'paywall.col.free': 'Free',
    'paywall.col.premium': 'Premium',
    'paywall.row.lives': 'Lives per day',
    'paywall.row.lives.free': '10',
    'paywall.row.lives.premium': '20',
    'paywall.row.ad': 'Watch ad',
    'paywall.row.ad.free': '+1 life',
    'paywall.row.ad.premium': '+2 lives',
    'paywall.row.modes': 'Quiz modes',
    'paywall.row.flashcards': 'Flashcards',
    'paywall.row.stats': 'Stats',
    'paywall.row.stats.free': 'Basic',
    'paywall.row.stats.premium': 'Advanced',
    'paywall.reviewAccess': 'App reviewer access — unlock to test premium',
    'paywall.review.title': 'Reviewer access',
    'paywall.review.subtitle': 'Enter the credentials from the review instructions to unlock premium.',
    'paywall.review.login': 'Login',
    'paywall.review.password': 'Password',
    'paywall.review.submit': 'Unlock',
    'paywall.review.cancel': 'Cancel',
    'paywall.review.invalid': 'Invalid login or password.',
    'paywall.review.networkError': 'Connection error. Please try again.',
    'paywall.restore': 'Restore Purchases',
    'paywall.restore.none.title': 'Nothing to restore',
    'paywall.restore.none.body': 'No active Premium subscription was found for this account.',
    'paywall.error.title': 'Purchase failed',
    'paywall.error.body': 'Something went wrong. Please try again.',

    'mode.title': 'Choose a mode',
    'mode.daily.title': "Today's question",
    'mode.daily.subtitle': 'A single question to keep you sharp',
    'mode.random.title': 'Random question',
    'mode.random.subtitle': 'A random question from this category',
    'mode.quick.title': 'Quick quiz',
    'mode.quick.subtitle': '10 questions, no time limit',
    'mode.timed.title': 'Timed quiz',
    'mode.timed.subtitle': '30 seconds per question',
    'mode.timed.questionsLabel': 'Questions',
    'mode.timed.startCta': 'Start',
    'mode.survival.title': 'Survival',
    'mode.survival.subtitle': 'One mistake and the run is over',
    'mode.flashcards.title': 'Flashcards',
    'mode.flashcards.subtitle': 'Browse cards to study at your pace',
    'mode.lockedSoon': 'Coming soon',

    'quiz.timeUp': "Time's up!",
    'quiz.survival.streak': 'Streak',
    'quiz.survival.over': 'Run ended at question {n}',
  },
  es: {
    'splash.tagline': 'Afina tu mente',
    'language.title': 'Elige tu idioma',
    'language.subtitle': 'Puedes cambiarlo en Ajustes',

    'onboarding.skip': 'Omitir',
    'onboarding.next': 'Siguiente',
    'onboarding.start': 'Empezar',
    'onboarding.page1.title': 'Afina tu mente',
    'onboarding.page1.subtitle':
      'Descubre datos nuevos y pon a prueba tus conocimientos en tus temas favoritos.',
    'onboarding.page2.title': 'Elige tus temas',
    'onboarding.page2.subtitle':
      'Geografía, historia, ciencia, arte, deportes y más: juega a lo que de verdad te gusta.',
    'onboarding.page3.title': 'Sigue tu progreso',
    'onboarding.page3.subtitle':
      'Gana puntos, mantén tu racha y sube en la tabla de clasificación.',

    'settings.title': 'Ajustes',
    'settings.language': 'Idioma',
    'settings.section.preferences': 'Preferencias',
    'settings.section.account': 'Cuenta',
    'settings.section.help': 'Ayuda',
    'settings.section.about': 'Acerca de',
    'settings.section.share': 'Compártelo',
    'settings.darkMode': 'Modo oscuro',
    'settings.restorePurchases': 'Restaurar compras',
    'settings.subscriptionManagement': 'Gestionar suscripción',
    'settings.contactUs': 'Contáctanos',
    'settings.recommend': 'Recomendar a un amigo',
    'settings.rateUs': 'Califícanos',
    'settings.privacyPolicy': 'Política de privacidad',
    'settings.termsOfUse': 'Términos de uso',
    'settings.recommend.text': 'Estoy jugando Quizzes — ¡échale un vistazo!',
    'settings.restorePurchases.titleAlert': 'Nada que restaurar',
    'settings.restorePurchases.messageAlert': 'Las compras integradas aún no están conectadas en esta build.',
    'settings.restorePurchases.dismiss': 'OK',
    'settings.signIn': 'Iniciar sesión',
    'settings.signIn.titleAlert': 'Inicio de sesión próximamente',
    'settings.signIn.messageAlert': 'Las cuentas serán opcionales — guarda tu progreso entre dispositivos cuando inicies sesión.',
    'settings.languageModal.title': 'Elige el idioma',
    'settings.appearance': 'Apariencia',
    'settings.appearanceModal.title': 'Apariencia',
    'settings.theme.light': 'Claro',
    'settings.theme.dark': 'Oscuro',
    'settings.version': 'Versión',
    'common.cancel': 'Cancelar',

    'lives.outOf.title': 'Sin vidas',
    'lives.outOf.body': 'Las vidas se recargan a diario, o consigue más ahora.',
    'lives.outOf.watchAd': 'Ver anuncio por +1 vida',
    'lives.outOf.watching': 'Cargando anuncio…',
    'lives.outOf.buy': 'Comprar vidas',
    'lives.outOf.later': 'Quizá luego',
    'ads.failed.title': 'Sin recompensa',
    'ads.failed.body': 'No terminaste el anuncio, así que no se añadió ninguna vida. Inténtalo de nuevo.',
    'buyLives.title': 'Consigue más vidas',
    'buyLives.subtitle': 'Recarga y sigue jugando',
    'account.title': 'Cuenta',
    'account.premiumBadge': 'Premium activo',
    'account.tab.signup': 'Registrarse',
    'account.tab.login': 'Entrar',
    'account.email': 'Correo',
    'account.password': 'Contraseña',
    'account.signup.cta': 'Crear cuenta',
    'account.login.cta': 'Entrar',
    'account.or': 'o',
    'account.apple': 'Continuar con Apple',
    'account.google': 'Continuar con Google',
    'account.signup.hint': '¿Ya tienes cuenta? Entra',
    'account.login.hint': '¿No tienes cuenta? Regístrate',
    'account.soon.title': 'Casi listo',
    'account.soon.body': 'Las cuentas aún no están conectadas en esta build — próximamente.',
    'lives.claim.title': 'Bono diario',
    'lives.claim.body': 'Vuelve mañana para 10 más.',
    'lives.claim.cta': 'Recoger 10 vidas',
    'lives.claim.claiming': 'Recogiendo…',
    'lives.claim.later': 'Ahora no',
    'lives.info.title': 'Cómo conseguir más vidas',
    'lives.info.dismiss': 'Entendido',
    'lives.info.daily.title': '+{n} cada día',
    'lives.info.daily.subtitle': 'Abre la app una vez al día y toca Recoger. Si te saltas un día, lo pierdes.',
    'lives.info.ad.title': 'Mira un anuncio corto',
    'lives.info.ad.subtitle': 'Cada vídeo te da +1 vida.',
    'lives.info.buy.title': 'Compra un paquete',
    'lives.info.buy.subtitle': 'Los paquetes en la tienda van de 10 a 100 vidas.',

    'hintsInfo.title': 'Tus pistas',
    'hintsInfo.dismiss': 'Entendido',
    'hintsInfo.balanceSection': 'Lo que te queda',
    'hintsInfo.sourcesSection': 'Cómo conseguir más',
    'hintsInfo.fiftyFifty.title': '50/50',
    'hintsInfo.fiftyFifty.subtitle': 'Quita dos opciones incorrectas, deja una correcta y una incorrecta',
    'hintsInfo.statistics.title': 'Estadísticas',
    'hintsInfo.statistics.subtitle': 'Muestra cuánto eligen cada opción otros jugadores',
    'hintsInfo.replaceQuestion.title': 'Cambiar pregunta',
    'hintsInfo.replaceQuestion.subtitle': 'Trae otra pregunta del mismo tema',
    'hintsInfo.source.ad.title': 'Mira un anuncio corto',
    'hintsInfo.source.ad.subtitle': 'Cada vídeo te da una pista.',
    'hintsInfo.source.buy.title': 'Compra un paquete',
    'hintsInfo.source.buy.subtitle': 'Los paquetes incluyen de 5 a 20 pistas de cada tipo.',
    'hint.fiftyFifty': '50/50',
    'hint.statistics': 'Datos',
    'hint.replaceQuestion': 'Cambiar',
    'hint.replaceQuestion.unavailable': 'No hay otra pregunta para cambiar ahora.',
    'shareQuestion.helper': 'Compartir esta pregunta',
    'shareQuestion.footer': '📱 Play Quizzzes - Sharpen your Mind — {url}',

    'shop.title': 'Tienda',
    'shop.balance.lives': 'Vidas',
    'shop.balance.hints': 'Pistas',
    'shop.section.freeLives': 'Vidas gratis',
    'shop.section.lives': 'Paquetes de vidas',
    'shop.section.hints': 'Paquetes de pistas',
    'shop.section.combo': 'Paquetes combo',
    'shop.freeLives.title': 'Mira un vídeo corto',
    'shop.freeLives.subtitle': '+1 vida — una vez por pausa.',
    'shop.freeLives.cta': 'Ver',
    'shop.freeLives.watching': 'Cargando…',
    'shop.thanks.title': '¡Gracias!',
    'shop.thanks.body': 'Tu compra se ha añadido.',
    'shop.error.title': 'Compra fallida',
    'shop.error.body': 'Inténtalo de nuevo.',
    'shop.lives.small.title': '10 vidas',
    'shop.lives.small.subtitle': 'Una sesión corta',
    'shop.lives.medium.title': '30 vidas',
    'shop.lives.medium.subtitle': 'Un fin de semana de quizzes',
    'shop.lives.large.title': '100 vidas',
    'shop.lives.large.subtitle': 'Mejor valor',
    'shop.hints.small.title': '5 de cada',
    'shop.hints.small.subtitle': '15 pistas en 3 tipos',
    'shop.hints.medium.title': '10 de cada',
    'shop.hints.medium.subtitle': '30 pistas en 3 tipos',
    'shop.hints.large.title': '20 de cada',
    'shop.hints.large.subtitle': '60 pistas en 3 tipos',
    'shop.combo.small.title': '10 vidas + 5 pistas',
    'shop.combo.small.subtitle': '10 vidas y 5 de cada pista',
    'shop.combo.medium.title': '30 vidas + 10 pistas',
    'shop.combo.medium.subtitle': '30 vidas y 10 de cada pista',
    'shop.combo.large.title': '100 vidas + 20 pistas',
    'shop.combo.large.subtitle': '100 vidas y 20 de cada pista',

    'home.tile.soon': 'Próximamente',
    'home.tile.meta': '{questions} preguntas · {topics} temas',
    'home.tile.coming.title': 'Más categorías',
    'home.tile.coming.meta': 'Próximamente',
    'home.error.load': 'No se pudieron cargar las categorías',
    'home.tabs.categories': 'Categorías',
    'home.tabs.modes': 'Modos',
    'home.mode.random10.title': '10 preguntas al azar',
    'home.mode.random10.subtitle': 'Una mezcla rápida de todos los temas',
    'home.mode.byTopic.title': 'Quiz por tema',
    'home.mode.byTopic.subtitle': 'Elige una categoría para enfocarte',
    'home.mode.timed.title': 'Quiz contrarreloj',
    'home.mode.timed.subtitle': 'Vence al reloj en cada pregunta',
    'home.mode.challenge.title': 'Reto',
    'home.mode.challenge.subtitle': 'Todo o nada',
    'home.mode.survival.title': 'Modo supervivencia',
    'home.mode.survival.subtitle': 'Un error y se acabó',
    'home.mode.mistakes.title': 'Errores',
    'home.mode.mistakes.subtitle': 'Repite las preguntas falladas',
    'home.mode.hard.title': 'Quiz difícil',
    'home.mode.hard.subtitle': 'Solo las preguntas más duras',
    'home.mode.flashcards.title': 'Tarjetas',
    'home.mode.flashcards.subtitle': 'Estudia a tu ritmo, sin puntuación',
    'home.mode.today.title': 'Pregunta del día',
    'home.mode.today.subtitle': 'Una pregunta al azar',
    'home.mode.timeLimit.title': 'Tiempo límite',
    'home.mode.timeLimit.subtitle': 'Lo que cuenta es el tiempo total',
    'home.mode.mistakes.empty': 'Aún no hay errores',
    'home.timeLimit.subtitle': 'Elige cuánto dura el quiz entero',
    'home.config.start': 'Empezar quiz',
    'home.config.byTopic.title': 'Quiz por tema',
    'home.config.timed.title': 'Quiz contrarreloj',
    'home.config.flashcards.title': 'Tarjetas',

    'stats.title': 'Estadísticas',
    'stats.empty.title': 'Sin estadísticas todavía',
    'stats.empty.subtitle': 'Completa un quiz para empezar a registrar tu progreso',
    'stats.totalActivity': 'Actividad total',
    'stats.quizzesTaken': 'Quizzes jugados',
    'stats.totalTime': 'Tiempo de quiz',
    'stats.timePerQuestion': 'Tiempo por pregunta',
    'stats.accuracy': 'Precisión',
    'stats.correct': 'Correctas',
    'stats.mistakes': 'Errores',
    'stats.viewedBySubject': 'Preguntas vistas por tema',
    'stats.performanceBySubject': 'Rendimiento por tema',
    'stats.headerSubject': 'Tema',
    'stats.headerViewed': 'Vistas',
    'stats.headerTotal': 'Total',
    'stats.totalRow': 'Total',

    'achievements.title': 'Logros',
    'achievements.level': 'NIVEL {n}',
    'achievements.maxLevel': 'MAX',
    'achievements.locked': 'Bloqueado',
    'achievements.unlocked.title': 'Logro desbloqueado',
    'achievements.unlocked.cta': '¡Genial!',
    'achievements.activity.title': 'Campeón de quiz',
    'achievements.activity.subtitle': 'Completa quizzes',
    'achievements.knowledge.title': 'Sed de saber',
    'achievements.knowledge.subtitle': 'Responde preguntas',
    'achievements.accuracy.title': 'Tirador certero',
    'achievements.accuracy.subtitle': 'Respuestas correctas',
    'achievements.time.title': 'Cronista',
    'achievements.time.subtitle': 'Tiempo aprendiendo',
    'achievements.explorer.title': 'Explorador',
    'achievements.explorer.subtitle': 'Toca distintos temas',
    'achievements.mistakes.title': 'Aprende de los errores',
    'achievements.mistakes.subtitle': 'Errores registrados',
    'achievements.perfect.title': 'Carrera perfecta',
    'achievements.perfect.subtitle': 'Quizzes terminados sin un solo error',
    'achievements.unlocked.share': 'Compartir',
    'achievements.share.text': "¡Acabo de desbloquear '{title}' — Nivel {level} en Quizzes!",

    'home.hard.modalTitle': 'Quiz difícil',
    'home.hard.modalSubtitle': 'Elige cómo introducir las respuestas',
    'home.hard.typing.title': 'Escribe la respuesta',
    'home.hard.typing.subtitle': 'Teclea cada letra tú mismo',
    'home.hard.letters.title': 'Arma con letras',
    'home.hard.letters.subtitle': 'Pulsa las letras en orden',
    'hard.typing.placeholder': 'Escribe la respuesta…',
    'hard.typing.lengthHint': 'Pista: {n} caracteres',
    'hard.letters.assemble': 'Arma la palabra con letras',
    'hard.letters.available': 'Letras disponibles',
    'hard.check': 'Comprobar',

    'quiz.loading': 'Cargando preguntas...',
    'quiz.error.title': 'Algo salió mal',
    'quiz.error.retry': 'Intentar de nuevo',
    'quiz.error.home': 'Ir al inicio',
    'quiz.next': 'Siguiente',
    'quiz.results': 'Ver resultados',

    'results.title': '¡Quiz terminado!',
    'results.scoreLabel': '{score} de {total}',
    'results.playAgain': 'Volver a jugar',
    'results.home': 'Inicio',
    'results.messageExcellent': '¡Excelente! Eres un verdadero erudito.',
    'results.messageGood': '¡Buen trabajo! Sigue aprendiendo.',
    'results.messageKeepGoing': '¡Sigue practicando, lo lograrás!',

    'report.title': 'Reportar un problema',
    'report.subtitle': '¿Qué tiene de malo este elemento?',
    'report.commentPlaceholder': 'Añade detalles (opcional)',
    'report.cancel': 'Cancelar',
    'report.submit': 'Enviar reporte',
    'report.done': 'Listo',
    'report.successTitle': 'Gracias por el reporte',
    'report.successBody': 'Lo revisaremos y limpiaremos el contenido.',
    'report.helper': 'Reportar un problema con esta pregunta',
    'report.error': 'No se pudo enviar el reporte',
    'report.reason.incorrect_answer': 'Respuesta incorrecta',
    'report.reason.unclear_wording': 'Pregunta poco clara',
    'report.reason.inappropriate': 'Contenido inapropiado',
    'report.reason.broken_media': 'La imagen o el audio no carga',
    'report.reason.translation_issue': 'Problema de traducción',
    'report.reason.other': 'Otro',

    'paywall.title': 'Quizzzes Premium',
    'paywall.subtitle': 'Desbloquea la experiencia completa',
    'paywall.feature.unlimited': 'Quizzes ilimitados cada día',
    'paywall.feature.adfree': 'Sin anuncios, sin distracciones',
    'paywall.feature.alllanguages': 'Todos los idiomas y temas',
    'paywall.feature.exclusive': 'Categorías exclusivas para Premium',
    'paywall.cta': 'Continuar',
    'paywall.tier.weekly': 'Semanal',
    'paywall.tier.monthly': 'Mensual',
    'paywall.tier.yearly': 'Anual',
    'paywall.price.perWeek': '/sem',
    'paywall.price.perMonth': '/mes',
    'paywall.price.perYear': '/año',
    'paywall.badge.bestValue': 'Mejor valor',
    'paywall.badge.save': 'Ahorra {percent}%',
    'paywall.continueFree': 'Quizá más tarde',
    'paywall.disclaimer': 'Cancela cuando quieras en los ajustes del App Store.',
    'paywall.thanks': 'Bienvenido a Premium 🎉',
    'paywall.col.free': 'Gratis',
    'paywall.col.premium': 'Premium',
    'paywall.row.lives': 'Vidas por día',
    'paywall.row.lives.free': '10',
    'paywall.row.lives.premium': '20',
    'paywall.row.ad': 'Ver anuncio',
    'paywall.row.ad.free': '+1 vida',
    'paywall.row.ad.premium': '+2 vidas',
    'paywall.row.modes': 'Modos de quiz',
    'paywall.row.flashcards': 'Tarjetas',
    'paywall.row.stats': 'Estadísticas',
    'paywall.row.stats.free': 'Básicas',
    'paywall.row.stats.premium': 'Avanzadas',
    'paywall.reviewAccess': 'Acceso para revisor — desbloquear para probar premium',
    'paywall.review.title': 'Acceso para revisor',
    'paywall.review.subtitle': 'Introduce las credenciales de las instrucciones de revisión para desbloquear premium.',
    'paywall.review.login': 'Usuario',
    'paywall.review.password': 'Contraseña',
    'paywall.review.submit': 'Desbloquear',
    'paywall.review.cancel': 'Cancelar',
    'paywall.review.invalid': 'Usuario o contraseña no válidos.',
    'paywall.review.networkError': 'Error de conexión. Inténtalo de nuevo.',
    'paywall.restore': 'Restaurar compras',
    'paywall.restore.none.title': 'Nada que restaurar',
    'paywall.restore.none.body': 'No se encontró ninguna suscripción Premium activa para esta cuenta.',
    'paywall.error.title': 'Error en la compra',
    'paywall.error.body': 'Algo salió mal. Inténtalo de nuevo.',

    'mode.title': 'Elige un modo',
    'mode.daily.title': 'Pregunta del día',
    'mode.daily.subtitle': 'Una pregunta para entrenar la mente',
    'mode.random.title': 'Pregunta aleatoria',
    'mode.random.subtitle': 'Una pregunta al azar de esta categoría',
    'mode.quick.title': 'Quiz rápido',
    'mode.quick.subtitle': '10 preguntas, sin límite de tiempo',
    'mode.timed.title': 'Quiz cronometrado',
    'mode.timed.subtitle': '30 segundos por pregunta',
    'mode.timed.questionsLabel': 'Preguntas',
    'mode.timed.startCta': 'Empezar',
    'mode.survival.title': 'Supervivencia',
    'mode.survival.subtitle': 'Un error y se acabó',
    'mode.flashcards.title': 'Flashcards',
    'mode.flashcards.subtitle': 'Estudia tarjetas a tu ritmo',
    'mode.lockedSoon': 'Próximamente',

    'quiz.timeUp': '¡Se acabó el tiempo!',
    'quiz.survival.streak': 'Racha',
    'quiz.survival.over': 'Racha terminada en la pregunta {n}',
  },
  ru: {
    'splash.tagline': 'Прокачай эрудицию',
    'language.title': 'Выберите язык',
    'language.subtitle': 'Изменить можно в настройках',

    'onboarding.skip': 'Пропустить',
    'onboarding.next': 'Далее',
    'onboarding.start': 'Начать',
    'onboarding.page1.title': 'Прокачай эрудицию',
    'onboarding.page1.subtitle':
      'Узнавай новое и проверяй знания в самых интересных темах каждый день.',
    'onboarding.page2.title': 'Выбирай любимые темы',
    'onboarding.page2.subtitle':
      'География, история, наука, искусство, спорт и не только — играй в то, что нравится.',
    'onboarding.page3.title': 'Следи за прогрессом',
    'onboarding.page3.subtitle':
      'Зарабатывай очки, удерживай серию и поднимайся в рейтинге эрудитов.',

    'settings.title': 'Настройки',
    'settings.language': 'Язык',
    'settings.section.preferences': 'Предпочтения',
    'settings.section.account': 'Аккаунт',
    'settings.section.help': 'Помощь',
    'settings.section.about': 'О приложении',
    'settings.section.share': 'Поделиться',
    'settings.darkMode': 'Тёмная тема',
    'settings.restorePurchases': 'Восстановить покупки',
    'settings.subscriptionManagement': 'Управление подпиской',
    'settings.contactUs': 'Связаться с нами',
    'settings.recommend': 'Рекомендовать другу',
    'settings.rateUs': 'Оценить',
    'settings.privacyPolicy': 'Политика конфиденциальности',
    'settings.termsOfUse': 'Условия использования',
    'settings.recommend.text': 'Играю в Quizzes — попробуй!',
    'settings.restorePurchases.titleAlert': 'Нечего восстанавливать',
    'settings.restorePurchases.messageAlert': 'Встроенные покупки в этой сборке ещё не подключены.',
    'settings.restorePurchases.dismiss': 'OK',
    'settings.signIn': 'Войти',
    'settings.signIn.titleAlert': 'Вход скоро',
    'settings.signIn.messageAlert': 'Аккаунт необязателен — после входа прогресс будет синхронизироваться между устройствами.',
    'settings.languageModal.title': 'Выбор языка',
    'settings.appearance': 'Оформление',
    'settings.appearanceModal.title': 'Оформление',
    'settings.theme.light': 'Светлая',
    'settings.theme.dark': 'Тёмная',
    'settings.version': 'Версия',
    'common.cancel': 'Отмена',

    'lives.outOf.title': 'Закончились жизни',
    'lives.outOf.body': 'Жизни пополняются каждый день, либо можно докупить прямо сейчас.',
    'lives.outOf.watchAd': 'Видео за +1 жизнь',
    'lives.outOf.watching': 'Загружаем рекламу…',
    'lives.outOf.buy': 'Купить жизни',
    'lives.outOf.later': 'Позже',
    'ads.failed.title': 'Награда не начислена',
    'ads.failed.body': 'Реклама не была досмотрена, поэтому жизнь не начислена. Попробуйте ещё раз.',
    'buyLives.title': 'Получить жизни',
    'buyLives.subtitle': 'Пополни и продолжай играть',
    'account.title': 'Аккаунт',
    'account.premiumBadge': 'Премиум активен',
    'account.tab.signup': 'Регистрация',
    'account.tab.login': 'Вход',
    'account.email': 'Почта',
    'account.password': 'Пароль',
    'account.signup.cta': 'Создать аккаунт',
    'account.login.cta': 'Войти',
    'account.or': 'или',
    'account.apple': 'Продолжить с Apple',
    'account.google': 'Продолжить с Google',
    'account.signup.hint': 'Уже есть аккаунт? Войти',
    'account.login.hint': 'Нет аккаунта? Зарегистрироваться',
    'account.soon.title': 'Почти готово',
    'account.soon.body': 'Аккаунты в этой сборке ещё не подключены — скоро.',
    'lives.claim.title': 'Ежедневный бонус',
    'lives.claim.body': 'Заходи завтра — будет ещё 10.',
    'lives.claim.cta': 'Забрать 10 жизней',
    'lives.claim.claiming': 'Забираем…',
    'lives.claim.later': 'Пока пропустить',
    'lives.info.title': 'Как получить ещё жизни',
    'lives.info.dismiss': 'Понятно',
    'lives.info.daily.title': '+{n} каждый день',
    'lives.info.daily.subtitle': 'Заходи в приложение и нажимай Забрать. Пропустил день — пропустил жизни.',
    'lives.info.ad.title': 'Посмотри короткое видео',
    'lives.info.ad.subtitle': 'Каждая реклама даёт +1 жизнь.',
    'lives.info.buy.title': 'Купи пакет',
    'lives.info.buy.subtitle': 'В магазине пакеты от 10 до 100 жизней.',

    'hintsInfo.title': 'Твои подсказки',
    'hintsInfo.dismiss': 'Понятно',
    'hintsInfo.balanceSection': 'Сколько осталось',
    'hintsInfo.sourcesSection': 'Как получить ещё',
    'hintsInfo.fiftyFifty.title': '50/50',
    'hintsInfo.fiftyFifty.subtitle': 'Убирает два неверных варианта — остаётся верный и один неверный',
    'hintsInfo.statistics.title': 'Статистика',
    'hintsInfo.statistics.subtitle': 'Покажет, как часто игроки выбирают каждый ответ',
    'hintsInfo.replaceQuestion.title': 'Заменить вопрос',
    'hintsInfo.replaceQuestion.subtitle': 'Подставит другой вопрос той же темы',
    'hintsInfo.source.ad.title': 'Посмотри короткое видео',
    'hintsInfo.source.ad.subtitle': 'Каждая реклама даёт подсказку.',
    'hintsInfo.source.buy.title': 'Купи пакет',
    'hintsInfo.source.buy.subtitle': 'В магазине пакеты по 5–20 подсказок каждого типа.',
    'hint.fiftyFifty': '50/50',
    'hint.statistics': 'Статы',
    'hint.replaceQuestion': 'Замена',
    'hint.replaceQuestion.unavailable': 'Сейчас нет другого вопроса для замены.',
    'shareQuestion.helper': 'Поделиться вопросом',
    'shareQuestion.footer': '📱 Play Quizzzes - Sharpen your Mind — {url}',

    'shop.title': 'Магазин',
    'shop.balance.lives': 'Жизни',
    'shop.balance.hints': 'Подсказки',
    'shop.section.freeLives': 'Бесплатные жизни',
    'shop.section.lives': 'Пакеты жизней',
    'shop.section.hints': 'Пакеты подсказок',
    'shop.section.combo': 'Комбо-наборы',
    'shop.freeLives.title': 'Посмотри короткое видео',
    'shop.freeLives.subtitle': '+1 жизнь — раз за рекламную паузу.',
    'shop.freeLives.cta': 'Смотреть',
    'shop.freeLives.watching': 'Загружаем…',
    'shop.thanks.title': 'Спасибо!',
    'shop.thanks.body': 'Покупка добавлена.',
    'shop.error.title': 'Покупка не прошла',
    'shop.error.body': 'Попробуй ещё раз.',
    'shop.lives.small.title': '10 жизней',
    'shop.lives.small.subtitle': 'Короткая сессия',
    'shop.lives.medium.title': '30 жизней',
    'shop.lives.medium.subtitle': 'На выходные',
    'shop.lives.large.title': '100 жизней',
    'shop.lives.large.subtitle': 'Лучшая цена',
    'shop.hints.small.title': 'По 5 каждой',
    'shop.hints.small.subtitle': '15 подсказок трёх типов',
    'shop.hints.medium.title': 'По 10 каждой',
    'shop.hints.medium.subtitle': '30 подсказок трёх типов',
    'shop.hints.large.title': 'По 20 каждой',
    'shop.hints.large.subtitle': '60 подсказок трёх типов',
    'shop.combo.small.title': '10 жизней + 5 подсказок',
    'shop.combo.small.subtitle': '10 жизней и по 5 каждой подсказки',
    'shop.combo.medium.title': '30 жизней + 10 подсказок',
    'shop.combo.medium.subtitle': '30 жизней и по 10 каждой подсказки',
    'shop.combo.large.title': '100 жизней + 20 подсказок',
    'shop.combo.large.subtitle': '100 жизней и по 20 каждой подсказки',

    'home.tile.soon': 'Скоро',
    'home.tile.meta': '{questions} вопросов · {topics} тем',
    'home.tile.coming.title': 'Новые категории',
    'home.tile.coming.meta': 'Скоро',
    'home.error.load': 'Не удалось загрузить категории',
    'home.tabs.categories': 'Категории',
    'home.tabs.modes': 'Режимы',
    'home.mode.random10.title': '10 случайных',
    'home.mode.random10.subtitle': 'Быстрая подборка по всем темам',
    'home.mode.byTopic.title': 'Квиз по темам',
    'home.mode.byTopic.subtitle': 'Выбери категорию и играй',
    'home.mode.timed.title': 'На время',
    'home.mode.timed.subtitle': 'Опереди таймер на каждом вопросе',
    'home.mode.challenge.title': 'Челлендж',
    'home.mode.challenge.subtitle': 'Всё или ничего',
    'home.mode.survival.title': 'Выживание',
    'home.mode.survival.subtitle': 'Одна ошибка — и финиш',
    'home.mode.mistakes.title': 'Ошибки',
    'home.mode.mistakes.subtitle': 'Повторим, что было неверно',
    'home.mode.hard.title': 'Сложный квиз',
    'home.mode.hard.subtitle': 'Только самые трудные',
    'home.mode.flashcards.title': 'Карточки',
    'home.mode.flashcards.subtitle': 'Учись в своём темпе, без счёта',
    'home.mode.today.title': 'Вопрос дня',
    'home.mode.today.subtitle': 'Один случайный вопрос',
    'home.mode.timeLimit.title': 'Лимит времени',
    'home.mode.timeLimit.subtitle': 'Главное — общее время',
    'home.mode.mistakes.empty': 'Пока без ошибок',
    'home.timeLimit.subtitle': 'Сколько длится весь квиз',
    'home.config.start': 'Начать квиз',
    'home.config.byTopic.title': 'Квиз по темам',
    'home.config.timed.title': 'Квиз на время',
    'home.config.flashcards.title': 'Карточки',

    'stats.title': 'Статистика',
    'stats.empty.title': 'Статистики пока нет',
    'stats.empty.subtitle': 'Сыграй один квиз, чтобы начать копить прогресс',
    'stats.totalActivity': 'Всего',
    'stats.quizzesTaken': 'Сыграно квизов',
    'stats.totalTime': 'Время в квизах',
    'stats.timePerQuestion': 'На вопрос',
    'stats.accuracy': 'Точность',
    'stats.correct': 'Правильно',
    'stats.mistakes': 'Ошибки',
    'stats.viewedBySubject': 'Увидено по темам',
    'stats.performanceBySubject': 'Точность по темам',
    'stats.headerSubject': 'Тема',
    'stats.headerViewed': 'Видел',
    'stats.headerTotal': 'Всего',
    'stats.totalRow': 'Итого',

    'achievements.title': 'Достижения',
    'achievements.level': 'УРОВЕНЬ {n}',
    'achievements.maxLevel': 'МАКС',
    'achievements.locked': 'Закрыто',
    'achievements.unlocked.title': 'Достижение получено',
    'achievements.unlocked.cta': 'Круто!',
    'achievements.activity.title': 'Чемпион квизов',
    'achievements.activity.subtitle': 'Сыграй квизы',
    'achievements.knowledge.title': 'Жажда знаний',
    'achievements.knowledge.subtitle': 'Ответь на вопросы',
    'achievements.accuracy.title': 'Меткий стрелок',
    'achievements.accuracy.subtitle': 'Правильные ответы',
    'achievements.time.title': 'Хроникёр',
    'achievements.time.subtitle': 'Время в квизах',
    'achievements.explorer.title': 'Исследователь',
    'achievements.explorer.subtitle': 'Затронь разные темы',
    'achievements.mistakes.title': 'Учиться на ошибках',
    'achievements.mistakes.subtitle': 'Ошибки в копилке',
    'achievements.perfect.title': 'Без единой ошибки',
    'achievements.perfect.subtitle': 'Квизы со 100% результатом',
    'achievements.unlocked.share': 'Поделиться',
    'achievements.share.text': 'Получил «{title}» — уровень {level} в Quizzes!',

    'home.hard.modalTitle': 'Сложный квиз',
    'home.hard.modalSubtitle': 'Как вводить ответы',
    'home.hard.typing.title': 'Напечатать ответ',
    'home.hard.typing.subtitle': 'Вводи каждую букву сам',
    'home.hard.letters.title': 'Собрать из букв',
    'home.hard.letters.subtitle': 'Тапай буквы по порядку',
    'hard.typing.placeholder': 'Введи ответ…',
    'hard.typing.lengthHint': 'Подсказка: {n} букв',
    'hard.letters.assemble': 'Собери слово из букв',
    'hard.letters.available': 'Доступные буквы',
    'hard.check': 'Проверить',

    'quiz.loading': 'Загружаем вопросы...',
    'quiz.error.title': 'Что-то пошло не так',
    'quiz.error.retry': 'Попробовать снова',
    'quiz.error.home': 'На главную',
    'quiz.next': 'Дальше',
    'quiz.results': 'Результат',

    'results.title': 'Квиз завершён!',
    'results.scoreLabel': '{score} из {total}',
    'results.playAgain': 'Сыграть снова',
    'results.home': 'На главную',
    'results.messageExcellent': 'Великолепно! Настоящий эрудит.',
    'results.messageGood': 'Хороший результат! Продолжай учиться.',
    'results.messageKeepGoing': 'Тренируйся ещё — у тебя получится!',

    'report.title': 'Сообщить о проблеме',
    'report.subtitle': 'Что не так с этим вопросом?',
    'report.commentPlaceholder': 'Подробности (по желанию)',
    'report.cancel': 'Отмена',
    'report.submit': 'Отправить',
    'report.done': 'Готово',
    'report.successTitle': 'Спасибо за репорт',
    'report.successBody': 'Мы проверим и поправим контент.',
    'report.helper': 'Пожаловаться на этот вопрос',
    'report.error': 'Не удалось отправить репорт',
    'report.reason.incorrect_answer': 'Неверный ответ',
    'report.reason.unclear_wording': 'Непонятная формулировка',
    'report.reason.inappropriate': 'Неуместный контент',
    'report.reason.broken_media': 'Не загружается картинка или звук',
    'report.reason.translation_issue': 'Проблема с переводом',
    'report.reason.other': 'Другое',

    'paywall.title': 'Quizzzes Premium',
    'paywall.subtitle': 'Открой полный опыт',
    'paywall.feature.unlimited': 'Безлимит квизов каждый день',
    'paywall.feature.adfree': 'Без рекламы и отвлечений',
    'paywall.feature.alllanguages': 'Все языки и темы',
    'paywall.feature.exclusive': 'Эксклюзивные категории для Premium',
    'paywall.cta': 'Продолжить',
    'paywall.tier.weekly': 'Неделя',
    'paywall.tier.monthly': 'Месяц',
    'paywall.tier.yearly': 'Год',
    'paywall.price.perWeek': '/нед',
    'paywall.price.perMonth': '/мес',
    'paywall.price.perYear': '/год',
    'paywall.badge.bestValue': 'Выгодно',
    'paywall.badge.save': 'Скидка {percent}%',
    'paywall.continueFree': 'Может, позже',
    'paywall.disclaimer': 'Отмена в любой момент в настройках App Store.',
    'paywall.thanks': 'Добро пожаловать в Premium 🎉',
    'paywall.col.free': 'Free',
    'paywall.col.premium': 'Premium',
    'paywall.row.lives': 'Жизней в день',
    'paywall.row.lives.free': '10',
    'paywall.row.lives.premium': '20',
    'paywall.row.ad': 'Реклама',
    'paywall.row.ad.free': '+1 жизнь',
    'paywall.row.ad.premium': '+2 жизни',
    'paywall.row.modes': 'Режимы квиза',
    'paywall.row.flashcards': 'Карточки',
    'paywall.row.stats': 'Статистика',
    'paywall.row.stats.free': 'Basic',
    'paywall.row.stats.premium': 'Advanced',
    'paywall.reviewAccess': 'Доступ для проверяющего — открыть премиум для теста',
    'paywall.review.title': 'Доступ для проверяющего',
    'paywall.review.subtitle': 'Введите логин и пароль из инструкции для проверки, чтобы открыть премиум.',
    'paywall.review.login': 'Логин',
    'paywall.review.password': 'Пароль',
    'paywall.review.submit': 'Открыть',
    'paywall.review.cancel': 'Отмена',
    'paywall.review.invalid': 'Неверный логин или пароль.',
    'paywall.review.networkError': 'Ошибка соединения. Попробуйте ещё раз.',
    'paywall.restore': 'Восстановить покупки',
    'paywall.restore.none.title': 'Нечего восстанавливать',
    'paywall.restore.none.body': 'Активная подписка Premium для этого аккаунта не найдена.',
    'paywall.error.title': 'Ошибка покупки',
    'paywall.error.body': 'Что-то пошло не так. Попробуйте ещё раз.',

    'mode.title': 'Выберите режим',
    'mode.daily.title': 'Вопрос дня',
    'mode.daily.subtitle': 'Один вопрос, чтобы держать форму',
    'mode.random.title': 'Рандомный вопрос',
    'mode.random.subtitle': 'Случайный вопрос из этой категории',
    'mode.quick.title': 'Быстрый квиз',
    'mode.quick.subtitle': '10 вопросов без таймера',
    'mode.timed.title': 'На время',
    'mode.timed.subtitle': '30 секунд на вопрос',
    'mode.timed.questionsLabel': 'Вопросов',
    'mode.timed.startCta': 'Начать',
    'mode.survival.title': 'На выживание',
    'mode.survival.subtitle': 'Одна ошибка — и игра окончена',
    'mode.flashcards.title': 'Карточки',
    'mode.flashcards.subtitle': 'Изучай карточки в своём темпе',
    'mode.lockedSoon': 'Скоро',

    'quiz.timeUp': 'Время вышло!',
    'quiz.survival.streak': 'Серия',
    'quiz.survival.over': 'Серия прервана на вопросе №{n}',
  },
};

export function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  );
}
