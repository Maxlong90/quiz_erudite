/**
 * Tests the OFFLINE download-set guard for the "By continent" reveal in
 * hooks/coat-of-arms/use-coat-content.tsx.
 *
 * The reveal starts the instant a correct answer lands, so the original's bytes
 * must already be downloaded for offline play. That download happens through
 * cacheImages(), which must receive the CORRECT option's original and NEVER the
 * other three — pre-caching all four would quadruple the transfer for images the
 * player can never see, and a wrong option's original is a spoiler.
 *
 * The hook deliberately no longer BULK-prefetches the whole catalogue up-front
 * (that unordered fire-all contended with the ordered sync downloader and had no
 * readiness signal); decode-warming now lives in the look-ahead hook and the
 * splash. These tests lock the download-layer guard and that the bulk prefetch
 * stays gone.
 */
import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

const CORRECT_ORIGINAL = 'https://api/questions/3618/image?variant=original&v=abc';
const WRONG_ORIGINAL_A = 'https://api/questions/1111/image?variant=original&v=aaa';
const WRONG_ORIGINAL_B = 'https://api/questions/2222/image?variant=original&v=bbb';

// One coat question: correct_index 3 carries an original; options 0 and 1 carry
// decoy originals that must never be downloaded.
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

// expo-image's Image.prefetch is a static on the same object the look-ahead hook
// imports. The content hook no longer touches it; this guards that it stays so.
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

  it('no longer bulk-prefetches the whole catalogue up-front', async () => {
    render(
      <CoatContentProvider>
        <Text>child</Text>
      </CoatContentProvider>,
    );

    // Let the sync + image-answer fetch settle.
    await waitFor(() => expect(mockCacheImages).toHaveBeenCalled());

    // Decode-warming moved to the look-ahead hook / splash. The provider must
    // NOT fire the old unordered Image.prefetch that contended with the sync
    // downloader — in particular it must never touch a wrong option's original.
    const prefetched = urlsFrom(mockPrefetch);
    expect(prefetched).not.toContain(WRONG_ORIGINAL_A);
    expect(prefetched).not.toContain(WRONG_ORIGINAL_B);
    expect(mockPrefetch).not.toHaveBeenCalled();
  });
});
