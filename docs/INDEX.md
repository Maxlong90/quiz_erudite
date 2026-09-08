# Quiz Erudit

A mobile general-knowledge trivia app built with React Native and Expo. Players answer multiple-choice questions across seven subjects — geography, history, science and nature, arts and literature, sports, entertainment, and general knowledge — each split into subcategories. Content is downloaded once per language and cached for offline play; lives, hints, achievements, and other progress live entirely on the device.

The same tree also builds five sibling apps, each selected by a build-time slug and each with its own screens, artwork, and economy. A sixth, configurable build takes its palette from the backend instead of from code.

## Documentation

### Core

- [Glossary](GLOSSARY.md) -- Project terms, and the ones that mean different things per app
- [Architecture](architecture.md) -- System structure, navigation, providers, and design decisions
- [Quiz Flow](quiz-flow.md) -- End-to-end gameplay, modes, and the session state machine
- [Data Model](data-model.md) -- Domain entities, API contract, and local persistence
- [Gamification](gamification.md) -- Lives, hints, mistakes, stats, achievements, and premium
- [Content and Offline](content-and-offline.md) -- Snapshot cache, image caching, and no-repeats

### Sibling Apps

- [Logo Quiz](logo-quiz.md) -- Brand guessing: backend content, numbered levels, and result explanations
- [Flags Quiz](flags-quiz.md) -- Flags: two question shapes and an out-of-snapshot content source; the template for later siblings
- [Coat of Arms](coat-of-arms-quiz.md) -- Heraldry: clean-versus-original artwork and the post-answer reveal
- [Sport Quiz](sport-quiz.md) -- Sports: a coins-only economy, puzzle plates, and a shared win screen
- [Italy Quiz](italy-quiz.md) -- Italy: a hardcoded taxonomy over backend questions, and fifty-question resumable runs
- [Configurable Template](configurable-template.md) -- The build whose palette is operator data: wire contract, three-tier resolution, and the inertness gate

### Operations

- [Development](development.md) -- Build, run, configure, and test
- [Long-Running Operations](long-running-operations.md) -- Commands that go silent long enough to look hung
- [iOS Monetization Parity](ios-monetization-parity.md) -- Capability-driven paywall/IAP/ads gating and the iOS credentials still required

## Quick Facts

| Item | Value |
|------|-------|
| Platform | iOS, Android, Web |
| Bundle ID | com.quizzzes.erudite |
| Backend | quiz-erudit-backend.turbosuslik.online |
| App slug | erudite-quiz |
| Sibling slugs | logo-quiz, flags-quiz, coat-of-arms, sport-quiz, italy-history-and-geography-quiz |
| Configurable template | configurable-quiz (`app/t/`) -- palette comes from the backend, not from code |
| Languages | English, Russian, Spanish, French |

## See Also

- [CLAUDE.md](../CLAUDE.md) -- Project configuration for Claude Code
