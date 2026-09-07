/**
 * Tests for the ORDERED IMAGE BATCHES option of lib/content-cache.ts — the
 * `imageBatches` / `onBatchImages` pair Sport Quiz uses to download the first
 * levels' artwork before everything else.
 *
 * lib/content-cache.ts is SHARED by Erudite, Logo Quiz, Flags Quiz, Coat of Arms
 * and Sport Quiz, so the single most important test here is the first one: with
 * no `imageBatches` the download order and the whole progress sequence must be
 * identical to the pre-batching behaviour. The rest pin down that a caller can
 * neither drop, duplicate nor invent a download no matter what it returns.
 *
 * The api client and expo-file-system are mocked so no network or filesystem is
 * touched; AsyncStorage is auto-mocked globally.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { apiClient } from '@/api/client';
import { syncContent, type ContentSnapshot, type SnapshotQuestion } from '@/lib/content-cache';

jest.mock('@/api/client', () => ({
  APP_SLUG: 'erudite-quiz',
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///docs/',
  // `exists: false` so every URL in the download set actually hits downloadAsync
  // (the sync skips files already on disk).
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  downloadAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

const get = apiClient.get as jest.Mock;
const downloadAsync = FileSystem.downloadAsync as jest.Mock;

const SLUG = 'sport-quiz';

/** URL of question `id` — the exact shape mkQuestion emits. */
const urlFor = (id: number) => `https://api.test/questions/${id}/image?v=default`;

function mkQuestion(id: number, over: Partial<SnapshotQuestion> = {}): SnapshotQuestion {
  return {
    id,
    category_slug: 'sport-football',
    question: `Question ${id}?`,
    options: ['A', 'B', 'C', 'D'],
    correct_option: 0,
    explanation: null,
    image_url: urlFor(id),
    ...over,
  };
}

/** Stub the snapshot endpoint with the given questions. */
function respondWith(questions: SnapshotQuestion[]) {
  get.mockResolvedValue({
    data: {
      app: { slug: SLUG, name: 'Sport Quiz', supported_locales: ['en'] },
      locale: 'en',
      version: 7,
      generated_at: '2026-09-05T00:00:00Z',
      categories: [],
      questions,
    },
  });
}

/** Every URL passed to downloadAsync, in call order. */
function downloadedUrls(): string[] {
  return downloadAsync.mock.calls.map((c) => c[0] as string);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  get.mockReset();
  downloadAsync.mockClear();
});

describe('syncContent — ordered image batches', () => {
  it('is a byte-for-byte no-op without imageBatches (the other four apps)', async () => {
    const questions = [1, 2, 3, 4, 5].map((id) => mkQuestion(id));

    // Control run: today's behaviour, no batching options at all.
    respondWith(questions);
    const controlProgress: number[] = [];
    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      onProgress: (p) => controlProgress.push(p),
    });
    const controlOrder = downloadedUrls();

    await AsyncStorage.clear();
    downloadAsync.mockClear();

    // Same input again — the option is absent both times, so nothing may differ.
    respondWith(questions);
    const secondProgress: number[] = [];
    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      onProgress: (p) => secondProgress.push(p),
    });

    expect(downloadedUrls()).toEqual(controlOrder);
    expect(secondProgress).toEqual(controlProgress);
    // And the untouched order is plain enumeration order.
    expect(controlOrder).toEqual([1, 2, 3, 4, 5].map(urlFor));
  });

  it('downloads a requested batch before the unmentioned remainder', async () => {
    respondWith([1, 2, 3, 4].map((id) => mkQuestion(id)));

    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      imageBatches: () => [[urlFor(3), urlFor(1)]],
    });

    // Batch 0 in the caller's order, then the leftovers in ENUMERATION order.
    expect(downloadedUrls()).toEqual([urlFor(3), urlFor(1), urlFor(2), urlFor(4)]);
  });

  it('ignores unknown URLs, de-dupes across batches and never drops one', async () => {
    respondWith([1, 2, 3, 4].map((id) => mkQuestion(id)));

    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      imageBatches: () => [
        // An invented URL, a real one, and a duplicate of a real one.
        ['https://api.test/not-in-the-snapshot.png', urlFor(2), urlFor(2)],
        // urlFor(2) again — already claimed by batch 0 — plus a fresh one.
        [urlFor(2), urlFor(4)],
      ],
    });

    const urls = downloadedUrls();
    // Every real URL exactly once, nothing invented.
    expect(urls.slice().sort()).toEqual([1, 2, 3, 4].map(urlFor).sort());
    expect(urls).toHaveLength(4);
    // And the requested priority still held.
    expect(urls[0]).toBe(urlFor(2));
    expect(urls[1]).toBe(urlFor(4));
  });

  it('fires onBatchImages once per batch, in order, with that batch only', async () => {
    respondWith([1, 2, 3, 4].map((id) => mkQuestion(id)));

    const seen: { index: number; urls: string[] }[] = [];
    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      imageBatches: () => [[urlFor(1)], [urlFor(2), urlFor(3)]],
      onBatchImages: (map, index) => seen.push({ index, urls: Object.keys(map).sort() }),
    });

    // Three batches: the two requested plus the implicit trailing remainder.
    expect(seen.map((s) => s.index)).toEqual([0, 1, 2]);
    // Each map carries ONLY its own batch — not a cumulative one.
    expect(seen[0].urls).toEqual([urlFor(1)]);
    expect(seen[1].urls).toEqual([urlFor(2), urlFor(3)].sort());
    expect(seen[2].urls).toEqual([urlFor(4)]);
  });

  it('keeps progress monotonic and ending at exactly 1 across batches', async () => {
    respondWith([1, 2, 3, 4, 5, 6].map((id) => mkQuestion(id)));

    const seen: number[] = [];
    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      imageBatches: () => [[urlFor(1), urlFor(2)], [urlFor(3)]],
      onProgress: (p) => seen.push(p),
    });

    // The regression guard on dividing by the OUTER total: dividing by the
    // per-batch payload total would spike to 1.0 at each batch end, then drop.
    expect(seen.length).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(1);
    expect(seen[seen.length - 1]).toBe(1);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it('reports 1 and fires no batch callback when there is nothing to download', async () => {
    respondWith([mkQuestion(1, { image_url: null })]);

    const onBatchImages = jest.fn();
    const seen: number[] = [];
    const snap = await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      imageBatches: () => [[]],
      onBatchImages,
      onProgress: (p) => seen.push(p),
    });

    expect(downloadedUrls()).toEqual([]);
    expect(onBatchImages).not.toHaveBeenCalled();
    expect(seen[seen.length - 1]).toBe(1);
    expect(snap.imageMap).toEqual({});
  });

  it('hands imageBatches the raw snapshot, with no imageMap on it', async () => {
    respondWith([1, 2].map((id) => mkQuestion(id)));

    let handed: ContentSnapshot | null = null;
    await syncContent({
      locale: 'en',
      appSlug: SLUG,
      force: true,
      imageBatches: (data) => {
        handed = data;
        return [[urlFor(1)]];
      },
    });

    // The callback must see remote URLs only — it runs BEFORE any download, so a
    // caller resolving question images off it can never get a stale file:// path.
    expect(handed).not.toBeNull();
    expect((handed as unknown as ContentSnapshot).imageMap).toBeUndefined();
    expect((handed as unknown as ContentSnapshot).questions.map((q) => q.image_url)).toEqual([
      urlFor(1),
      urlFor(2),
    ]);
  });
});
