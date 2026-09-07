/**
 * SportQuizContentProvider priority gate (hooks/sport-quiz/use-sport-quiz-content.tsx).
 *
 * The provider asks the content sync to download question images in PLAY ORDER
 * and merges each finished batch into the live snapshot, latching `priorityReady`
 * as soon as the first Classic levels are on disk. These tests lock:
 *  - the latch is ONE-WAY and every path that reaches "ready" sets it (including
 *    the TTL-fresh path, which never enters the image phase at all);
 *  - each batch is merged in progressively rather than all-or-nothing;
 *  - and the load-bearing invariant: merging a PARTIAL imageMap must never move a
 *    question into a different level, or a player mid-level would see the ground
 *    shift under them.
 */
import React from 'react';
import { Text } from 'react-native';
import { act, render, waitFor } from '@testing-library/react-native';

// Stubbed so requireActual('@/lib/content-cache') below doesn't drag axios in.
jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockSyncContent = jest.fn();
const mockLoadCachedSnapshot = jest.fn();
jest.mock('@/lib/content-cache', () => {
  const actual = jest.requireActual('@/lib/content-cache');
  return {
    ...actual,
    syncContent: (...args: unknown[]) => mockSyncContent(...args),
    loadCachedSnapshot: (...args: unknown[]) => mockLoadCachedSnapshot(...args),
  };
});

jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// eslint-disable-next-line import/first -- provider loads AFTER its mocks
import {
  SportQuizContentProvider,
  useSportQuizContent,
} from '@/hooks/sport-quiz/use-sport-quiz-content';
// eslint-disable-next-line import/first
import { buildLevels } from '@/lib/sport-quiz/content';
// eslint-disable-next-line import/first
import type { ContentSnapshot, SnapshotQuestion } from '@/lib/content-cache';

const urlFor = (id: number) => `https://api.test/questions/${id}/image?v=1`;
const fileFor = (id: number) => `file:///docs/snapshot-images-sport-quiz/${id}_image`;

/** An image question (even ids) or a text one (odd ids). */
function mkQuestion(id: number): SnapshotQuestion {
  return {
    id,
    category_slug: 'sport-football',
    question: `Question ${id}?`,
    options: ['A', 'B', 'C', 'D'],
    correct_option: 0,
    explanation: null,
    image_url: id % 2 === 0 ? urlFor(id) : null,
  };
}

/** A snapshot big enough to span several levels of 20. */
function mkSnapshot(count = 60): ContentSnapshot {
  return {
    app: { slug: 'sport-quiz', name: 'Sport Quiz', supported_locales: ['en'] },
    locale: 'en',
    version: 1,
    generated_at: '2026-09-05T00:00:00Z',
    categories: [],
    questions: Array.from({ length: count }, (_, i) => mkQuestion(i + 1)),
  } as ContentSnapshot;
}

/** Renders the context out so assertions can read it. */
let latest: ReturnType<typeof useSportQuizContent> | null = null;
function Probe() {
  latest = useSportQuizContent();
  return <Text>{String(latest.priorityReady)}</Text>;
}

function renderProvider() {
  return render(
    <SportQuizContentProvider>
      <Probe />
    </SportQuizContentProvider>,
  );
}

beforeEach(() => {
  latest = null;
  mockSyncContent.mockReset();
  mockLoadCachedSnapshot.mockReset();
  mockLoadCachedSnapshot.mockResolvedValue(null);
});

describe('SportQuizContentProvider — priority gate', () => {
  it('starts closed and latches open on the first batch', async () => {
    const snapshot = mkSnapshot();
    let opts: Record<string, any> = {};
    mockSyncContent.mockImplementation(async (o: Record<string, any>) => {
      opts = o;
      o.onSnapshot?.({ ...snapshot, imageMap: {} });
      return { ...snapshot, imageMap: {} };
    });

    renderProvider();
    await waitFor(() => expect(mockSyncContent).toHaveBeenCalled());
    expect(opts.imageBatches).toBeInstanceOf(Function);

    // Batch 0 landing is what opens the splash gate.
    await act(async () => {
      opts.onBatchImages?.({ [urlFor(2)]: fileFor(2) }, 0);
    });
    expect(latest?.priorityReady).toBe(true);
  });

  it('asks for RAW REMOTE urls in its batches, never file:// paths', async () => {
    const snapshot = mkSnapshot();
    let opts: Record<string, any> = {};
    mockSyncContent.mockImplementation(async (o: Record<string, any>) => {
      opts = o;
      return { ...snapshot, imageMap: {} };
    });

    renderProvider();
    await waitFor(() => expect(mockSyncContent).toHaveBeenCalled());

    // The download queue is keyed by remote url; a leaked file:// path would
    // match nothing and silently drop that image from its priority batch.
    const batches: string[][] = opts.imageBatches(snapshot);
    const all = batches.flat();
    expect(all.length).toBeGreaterThan(0);
    expect(all.every((u) => u.startsWith('https://'))).toBe(true);
  });

  it('puts the first levels ahead of the rest of Classic', async () => {
    const snapshot = mkSnapshot();
    let opts: Record<string, any> = {};
    mockSyncContent.mockImplementation(async (o: Record<string, any>) => {
      opts = o;
      return { ...snapshot, imageMap: {} };
    });

    renderProvider();
    await waitFor(() => expect(mockSyncContent).toHaveBeenCalled());

    const [priority, restOfClassic] = opts.imageBatches(snapshot) as string[][];
    // Batch 0 is exactly the first three levels' images, and the follow-up batch
    // never repeats them.
    expect(priority.length).toBeGreaterThan(0);
    expect(restOfClassic.some((u) => priority.includes(u))).toBe(false);
  });

  it('merges each batch into the live snapshot progressively', async () => {
    const snapshot = mkSnapshot();
    let opts: Record<string, any> = {};
    mockSyncContent.mockImplementation(async (o: Record<string, any>) => {
      opts = o;
      o.onSnapshot?.({ ...snapshot, imageMap: {} });
      return new Promise(() => {}) as Promise<ContentSnapshot>; // never settles
    });

    renderProvider();
    await waitFor(() => expect(latest?.snapshot).not.toBeNull());

    await act(async () => {
      opts.onBatchImages?.({ [urlFor(2)]: fileFor(2) }, 0);
    });
    expect(latest?.snapshot?.imageMap).toEqual({ [urlFor(2)]: fileFor(2) });

    await act(async () => {
      opts.onBatchImages?.({ [urlFor(4)]: fileFor(4) }, 1);
    });
    // Cumulative on the snapshot, even though each callback carries only its own.
    expect(latest?.snapshot?.imageMap).toEqual({
      [urlFor(2)]: fileFor(2),
      [urlFor(4)]: fileFor(4),
    });
  });

  it('latches open on the TTL-fresh path, which never downloads an image', async () => {
    const snapshot = mkSnapshot();
    // syncContent's TTL-fresh early return: it fires onSnapshot and resolves
    // WITHOUT ever entering the image phase, so onBatchImages never fires.
    mockSyncContent.mockImplementation(async (o: Record<string, any>) => {
      const cached = { ...snapshot, imageMap: { [urlFor(2)]: fileFor(2) } };
      o.onSnapshot?.(cached);
      return cached;
    });

    renderProvider();

    await waitFor(() => expect(latest?.priorityReady).toBe(true));
  });

  it('keeps the latch open across a resync', async () => {
    const snapshot = mkSnapshot();
    mockSyncContent.mockImplementation(async (o: Record<string, any>) => {
      o.onSnapshot?.({ ...snapshot, imageMap: {} });
      return { ...snapshot, imageMap: {} };
    });

    renderProvider();
    await waitFor(() => expect(latest?.priorityReady).toBe(true));

    // A forced resync re-downloads everything, but must NOT re-trap a player
    // behind a gate a re-mounted splash could be reading.
    await act(async () => {
      await latest?.resync();
    });
    expect(latest?.priorityReady).toBe(true);
  });

  it('a PARTIAL imageMap never moves a question into another level', () => {
    const snapshot = mkSnapshot();
    const full = {
      ...snapshot,
      imageMap: Object.fromEntries(
        snapshot.questions.filter((q) => q.image_url).map((q) => [q.image_url, fileFor(q.id)]),
      ),
    } as ContentSnapshot;
    // Only the first handful downloaded so far — mid-sync reality.
    const partial = {
      ...snapshot,
      imageMap: { [urlFor(2)]: fileFor(2), [urlFor(4)]: fileFor(4) },
    } as ContentSnapshot;

    const ids = (s: ContentSnapshot) => buildLevels(s).map((l) => l.questions.map((q) => q.id));

    // The whole design rests on this: level membership is decided by whether
    // image_url is SET, never by whether it has been downloaded yet.
    expect(ids(partial)).toEqual(ids(full));
    expect(ids({ ...snapshot, imageMap: {} } as ContentSnapshot)).toEqual(ids(full));
  });
});
