/**
 * useWarmLevelImages (hooks/sport-quiz/use-warm-level-images.ts) — the couple of
 * levels kept decoded ahead of the player.
 *
 * The contract these lock in:
 *  - the CURRENT level warms first, then N+1, then N+2, strictly in order (a cold
 *    question 12 in the level being played outranks anything in the next level);
 *  - it is LOCAL-ONLY: a still-remote uri is skipped entirely, so on a fresh
 *    install the hook never competes for bandwidth with the content sync that is
 *    already downloading exactly these images in priority order;
 *  - it is fail-open and cancels cleanly, so it can never wedge a screen.
 *
 * expo-image and the level grouping are mocked so the chain is deterministic.
 */
import { act, renderHook } from '@testing-library/react-native';

const mockPrefetch = jest.fn();
jest.mock('expo-image', () => ({
  Image: { prefetch: (...args: unknown[]) => mockPrefetch(...args) },
}));

const mockBuildLevels = jest.fn();
jest.mock('@/lib/sport-quiz/content', () => ({
  buildLevels: (...args: unknown[]) => mockBuildLevels(...args),
}));

// eslint-disable-next-line import/first -- hook under test loads AFTER its mocks
import { useWarmLevelImages } from '@/hooks/sport-quiz/use-warm-level-images';
// eslint-disable-next-line import/first
import type { ContentSnapshot } from '@/lib/content-cache';

/** A snapshot stand-in — the hook only ever forwards it to buildLevels. */
const snapshot = { questions: [] } as unknown as ContentSnapshot;

const local = (n: number) => `file:///docs/snapshot-images-sport-quiz/${n}_image`;
const remote = (n: number) => `https://api.test/questions/${n}/image`;

/** Build the level list buildLevels should return. */
function levelsWith(map: Record<number, (string | null)[]>) {
  return Object.entries(map).map(([level, uris]) => ({
    level: Number(level),
    questions: uris.map((imageUri, i) => ({ id: Number(level) * 100 + i, imageUri })),
  }));
}

/** Flush the InteractionManager task and the promise chain between levels. */
async function flush() {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
  // Each level's prefetch resolves before the next one starts, so drain a few
  // microtask turns to let the whole chain unwind.
  for (let i = 0; i < 6; i++) {
    await act(async () => {
      await Promise.resolve();
    });
  }
}

/** URLs handed to prefetch, per call. */
function prefetchedBatches(): string[][] {
  return mockPrefetch.mock.calls.map((c) => c[0] as string[]);
}

beforeEach(() => {
  jest.useFakeTimers();
  mockPrefetch.mockReset();
  mockPrefetch.mockResolvedValue(undefined);
  mockBuildLevels.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useWarmLevelImages', () => {
  it('warms the current level first, then the next two', async () => {
    mockBuildLevels.mockReturnValue(
      levelsWith({ 3: [local(1)], 4: [local(2)], 5: [local(3)], 6: [local(4)] }),
    );

    renderHook(() => useWarmLevelImages(snapshot, 3, 2));
    await flush();

    expect(mockPrefetch).toHaveBeenNthCalledWith(1, [local(1)], { cachePolicy: 'memory-disk' });
    expect(mockPrefetch).toHaveBeenNthCalledWith(2, [local(2)], { cachePolicy: 'memory-disk' });
    expect(mockPrefetch).toHaveBeenNthCalledWith(3, [local(3)], { cachePolicy: 'memory-disk' });
    // Level 6 is beyond `ahead` — never touched.
    expect(mockPrefetch).toHaveBeenCalledTimes(3);
  });

  it('builds the level list ONCE, not once per level', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [local(1)], 2: [local(2)], 3: [local(3)] }));

    renderHook(() => useWarmLevelImages(snapshot, 1, 2));
    await flush();

    // questionsForLevel re-sorts the whole question pool on every call; warming
    // three levels through it would redo that work three times over.
    expect(mockBuildLevels).toHaveBeenCalledTimes(1);
  });

  it('skips still-remote uris within a mixed level', async () => {
    mockBuildLevels.mockReturnValue(
      levelsWith({ 1: [local(1), remote(2), null, local(3)] }),
    );

    renderHook(() => useWarmLevelImages(snapshot, 1, 0));
    await flush();

    expect(prefetchedBatches()[0]).toEqual([local(1), local(3)]);
  });

  it('never prefetches at all when every uri is still remote (fresh install)', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [remote(1), remote(2)], 2: [remote(3)] }));

    renderHook(() => useWarmLevelImages(snapshot, 1, 1));
    await flush();

    // The whole point of the file:// gate: during the first sync the ordered
    // downloader owns the bandwidth, and this hook stays out of its way.
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('warms once the sync has turned those uris local', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [remote(1)] }));
    const { rerender } = renderHook(
      ({ snap }: { snap: ContentSnapshot }) => useWarmLevelImages(snap, 1, 0),
      { initialProps: { snap: snapshot } },
    );
    await flush();
    expect(mockPrefetch).not.toHaveBeenCalled();

    // The sync merged a finished batch: same level, now on disk.
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [local(1)] }));
    rerender({ snap: { ...snapshot } as ContentSnapshot });
    await flush();

    expect(prefetchedBatches()[0]).toEqual([local(1)]);
  });

  it('fails open — a rejected prefetch still advances to the next level', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [local(1)], 2: [local(2)] }));
    mockPrefetch.mockRejectedValueOnce(new Error('decode failed'));

    renderHook(() => useWarmLevelImages(snapshot, 1, 1));
    await flush();

    expect(prefetchedBatches()).toEqual([[local(1)], [local(2)]]);
  });

  it('cancels the chain on unmount', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [local(1)], 2: [local(2)], 3: [local(3)] }));

    const { unmount } = renderHook(() => useWarmLevelImages(snapshot, 1, 2));
    unmount();
    await flush();

    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('no-ops without a snapshot or a real level', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 1: [local(1)] }));

    renderHook(() => useWarmLevelImages(null, 1, 2));
    renderHook(() => useWarmLevelImages(snapshot, 0, 2));
    await flush();

    expect(mockBuildLevels).not.toHaveBeenCalled();
    expect(mockPrefetch).not.toHaveBeenCalled();
  });

  it('warms only the current level at ahead = 0', async () => {
    mockBuildLevels.mockReturnValue(levelsWith({ 2: [local(1)], 3: [local(2)] }));

    renderHook(() => useWarmLevelImages(snapshot, 2, 0));
    await flush();

    expect(prefetchedBatches()).toEqual([[local(1)]]);
  });
});
