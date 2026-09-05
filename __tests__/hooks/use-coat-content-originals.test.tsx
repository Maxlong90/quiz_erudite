/**
 * Tests the OFFLINE + WARM-CACHE wiring for the "By continent" reveal in
 * hooks/coat-of-arms/use-coat-content.tsx.
 *
 * The reveal starts the instant a correct answer lands, so the original's bytes
 * must already be downloaded (offline play) and DECODED in the memory cache (a
 * warm disk file alone still costs a decode frame). Two collaborators carry that:
 *
 *   - cacheImages(): downloads into the namespaced offline cache;
 *   - Image.prefetch(): warms the memory+disk cache.
 *
 * Both must receive the CORRECT option's original and NEITHER may receive the
 * other three — pre-caching all four would quadruple the transfer for images the
 * player can never see, and a wrong option's original is a spoiler.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const CORRECT_ORIGINAL = 'https://api/questions/3618/image?variant=original&v=abc';
const WRONG_ORIGINAL_A = 'https://api/questions/1111/image?variant=original&v=aaa';
const WRONG_ORIGINAL_B = 'https://api/questions/2222/image?variant=original&v=bbb';

// One coat question: correct_index 3 carries an original; options 0 and 1 carry
// decoy originals that must never be downloaded or prefetched.
//
// The URLs are written out LITERALLY rather than referencing the consts above:
// jest.mock() hoisting lifts this declaration above them, so referencing them
// here would silently bake `undefined` into every image_url_original and the
// fixture would quietly lose the very keys under test.
const RAW = [
  {
    id: 3551,
    category_slug: 'coat-of-arms-africa',
    title: 'Egypt',
    options: [
      {
        image_url: 'https://api/q/3551/a/0',
        image_url_original: 'https://api/questions/1111/image?variant=original&v=aaa',
      },
      {
        image_url: 'https://api/q/3551/a/1',
        image_url_original: 'https://api/questions/2222/image?variant=original&v=bbb',
      },
      { image_url: 'https://api/q/3551/a/2' },
      {
        image_url: 'https://api/q/3551/a/3',
        image_url_original: 'https://api/questions/3618/image?variant=original&v=abc',
      },
    ],
    correct_index: 3,
    explanation: null,
  },
];

const mockCacheImages = jest.fn().mockResolvedValue({});
const mockPrefetch = jest.fn().mockResolvedValue(true);

jest.mock('@/api/client', () => ({
  APP_SLUG: 'coat-of-arms',
  apiClient: { get: jest.fn().mockResolvedValue({ data: { data: RAW } }), post: jest.fn() },
}));

jest.mock('@/lib/content-cache', () => ({
  cacheImages: (...args: unknown[]) => mockCacheImages(...args),
  loadCachedSnapshot: jest.fn().mockResolvedValue(null),
  syncContent: jest.fn().mockResolvedValue(null),
  // Real resolution semantics: a cached URL maps to its local file, otherwise the
  // remote URL survives; null stays null.
  resolveFromMap: (map: Record<string, string>, url: string | null) =>
    url ? map[url] ?? url : null,
  resolveLocalImage: (snap: { imageMap?: Record<string, string> } | null, url: string | null) =>
    url ? snap?.imageMap?.[url] ?? url : null,
}));

jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));

// expo-image's Image.prefetch is a static on the same object the hook imports.
jest.mock('expo-image', () => ({
  Image: { prefetch: (...args: unknown[]) => mockPrefetch(...args) },
}));

import { CoatContentProvider } from '@/hooks/coat-of-arms/use-coat-content';

/** Flatten every URL handed to a collaborator across all its calls. */
const urlsFrom = (mock: jest.Mock) =>
  mock.mock.calls.flatMap((call) => (Array.isArray(call[0]) ? call[0] : [])).filter(Boolean);

beforeEach(() => {
  mockCacheImages.mockClear();
  mockPrefetch.mockClear();
});

describe('use-coat-content — original artwork caching', () => {
  it('downloads the CORRECT option original for offline play, and no others', async () => {
    render(
      <CoatContentProvider>
        <Text>child</Text>
      </CoatContentProvider>,
    );

    await waitFor(() => expect(mockCacheImages).toHaveBeenCalled());

    // Guard the fixture itself: if hoisting ever strips the keys again, fail
    // here with a clear cause instead of a confusing "feature is broken".
    expect(RAW[0].options[3].image_url_original).toBe(CORRECT_ORIGINAL);

    const downloaded = urlsFrom(mockCacheImages);
    expect(downloaded).toContain(CORRECT_ORIGINAL);
    // The played options still download as before.
    expect(downloaded).toContain('https://api/q/3551/a/3');
    // ...but never a wrong option's original.
    expect(downloaded).not.toContain(WRONG_ORIGINAL_A);
    expect(downloaded).not.toContain(WRONG_ORIGINAL_B);
  });

  it('prefetches the CORRECT option original so the reveal has decoded bytes', async () => {
    render(
      <CoatContentProvider>
        <Text>child</Text>
      </CoatContentProvider>,
    );

    await waitFor(() => {
      expect(urlsFrom(mockPrefetch)).toContain(CORRECT_ORIGINAL);
    });

    const prefetched = urlsFrom(mockPrefetch);
    expect(prefetched).not.toContain(WRONG_ORIGINAL_A);
    expect(prefetched).not.toContain(WRONG_ORIGINAL_B);
    // Prefetch warms the memory cache, not just disk.
    expect(mockPrefetch).toHaveBeenCalledWith(expect.any(Array), {
      cachePolicy: 'memory-disk',
    });
  });
});
