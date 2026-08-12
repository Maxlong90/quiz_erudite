/**
 * Unit tests for the in-quiz "…" menu (components/logo-quiz/quiz-menu-modal.tsx).
 *
 * The menu offers Report + Share on the current logo-quiz question. These tests
 * lock in the two pieces of logic that aren't just presentation:
 *   - Report → maps the chosen reason to the backend enum and calls the shared
 *     submitReport({ contentType:'question', contentId, reason, comment, locale }),
 *     showing a success state on resolve and an error string on reject;
 *   - Share  → builds the invite by substituting the store URL into the
 *     localized `{url}` template and hands it to the system share sheet;
 *   - reopening the sheet always returns to the menu (never a stale report view).
 *
 * The report client (api/reports → api/client → axios) and store-links helper
 * are mocked so the test exercises the component's own wiring, not the network.
 */
import React from 'react';
import { Share } from 'react-native';
import { fireEvent, render, waitFor } from '@testing-library/react-native';

// --- module boundaries -------------------------------------------------------

jest.mock('@/hooks/use-locale', () => ({ useLocale: () => ({ locale: 'en' }) }));
jest.mock('@/hooks/use-sheet-drag', () => ({
  useSheetDrag: () => ({ panHandlers: {}, animatedStyle: {} }),
}));
jest.mock('@/lib/store-links', () => ({
  getStoreLinks: jest.fn(() => ({
    storeUrl: 'https://store.example/logo-quiz',
    rateDeepLink: '',
    rateFallbackUrl: '',
  })),
}));
// Mock the reports client directly so the axios-backed api/client never loads.
jest.mock('@/api/reports', () => ({ submitReport: jest.fn() }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

// eslint-disable-next-line import/first -- component under test loads AFTER its mocks
import { submitReport } from '@/api/reports';
// eslint-disable-next-line import/first
import { QuizMenuModal } from '@/components/logo-quiz/quiz-menu-modal';

const mockSubmit = submitReport as jest.Mock;

// --- fixtures ---------------------------------------------------------------

// Only `id` is read by the modal; the rest satisfies the LogoQuizQuestion shape.
const QUESTION = {
  id: 42,
  brand: 'Nike',
  options: ['Nike', 'Puma'],
  correctIndex: 0,
  imageUri: null,
  explanation: null,
  order: 2,
  level: 1,
  positionInLevel: 1,
  premium: false,
} as unknown as Parameters<typeof QuizMenuModal>[0]['question'];

const APP_CONFIG = { app_url_ios: null, app_url_android: null } as never;

function renderModal(overrides: Partial<Parameters<typeof QuizMenuModal>[0]> = {}) {
  const onClose = jest.fn();
  const view = render(
    <QuizMenuModal
      visible
      onClose={onClose}
      question={QUESTION}
      appConfig={APP_CONFIG}
      locale="en"
      {...overrides}
    />,
  );
  return { onClose, ...view };
}

beforeEach(() => {
  mockSubmit.mockReset();
});

// --- 1. Report submit → mapped reason + success state ------------------------

describe('report flow', () => {
  it('submits the mapped reason + locale and shows the success confirmation', async () => {
    mockSubmit.mockResolvedValueOnce(undefined);
    const { getByText, getByTestId } = renderModal();

    fireEvent.press(getByTestId('quiz-menu-report')); // open the reason picker
    fireEvent.press(getByText('Incorrect answer')); // maps to 'incorrect_answer'
    fireEvent.press(getByTestId('quiz-report-submit'));

    await waitFor(() => expect(getByText('Thank you!')).toBeTruthy());
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    expect(mockSubmit).toHaveBeenCalledWith({
      contentType: 'question',
      contentId: 42,
      reason: 'incorrect_answer',
      comment: undefined, // empty comment is sent as undefined
      locale: 'en',
    });
  });

  // --- 2. Report submit failure keeps the sheet open ------------------------

  it('shows the error string and keeps the report sheet open when submit fails', async () => {
    mockSubmit.mockRejectedValueOnce(new Error('network down'));
    const { getByText, queryByText, getByTestId } = renderModal();

    fireEvent.press(getByTestId('quiz-menu-report'));
    fireEvent.press(getByText('Translation issue')); // maps to 'translation_issue'
    fireEvent.press(getByTestId('quiz-report-submit'));

    await waitFor(() => expect(getByText("Couldn't send. Please try again.")).toBeTruthy());
    expect(queryByText('Thank you!')).toBeNull();
    // Still on the report sheet — the reasons + title remain visible to retry.
    expect(getByText('Report a problem')).toBeTruthy();
  });
});

// --- 3. Share substitutes the store URL into the template --------------------

describe('share flow', () => {
  it('shares the invite with the store URL substituted for {url} and closes', async () => {
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' } as never);
    const { getByTestId, onClose } = renderModal();

    fireEvent.press(getByTestId('quiz-menu-share'));

    expect(shareSpy).toHaveBeenCalledWith({
      message: 'Can you guess this logo? Play Logo Quiz: https://store.example/logo-quiz',
    });
    // The sheet now closes AFTER the awaited Share.share resolves (share first so
    // iOS can present the sheet before the RN Modal unmounts).
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    shareSpy.mockRestore();
  });
});

// --- 4. Reopening resets to the menu (no stale report view) ------------------

describe('reopen resets the view', () => {
  it('returns to the menu after the sheet was closed on the report view', () => {
    const { getByText, getByTestId, queryByText, rerender } = renderModal();

    fireEvent.press(getByTestId('quiz-menu-report'));
    expect(getByText('Report a problem')).toBeTruthy(); // now on the report view

    // Close, then reopen — the sheet must not reopen on the stale report view.
    rerender(
      <QuizMenuModal
        visible={false}
        onClose={() => {}}
        question={QUESTION}
        appConfig={APP_CONFIG}
        locale="en"
      />,
    );
    rerender(
      <QuizMenuModal
        visible
        onClose={() => {}}
        question={QUESTION}
        appConfig={APP_CONFIG}
        locale="en"
      />,
    );

    expect(getByText('Report question')).toBeTruthy(); // menu row, not the report title
    expect(queryByText('Report a problem')).toBeNull();
  });
});
