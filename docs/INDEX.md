# Quiz Erudit

A mobile general-knowledge trivia app built with React Native and Expo. Players answer multiple-choice questions across seven subjects — geography, history, science and nature, arts and literature, sports, entertainment, and general knowledge — each split into subcategories. Content is downloaded once per language and cached for offline play; lives, hints, achievements, and other progress live entirely on the device.

## Documentation

- [Architecture](architecture.md) -- System structure, navigation, providers, and design decisions
- [Quiz Flow](quiz-flow.md) -- End-to-end gameplay, modes, and the session state machine
- [Logo Quiz](logo-quiz.md) -- The neon "guess the brand" mini-app, its content seam, and gating
- [Data Model](data-model.md) -- Domain entities, API contract, and local persistence
- [Gamification](gamification.md) -- Lives, hints, mistakes, stats, achievements, and premium
- [Content and Offline](content-and-offline.md) -- Snapshot cache, image caching, and no-repeats
- [Development](development.md) -- Build, run, configure, and test
- [iOS Monetization Parity](ios-monetization-parity.md) -- Capability-driven paywall/IAP/ads gating and the iOS credentials still required

## Quick Facts

| Item | Value |
|------|-------|
| Platform | iOS, Android, Web |
| Bundle ID | com.quizzzes.erudite |
| Backend | quiz-erudit-backend.turbosuslik.online |
| App slug | erudite-quiz |
| Languages | English, Russian, Spanish |

## See Also

- [CLAUDE.md](../CLAUDE.md) -- Project configuration for Claude Code
