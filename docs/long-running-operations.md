# Long-Running Operations

Some commands in this project run for tens of minutes while printing nothing. That is a problem beyond patience: the agent runner watches the coding agent's stdout and kills the process after roughly ten minutes of silence, so a long quiet command is misread as a hang and terminated mid-run (SIGTERM, exit 143). The kill looks like an out-of-memory failure but is not.

This file records which operations are dangerous to run in the foreground, how long they actually take, and what to run instead. Wrap anything listed here in `suslik-bg` and end the turn, or ask the operator to trigger it from the dashboard.

<!-- AGENT-SUMMARY:START -->
- `npx expo run:android` / Gradle `assembleDebug` — median ~3 min but a long tail (1 in 6 runs exceeds 10 min, 27 min measured), long silent stretches → SIGTERM. Safe: `suslik-bg "npx expo run:android"`, or the dashboard Mobile modal.
- Gradle `assembleRelease` (a variant APK with the JS bundle embedded) — strictly slower than debug, and the bundling/minify tail is silent → SIGTERM leaves no APK and no error. Safe: `suslik-bg "cd android && ./gradlew assembleRelease"`.
- Full rebuild from scratch (uninstall → `npx expo prebuild` → Gradle → reinstall) — ~15-30 min, silent → SIGTERM. Safe: dashboard Mobile modal → «Пересобрать APK с нуля» (runs as a supervised background job).
- `npm install` — several minutes, near-silent while resolving and linking an ~870 MB tree → SIGTERM risk. Safe: `suslik-bg "npm install"`.
- `eas build --profile <name>` — 20-40 min queued on EAS servers, output is sparse polling → SIGTERM. Safe: `suslik-bg`, then poll the build URL in a later turn.
- `npx expo start --web` (the dev server the responsive screenshot sweep drives) — never exits at all, so a foreground turn waits until the watchdog kills it. Safe: `suslik-bg "EXPO_PUBLIC_APP_SLUG=<slug> npx expo start --web --port 8091"`, then run the sweep in a later command.
<!-- AGENT-SUMMARY:END -->

## Android Native Build

`npx expo run:android` (and any direct Gradle `assembleDebug` / `assembleRelease`) compiles the whole React Native and Expo native layer. This is the single most common way to trigger the silence kill in this repo.

**Why it is slow.** The tree carries the full Expo module set plus native dependencies for RevenueCat, AdMob, Reanimated, view-shot, and Sentry. A cold build compiles every one of them, runs Kotlin and C++ toolchains, and bundles the JS. Gradle prints task names as it goes, but several individual tasks — C++ compilation, dexing, and the release bundling step — run for many minutes without emitting a line.

**Measured duration.** Seventy-seven completed builds are recorded in the local Gradle daemon logs (`~/.gradle/daemon/*/daemon-*.out.log`). The distribution: minimum 6 seconds for a build that touches nothing, **median about 3 minutes**, ninth decile about 15 minutes, maximum 27 minutes. The median is the misleading number here. What matters is the tail: **13 of those 77 runs — better than one in six — ran past the ten-minute silence window**, and nothing about a build tells you in advance which kind it will be. A median that clears the watchdog is not a reason to foreground the command.

**The release variant is the slow end.** `assembleRelease` does everything a debug build does and then bundles the JS, minifies it, and crunches the PNGs, so it lands in the tail by construction rather than by luck. It is also the case where a kill is hardest to read: Gradle's log ends with a client disconnection and no verdict, `android/app/build/outputs/` holds no APK, and nothing anywhere says why. Two such attempts on 2026-09-08 are in the daemon logs, both cut off mid-compile with no artifact. If a release build "finished" but there is no APK on disk, it was killed — do not re-run it in the foreground.

**How to run it safely.** Prefer not to run it at all. In the steady state the emulator, Metro, and the app are already up, and JS or TypeScript edits reach the device through Metro Fast Refresh — a code change needs no rebuild. When a rebuild really is required (a new native dependency, changed native config, or an app that will not start), wrap it:

```
suslik-bg "npx expo run:android"
suslik-bg "cd /var/www/quiz-erudit/android && ./gradlew assembleRelease"
```

The second form is how a sibling or template variant gets a release APK with its bundle embedded, which is what an on-device check of a non-default build needs — see [Development](development.md#building-a-variant-as-a-release-apk).

**Verifying without a build.** To confirm the current state instead of rebuilding, check the emulator, Metro, and the foreground activity with the fast `adb` and `lsof` probes documented in `CLAUDE.md`, then take a screenshot through Maestro. Those are instant and answer the question a rebuild was usually meant to answer.

## Full Rebuild From Scratch

The from-scratch pipeline is uninstall, then `npx expo prebuild` to regenerate `android/`, then a cold Gradle build, then reinstall. It is the Gradle build above plus prebuild's own dependency resolution and template regeneration, with no warm cache to fall back on — so it lands at the slow end of the range, roughly **15 to 30 minutes**, and prebuild's own phase is largely silent.

Do not run this by hand. The dashboard's Mobile modal exposes it as **«Пересобрать APK с нуля»**, which runs it as a supervised background job with the correct ports, headless flags, and environment. The neighbouring buttons are cheaper and usually what is actually wanted: **«Перезапустить эмулятор»** restarts the emulator, and **«Запустить приложение»** re-checks the foreground and only rebuilds if the app is genuinely wedged. In a chat session, ask the operator to click the right button rather than building in the shell.

## Dependency Install

`npm install` resolves and links an installed tree of roughly 870 MB. Most of that time is spent in resolution and file linking, where npm prints only a spinner — which the silence watchdog does not count as output. Treat it as **several minutes with no reliable progress**, and mark this as an estimate: there are no install logs in the repo to measure against.

```
suslik-bg "npm install"
```

## EAS Cloud Builds

`eas build --profile preview` (or `production`, or a `logo-quiz-*` profile) uploads the project and waits on a remote queue. Local output is a sparse poll of the remote status, so it is silent for long stretches while the build waits and runs — typically **20 to 40 minutes end to end**, dominated by queue time outside this machine's control. Estimated from EAS's normal behaviour, not from local logs.

Launch it detached and pick the result up in a later turn:

```
suslik-bg "eas build --profile preview --platform android --non-interactive"
```

One failure here looks like the opposite of a long-running operation, and is worth recognizing on sight. A stale `eas-cli` cannot parse this project's config plugins, so it exits within seconds on *any* profile without ever reaching the queue. When a build "finishes" almost immediately, upgrade the CLI instead of re-running it detached — [Development](development.md#the-eas-cli-must-be-current) has the symptom and the fix.

Publishing an over-the-air update (`eas update --channel …`) is *not* in this category — it bundles JS only and finishes in a minute or two. See [Development](development.md#over-the-air-updates-eas-update).

## The Web Dev Server Behind the Responsive Sweep

Checking a layout at many window sizes needs Expo's **web** dev server running, because this host has no iOS or iPad simulator (see [Responsive-Layout Screenshots](development.md#responsive-layout-screenshots)). A dev server is not slow — it is *unbounded*. It never exits, so a turn that starts it in the foreground blocks until the silence watchdog kills the agent, and the screenshot step never runs. Start it detached and end the command:

```
suslik-bg "EXPO_PUBLIC_APP_SLUG=coat-of-arms npx expo start --web --port 8091"
```

The screenshot script itself is a different shape and safe to foreground. `node scripts/coa-responsive-shots.js` takes roughly **ten minutes** for its default `all` mode — an estimate from its own waits, not a log, since it keeps no log — but it prints a filename for every screenshot it writes, and its longest quiet stretch is the nine-second pause that lets a gameplay screen finish painting. That is well inside the watchdog window. A single mode (`sweep`, `identity`, `reveal`, `modals`, `resize`) finishes in one to six minutes.

The first page load is the one part that can stall: a cold server bundles the whole web app on demand, and the script's per-command timeout is 30 seconds. Open one route in a browser (or `curl` it) once before starting a sweep against a freshly launched server.

## Not a Long-Running Operation: the Test Suite

The Jest suite is worth calling out precisely so nobody defensively backgrounds it. All 94 test files (1894 tests) are pure logic, filesystem checks, and mocked-dependency screen tests with no device, emulator, or backend involved, and the whole run finishes in **seconds, not minutes** — 14 seconds measured on 2026-09-12, wall clock, for the full suite. Run `npm test` in the foreground.

The one test that *does* reach the network is excluded from that default run by filename. `__tests__/lib/theme-contract-live.livetest.ts` verifies the theme wire contract against the live backend and runs only under `npm run check:theme-contract`, which points Jest at `jest.live.config.js`. It is a handful of HTTP requests against one endpoint, so it is fast when the backend answers — but unlike the offline suite it can hang on a network that neither answers nor refuses. Foreground it, and read a long silence as a network problem rather than a slow test.

## See Also

- [Development](development.md) -- Build, run, configure, and test
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [INDEX](INDEX.md) -- Documentation entry point
