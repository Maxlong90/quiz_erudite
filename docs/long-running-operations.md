# Long-Running Operations

Some commands in this project run for tens of minutes while printing nothing. That is a problem beyond patience: the agent runner watches the coding agent's stdout and kills the process after roughly ten minutes of silence, so a long quiet command is misread as a hang and terminated mid-run (SIGTERM, exit 143). The kill looks like an out-of-memory failure but is not.

This file records which operations are dangerous to run in the foreground, how long they actually take, and what to run instead. Wrap anything listed here in `suslik-bg` and end the turn, or ask the operator to trigger it from the dashboard.

<!-- AGENT-SUMMARY:START -->
- `npx expo run:android` / Gradle `assembleDebug` — median ~10 min, up to 27 min measured, long silent stretches → SIGTERM. Safe: `suslik-bg "npx expo run:android"`, or the dashboard Mobile modal.
- Full rebuild from scratch (uninstall → `npx expo prebuild` → Gradle → reinstall) — ~15-30 min, silent → SIGTERM. Safe: dashboard Mobile modal → «Пересобрать APK с нуля» (runs as a supervised background job).
- `npm install` — several minutes, near-silent while resolving and linking an ~870 MB tree → SIGTERM risk. Safe: `suslik-bg "npm install"`.
- `eas build --profile <name>` — 20-40 min queued on EAS servers, output is sparse polling → SIGTERM. Safe: `suslik-bg`, then poll the build URL in a later turn.
<!-- AGENT-SUMMARY:END -->

## Android Native Build

`npx expo run:android` (and any direct Gradle `assembleDebug` / `assembleRelease`) compiles the whole React Native and Expo native layer. This is the single most common way to trigger the silence kill in this repo.

**Why it is slow.** The tree carries the full Expo module set plus native dependencies for RevenueCat, AdMob, Reanimated, view-shot, and Sentry. A cold build compiles every one of them, runs Kotlin and C++ toolchains, and bundles the JS. Gradle prints task names as it goes, but several individual tasks — C++ compilation, dexing, and the release bundling step — run for many minutes without emitting a line.

**Measured duration.** Twenty multi-minute builds are recorded in the local Gradle daemon logs (`~/.gradle/daemon/8.14.3/daemon-*.out.log`). The distribution: minimum 1 minute for a warm incremental build, **median about 10 minutes**, maximum 27 minutes. Warm builds that touch nothing native can finish in 10 seconds, but you cannot rely on landing in that case.

**How to run it safely.** Prefer not to run it at all. In the steady state the emulator, Metro, and the app are already up, and JS or TypeScript edits reach the device through Metro Fast Refresh — a code change needs no rebuild. When a rebuild really is required (a new native dependency, changed native config, or an app that will not start), wrap it:

```
suslik-bg "npx expo run:android"
```

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

Publishing an over-the-air update (`eas update --channel …`) is *not* in this category — it bundles JS only and finishes in a minute or two. See [Development](development.md#over-the-air-updates-eas-update).

## Not a Long-Running Operation: the Test Suite

The Jest suite is worth calling out precisely so nobody defensively backgrounds it. All 35 test files are pure logic and mocked-dependency screen tests with no device, emulator, or backend involved, and the whole run finishes in **under 10 seconds**. Run `npm test` in the foreground.

Note that the suite currently fails to load at all on Node 20 for a toolchain reason unrelated to test content — see [Development](development.md#unit-tests-jest). That failure is fast, not slow, so it carries no silence risk.

## See Also

- [Development](development.md) -- Build, run, configure, and test
- [Architecture](architecture.md) -- Build-time app selection and module layout
- [INDEX](INDEX.md) -- Documentation entry point
