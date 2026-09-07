/**
 * INTEGRATION: Sport Quiz question-image prioritisation, end to end.
 *
 * Every other suite around this feature mocks one side of the seam:
 *   - `use-sport-quiz-priority.test.tsx` mocks `syncContent` wholesale, so it
 *     proves the provider REACTS correctly to batch callbacks but never that the
 *     real sync PRODUCES them;
 *   - `content-cache-batches.test.ts` drives the real `syncContent` but with
 *     synthetic, hand-written batch functions — never the real Sport Quiz
 *     ordering helpers.
 *
 * So the join is untested, and it can hide a bad failure: if `withRemoteImages`
 * (or any ordering helper) started returning `file://` paths, or the wrong
 * questions, the priority batch would silently be EMPTY, every image would fall
 * into the trailing batch, and the fresh-install symptom would be back — while
 * both mocked suites stayed green. That is exactly the regression this file
 * exists to catch.
 *
 * Here only the true external boundaries are faked — HTTP (`@/api/client`) and
 * the filesystem (`expo-file-system/legacy`). The real `lib/content-cache.ts`,
 * the real `lib/sport-quiz/content.ts` + `legends.ts` ordering, and the real
 * `SportQuizContentProvider` all run for real, wired together.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

import { apiClient } from '@/api/client';
import * as FileSystem from 'expo-file-system/legacy';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

// Records every download in call order. `exists: false` so every URL in the set
// actually reaches downloadAsync (the sync skips files already on disk).
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// eslint-disable-next-line import/first -- everything below loads AFTER the mocks
import {
  SportQuizContentProvider,
  useSportQuizContent,
} from '@/hooks/sport-quiz/use-sport-quiz-content';
// eslint-disable-next-line import/first
import {
  buildLevels,
  priorityImageUrls,
  questionsForLevel,
  PRIORITY_LEVELS,
  LEVEL_SIZE,
} from '@/lib/sport-quiz/content';
// eslint-disable-next-line import/first
import { legendsPriorityImageUrls, LEGENDS_CATEGORY_SLUG } from '@/lib/sport-quiz/legends';
// eslint-disable-next-line import/first
import type { ContentSnapshot, SnapshotQuestion } from '@/lib/content-cache';

const get = apiClient.get as jest.Mock;
const downloadAsync = FileSystem.downloadAsync as jest.Mock;

const imageUrl = (id: number) => `https://api.test/questions/${id}/image?v=${id}`;
const iconUrl = (slug: string) => `https://api.test/categories/${slug}/icon.png`;

/**
 * A realistic Sport Quiz snapshot.
 *
 * Classic strictly alternates image/text, so it needs plenty of BOTH to fill
 * more than PRIORITY_LEVELS levels and still leave a long tail behind them.
 * Legends is a separate category and is all images.
 */
function mkSnapshot() {
  const questions: SnapshotQuestion[] = [];
  let id = 1;

  // 60 Classic image questions + 60 Classic text questions => 120 questions,
  // i.e. 6 levels of 20, so levels 4..6 form a tail behind the priority batch.
  for (let i = 0; i < 60; i++) {
    questions.push({
      id: id++,
      category_slug: 'sport-football',
      question: `Classic image question ${i}?`,
      options: ['A', 'B', 'C', 'D'],
      correct_option: 0,
      explanation: null,
      image_url: imageUrl(id - 1),
    });
    questions.push({
      id: id++,
      category_slug: 'sport-football',
      question: `Classic text question ${i}?`,
      options: ['A', 'B', 'C', 'D'],
      correct_option: 1,
      explanation: null,
      image_url: null,
    });
  }

  // 40 Legends faces (all images) => 2 full Legends levels of 15 plus a tail.
  for (let i = 0; i < 40; i++) {
    questions.push({
      id: id++,
      category_slug: LEGENDS_CATEGORY_SLUG,
      question: 'Who is this athlete?',
      options: ['A', 'B', 'C', 'D'],
      correct_option: 2,
      explanation: null,
      image_url: imageUrl(id - 1),
    });
  }

  return {
    app: { slug: 'sport-quiz', name: 'Sport Quiz', supported_locales: ['en'] },
    locale: 'en',
    version: 9,
    generated_at: '2026-09-05T00:00:00Z',
    categories: [
      {
        slug: 'sport-football',
        name: 'Football',
        sort_order: 1,
        icon_url: iconUrl('sport-football'),
        subcategories: [
          { slug: 'sport-football-clubs', name: 'Clubs', sort_order: 1, icon_url: iconUrl('clubs') },
        ],
      },
    ],
    questions,
  };
}

/** Every URL handed to downloadAsync, in call order. */
const downloadedUrls = (): string[] => downloadAsync.mock.calls.map((c) => c[0] as string);

/** Surfaces the live context so assertions can read it. */
let latest: ReturnType<typeof useSportQuizContent> | null = null;
function Probe() {
  latest = useSportQuizContent();
  return <Text>{latest.status}</Text>;
}

function renderProvider() {
  return render(
    <SportQuizContentProvider>
      <Probe />
    </SportQuizContentProvider>,
  );
}

let snapshotFixture: ReturnType<typeof mkSnapshot>;

beforeEach(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
  latest = null;
  snapshotFixture = mkSnapshot();
  get.mockReset();
  get.mockResolvedValue({ data: snapshotFixture });
  downloadAsync.mockClear();
  downloadAsync.mockResolvedValue(undefined);
});

describe('INTEGRATION — Sport Quiz image priority, real sync + real ordering', () => {
  it('downloads every image of the first levels BEFORE anything else', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.status).toBe('ready'), { timeout: 10000 });
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });

    // The expected priority set, computed from the raw snapshot by the same real
    // helper the provider uses.
    const priority = priorityImageUrls(snapshotFixture as unknown as ContentSnapshot);
    const urls = downloadedUrls();

    // Guard the whole premise: if withRemoteImages or the ordering helpers broke,
    // this set would be empty and every assertion below would vacuously pass.
    expect(priority.length).toBeGreaterThan(0);
    expect(priority.every((u) => u.startsWith('https://'))).toBe(true);

    // THE CORE CLAIM: the first N downloads are exactly the first levels' images.
    // Batches run strictly sequentially, so this boundary is deterministic even
    // though order WITHIN a batch depends on the 6-worker pool.
    const firstN = urls.slice(0, priority.length);
    expect(firstN.slice().sort()).toEqual(priority.slice().sort());

    // And nothing from the tail sneaked into that window.
    const tail = urls.slice(priority.length);
    expect(tail.some((u) => priority.includes(u))).toBe(false);
  }, 20000);

  it('covers the first PRIORITY_LEVELS levels — not just level 1', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });

    const snap = latest!.snapshot as ContentSnapshot;
    const levels = buildLevels(snap).slice(0, PRIORITY_LEVELS);
    expect(levels).toHaveLength(PRIORITY_LEVELS);

    const priority = priorityImageUrls(snapshotFixture as unknown as ContentSnapshot);
    const firstN = downloadedUrls().slice(0, priority.length);

    // Each of levels 1..PRIORITY_LEVELS contributes images, and all of them are
    // inside the leading window. This is what makes "a couple of levels of
    // runway" true rather than just "level 1 works".
    for (const level of levels) {
      const withImages = level.questions.filter((q) => q.imageUri);
      expect(withImages.length).toBeGreaterThan(0);
      for (const q of withImages) {
        // Resolved uri is local by now; map back through the imageMap.
        const remote = Object.keys(snap.imageMap ?? {}).find(
          (k) => snap.imageMap![k] === q.imageUri,
        );
        expect(remote).toBeDefined();
        expect(firstN).toContain(remote);
      }
    }
  }, 20000);

  it('leaves level 1 fully resolved to local files when the sync completes', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });

    const snap = latest!.snapshot as ContentSnapshot;
    const level1 = questionsForLevel(snap, 1);

    expect(level1).toHaveLength(LEVEL_SIZE);
    const images = level1.filter((q) => q.imageUri);
    expect(images.length).toBeGreaterThan(0);
    // The player-visible payoff: no remote URL survives on level 1, so nothing
    // is fetched over the network while a question is on screen.
    for (const q of images) {
      expect(q.imageUri!.startsWith('file:///docs/')).toBe(true);
    }
  }, 20000);

  it("gives Legends' opening levels their own batch ahead of the rest of Legends", async () => {
    renderProvider();
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });

    const urls = downloadedUrls();
    const legendsPriority = legendsPriorityImageUrls(
      snapshotFixture as unknown as ContentSnapshot,
    );
    expect(legendsPriority.length).toBeGreaterThan(0);

    // Every Legends face, and the ones NOT in the opening levels.
    const allLegendUrls = snapshotFixture.questions
      .filter((q) => q.category_slug === LEGENDS_CATEGORY_SLUG)
      .map((q) => q.image_url as string);
    const legendsRest = allLegendUrls.filter((u) => !legendsPriority.includes(u));
    expect(legendsRest.length).toBeGreaterThan(0);

    // THE CLAIM: the opening Legends levels are downloaded before ANY later
    // Legends face. Classic's ordering excludes the Legends pool entirely, so
    // without a dedicated batch the whole pool would land in the trailing batch
    // in raw enumeration (id) order — which is NOT the order the Legends levels
    // are actually built in, so a player opening Legends first would be waiting
    // on faces they will not see for levels.
    const lastPriority = Math.max(...legendsPriority.map((u) => urls.indexOf(u)));
    const firstRest = Math.min(...legendsRest.map((u) => urls.indexOf(u)));
    expect(lastPriority).toBeGreaterThanOrEqual(0);
    expect(firstRest).toBeGreaterThanOrEqual(0);
    expect(lastPriority).toBeLessThan(firstRest);

    // Category icons stay last of all — nothing gameplay-facing waits on them.
    const iconIndex = urls.indexOf(iconUrl('sport-football'));
    expect(iconIndex).toBeGreaterThan(lastPriority);
  }, 20000);

  it('downloads every URL exactly once and invents none', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });

    const urls = downloadedUrls();
    const expected = new Set<string>([
      ...snapshotFixture.questions.map((q) => q.image_url).filter((u): u is string => !!u),
      iconUrl('sport-football'),
      iconUrl('clubs'),
    ]);

    // Batching must not duplicate a download (the same dest path written twice
    // is the corruption risk that ruled out a second concurrent fetcher).
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.length).toBe(expected.size);
    expect(new Set(urls)).toEqual(expected);
  }, 20000);

  // NOTE: progress monotonicity across batches is deliberately NOT asserted here.
  // React coalesces the provider's setProgress calls, so a render-sampling probe
  // sees only a few of them and cannot reliably observe the non-monotonic dip
  // caused by dividing by a per-batch total — verified by mutation: that bug is
  // caught deterministically by `content-cache-batches.test.ts` ("keeps progress
  // monotonic and ending at exactly 1 across batches") but slipped past a probe
  // here. Asserting it at this level would be false assurance, so it is left to
  // the layer that can actually see it.

  it('opens the splash gate EARLY — while the long tail is still downloading', async () => {
    // The point of latching on batch 0 is that the splash is released as soon as
    // the first levels are on disk. If the gate only opened when the whole sync
    // finished, the player would wait on all ~290 images (in practice: hit the 6s
    // cap on every cold start) and the feature would be pointless.
    //
    // Note this CANNOT be shown by merely asserting `priorityReady === true` at
    // the end: `runSync`'s success tail also latches it, so such an assertion
    // passes even if the batch-0 latch is removed entirely (verified by
    // mutation). The tail downloads are therefore pinned open so the sync is
    // provably still in flight at the moment the gate opens.
    const priority = new Set(priorityImageUrls(snapshotFixture as unknown as ContentSnapshot));
    expect(priority.size).toBeGreaterThan(0);

    let releaseTail: () => void = () => {};
    const tailHeld = new Promise<void>((resolve) => {
      releaseTail = resolve;
    });
    downloadAsync.mockImplementation((url: string) =>
      priority.has(url) ? Promise.resolve(undefined) : tailHeld,
    );

    renderProvider();

    // The gate opens even though nothing past batch 0 can complete.
    await waitFor(() => expect(latest?.priorityReady).toBe(true), { timeout: 10000 });

    // ...and at that moment the sync is demonstrably unfinished.
    expect(latest!.progress).toBeLessThan(1);

    const calledSoFar = downloadedUrls();
    const allImages = snapshotFixture.questions
      .filter((q) => q.image_url)
      .map((q) => q.image_url as string);

    // Batch 0 is fully done...
    for (const u of priority) expect(calledSoFar).toContain(u);
    // ...while the tail has barely been touched. Note this compares CALLS, not
    // completions: the worker pool immediately picks up the next batch, so a
    // handful of tail downloads are already in flight (pending on `tailHeld`).
    // The claim is that the gate opened with the overwhelming majority of the
    // pool still outstanding, not that literally nothing else had started.
    const tailCalled = calledSoFar.filter((u) => !priority.has(u));
    const tailTotal = allImages.length - priority.size;
    expect(tailTotal).toBeGreaterThan(0);
    expect(tailCalled.length).toBeLessThan(tailTotal / 2);

    releaseTail();
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });
  }, 20000);

  it('opens the splash gate and persists a reusable snapshot', async () => {
    renderProvider();
    await waitFor(() => expect(latest?.priorityReady).toBe(true), { timeout: 10000 });
    await waitFor(() => expect(latest?.progress).toBe(1), { timeout: 10000 });

    expect(latest?.status).toBe('ready');

    // The persisted snapshot is what makes the SECOND launch instant: it must
    // carry the imageMap, or every relaunch would re-download and the splash
    // would gate again.
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const raw = await AsyncStorage.getItem('content.snapshot.v2:sport-quiz');
    expect(raw).toBeTruthy();
    const stored = JSON.parse(raw as string) as ContentSnapshot;
    expect(Object.keys(stored.imageMap ?? {}).length).toBe(downloadedUrls().length);
  }, 20000);
});
