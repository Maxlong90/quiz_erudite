/**
 * Tests the priority-image latch in hooks/coat-of-arms/use-coat-content.tsx.
 *
 * The splash gates on `priorityReady`: it must start false and flip true only
 * once the sync reports the first PRIORITY_COUNT coats are on disk (batch 0),
 * and the batch the hook asks the sync to fetch FIRST must be exactly those
 * first PRIORITY_COUNT coats in stable order. A one-way latch — once true it
 * never goes back — so a re-sync can't re-trap the player behind the splash.
 */
import React from 'react';
import { Text } from 'react-native';
import { render, waitFor, act } from '@testing-library/react-native';

import { PRIORITY_COUNT } from '@/lib/coat-of-arms/content';

// A snapshot with more questions than the priority porción, each with a distinct
// image_url so we can assert the batch is the first PRIORITY_COUNT in order.
const SNAP = {
  questions: Array.from({ length: PRIORITY_COUNT + 10 }, (_, i) => ({
    id: i + 1,
    image_url: `https://api/coat/${i}`,
  })),
};

let capturedOpts: {
  onSnapshot?: (s: unknown) => void;
  onBatchImages?: (map: Record<string, string>, batchIndex: number) => void;
  imageBatches?: (data: typeof SNAP) => string[][];
} | null = null;

const mockSyncContent = jest.fn((opts: NonNullable<typeof capturedOpts>) => {
  capturedOpts = opts;
  // Never resolves on its own: the test drives onBatchImages, so the image-answer
  // step (after the await) never runs and can't race the assertions.
  return new Promise(() => {});
});

jest.mock('@/api/client', () => ({
  APP_SLUG: 'coat-of-arms',
  apiClient: { get: jest.fn().mockResolvedValue({ data: { data: [] } }), post: jest.fn() },
}));

jest.mock('@/lib/content-cache', () => ({
  cacheImages: jest.fn().mockResolvedValue({}),
  loadCachedSnapshot: jest.fn().mockResolvedValue(null),
  syncContent: (opts: NonNullable<typeof capturedOpts>) => mockSyncContent(opts),
  resolveFromMap: (map: Record<string, string>, url: string | null) =>
    url ? map[url] ?? url : null,
  resolveLocalImage: (snap: { imageMap?: Record<string, string> } | null, url: string | null) =>
    url ? snap?.imageMap?.[url] ?? url : null,
}));

jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('expo-image', () => ({ Image: { prefetch: jest.fn().mockResolvedValue(true) } }));

import { CoatContentProvider, useCoatContent } from '@/hooks/coat-of-arms/use-coat-content';

function Probe() {
  const { priorityReady } = useCoatContent();
  return <Text testID="ready">{String(priorityReady)}</Text>;
}

beforeEach(() => {
  capturedOpts = null;
  mockSyncContent.mockClear();
});

describe('use-coat-content — priority latch', () => {
  it('asks the sync to fetch the first PRIORITY_COUNT coats first, in order', async () => {
    render(
      <CoatContentProvider>
        <Probe />
      </CoatContentProvider>,
    );

    await waitFor(() => expect(capturedOpts).not.toBeNull());

    const batches = capturedOpts!.imageBatches!(SNAP);
    expect(batches).toHaveLength(1);
    expect(batches[0]).toEqual(
      Array.from({ length: PRIORITY_COUNT }, (_, i) => `https://api/coat/${i}`),
    );
  });

  it('starts false and latches true once batch 0 completes', async () => {
    const { getByTestId } = render(
      <CoatContentProvider>
        <Probe />
      </CoatContentProvider>,
    );

    await waitFor(() => expect(capturedOpts).not.toBeNull());
    // Before any batch reports in, the gate is closed.
    expect(getByTestId('ready').props.children).toBe('false');

    act(() => {
      capturedOpts!.onBatchImages!({}, 0);
    });
    expect(getByTestId('ready').props.children).toBe('true');
  });

  it('does not latch on a later batch alone (only batch 0)', async () => {
    const { getByTestId } = render(
      <CoatContentProvider>
        <Probe />
      </CoatContentProvider>,
    );

    await waitFor(() => expect(capturedOpts).not.toBeNull());

    act(() => {
      capturedOpts!.onBatchImages!({}, 1);
    });
    // A trailing batch is not the priority porción — the gate stays closed.
    expect(getByTestId('ready').props.children).toBe('false');
  });
});
