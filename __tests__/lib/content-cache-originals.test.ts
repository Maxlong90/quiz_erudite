/**
 * Tests for the ORIGINAL image variant in lib/content-cache.ts — the
 * pre-cleaning artwork the Coat of Arms quiz reveals after a correct answer.
 *
 * The backend emits `image_url_original` ONLY when an original exists (64 of the
 * 195 coats), via a conditional spread that keeps every other app's snapshot
 * byte-for-byte identical. So the key is ABSENT, not null, on the other 131 —
 * which is exactly what these tests pin down: the sync must download the extra
 * variant where it exists and stay a perfect no-op where it doesn't.
 *
 * The api client and expo-file-system are mocked so no network or filesystem is
 * touched; AsyncStorage is auto-mocked globally.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import { apiClient } from '@/api/client';
import { syncContent, type SnapshotQuestion } from '@/lib/content-cache';

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

const COAT_SLUG = 'coat-of-arms';
const CLEAN_URL = 'https://api.test/questions/3604/image?v=aaaaaaaaaaaa';
const ORIGINAL_URL = 'https://api.test/questions/3604/image?variant=original&v=bbbbbbbbbbbb';
const PLAIN_URL = 'https://api.test/questions/3700/image?v=cccccccccccc';

function mkQuestion(id: number, over: Partial<SnapshotQuestion> = {}): SnapshotQuestion {
  return {
    id,
    category_slug: 'coat-of-arms-africa',
    question: 'Which country does this coat of arms belong to?',
    options: ['Angola', 'Mali', 'Chad', 'Gabon'],
    correct_option: 0,
    explanation: null,
    image_url: `https://api.test/questions/${id}/image?v=default`,
    ...over,
  };
}

/** Stub the snapshot endpoint with the given questions. */
function respondWith(questions: SnapshotQuestion[]) {
  get.mockResolvedValue({
    data: {
      app: { slug: COAT_SLUG, name: 'Coat of Arms', supported_locales: ['en'] },
      locale: 'en',
      version: 42,
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

describe('syncContent — original image variant', () => {
  it('downloads BOTH variants for a question that has an original', async () => {
    respondWith([mkQuestion(3604, { image_url: CLEAN_URL, image_url_original: ORIGINAL_URL })]);

    await syncContent({ locale: 'en', appSlug: COAT_SLUG, force: true });

    expect(downloadedUrls()).toEqual(expect.arrayContaining([CLEAN_URL, ORIGINAL_URL]));
  });

  it('downloads nothing extra when the key is ABSENT — the 131-coat case', async () => {
    respondWith([
      mkQuestion(3604, { image_url: CLEAN_URL, image_url_original: ORIGINAL_URL }),
      mkQuestion(3700, { image_url: PLAIN_URL }),
    ]);

    await syncContent({ locale: 'en', appSlug: COAT_SLUG, force: true });

    // Exactly 3 for 2 questions: the missing key contributes NOTHING. This is the
    // regression guard on the `.filter((u): u is string => !!u)` narrowing.
    const urls = downloadedUrls();
    expect(urls).toHaveLength(3);
    expect(urls.sort()).toEqual([CLEAN_URL, ORIGINAL_URL, PLAIN_URL].sort());
  });

  it('caches the two variants to DIFFERENT local files', async () => {
    respondWith([mkQuestion(3604, { image_url: CLEAN_URL, image_url_original: ORIGINAL_URL })]);

    const snap = await syncContent({ locale: 'en', appSlug: COAT_SLUG, force: true });

    // Both URLs end in the same `/image` path segment and differ only in their
    // query string, so this is the collision class that once made every question
    // reuse a single file (the bug behind the `v2` cache-key bump). imageFilename
    // hashes the WHOLE url, so they must land in separate files.
    expect(snap.imageMap?.[CLEAN_URL]).toBeTruthy();
    expect(snap.imageMap?.[ORIGINAL_URL]).toBeTruthy();
    expect(snap.imageMap?.[CLEAN_URL]).not.toBe(snap.imageMap?.[ORIGINAL_URL]);
  });

  it('leaves an originals-free snapshot byte-for-byte unchanged (the other 12 apps)', async () => {
    respondWith([mkQuestion(3700, { image_url: PLAIN_URL }), mkQuestion(3701)]);

    await syncContent({ locale: 'en', appSlug: 'flags-quiz', force: true });

    expect(downloadedUrls()).toEqual([
      PLAIN_URL,
      'https://api.test/questions/3701/image?v=default',
    ]);
  });

  it('keeps download progress monotonic and ending at exactly 1', async () => {
    respondWith([
      mkQuestion(3604, { image_url: CLEAN_URL, image_url_original: ORIGINAL_URL }),
      mkQuestion(3700, { image_url: PLAIN_URL }),
    ]);

    const seen: number[] = [];
    await syncContent({
      locale: 'en',
      appSlug: COAT_SLUG,
      force: true,
      onProgress: (p) => seen.push(p),
    });

    // Adding a second variant per question must not skew the 0.2 + 0.8*(done/total)
    // math — `total` is derived from the final URL set, so it stays well-formed.
    expect(seen.length).toBeGreaterThan(0);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(1);
    expect(seen[seen.length - 1]).toBe(1);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
  });

  it('persists the original URL in the stored snapshot so a reveal survives a restart', async () => {
    respondWith([mkQuestion(3604, { image_url: CLEAN_URL, image_url_original: ORIGINAL_URL })]);

    await syncContent({ locale: 'en', appSlug: COAT_SLUG, force: true });

    const raw = await AsyncStorage.getItem('content.snapshot.v2:coat-of-arms');
    const stored = JSON.parse(raw as string);
    expect(stored.questions[0].image_url_original).toBe(ORIGINAL_URL);
  });
});
