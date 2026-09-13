import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { usePlaceProgress } from '@/hooks/italy-quiz/use-place-progress';
import { ROME_QUESTIONS } from '@/constants/italy-quiz/questions/rome';
import { QUESTIONS_PER_ACT, getPlace } from '@/constants/italy-quiz/places';
import { drawCircle, type ProgressMapV2 } from '@/lib/italy-quiz/circles';

/**
 * The REAL useFocusEffect runs its callback on focus and whenever the callback's
 * identity changes; usePlaceProgress does its whole hydration in there. The bare
 * `() => {}` stub most suites use would leave every assertion below addressing
 * an empty map.
 */
jest.mock('expo-router', () => {
  const ReactModule = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), dismissTo: jest.fn() },
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useFocusEffect: (effect: () => undefined | (() => void)) =>
      // eslint-disable-next-line react-hooks/rules-of-hooks
      ReactModule.useEffect(effect, [effect]),
  };
});

const KEY_V1 = 'italy.progress.v1';
const KEY_V2 = 'italy.progress.v2';

const rome = getPlace('rome')!;
const CIRCLE = rome.acts.length * QUESTIONS_PER_ACT;

async function readV2(): Promise<ProgressMapV2> {
  const raw = await AsyncStorage.getItem(KEY_V2);
  return raw ? JSON.parse(raw) : {};
}

async function mount() {
  const view = renderHook(() => usePlaceProgress());
  await waitFor(() => expect(view.result.current.hydrated).toBe(true));
  return view;
}

/**
 * Every call here publishes to React state when it resolves, so awaiting it
 * bare would land the update outside act() — the assertion would then read the
 * render BEFORE the write it just made.
 */
async function run<T>(fn: () => Promise<T>): Promise<T> {
  let out!: T;
  await act(async () => {
    out = await fn();
  });
  return out;
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('ensureCircle', () => {
  it('fixes a circle once and hands back the same twenty ever after', async () => {
    const view = await mount();

    const first = await run(() => view.result.current.ensureCircle('rome', 1));
    const second = await run(() => view.result.current.ensureCircle('rome', 1));

    expect(first).toMatchObject({ ok: true, fresh: true });
    expect(second).toMatchObject({ ok: true, fresh: false });
    if (!first.ok || !second.ok) throw new Error('unreachable');
    expect(second.ids).toEqual(first.ids);
    expect(first.ids).toHaveLength(CIRCLE);

    // And it survives the screen going away and coming back.
    view.unmount();
    const again = await mount();
    const third = await run(() => again.result.current.ensureCircle('rome', 1));
    expect(third).toEqual({ ok: true, ids: first.ids, fresh: false });
  });

  it('refuses a circle whose predecessor has not been cleared', async () => {
    const view = await mount();
    expect(await run(() => view.result.current.ensureCircle('rome', 2))).toEqual({
      ok: false,
      reason: 'locked',
    });
  });

  it('refuses a city the chain has not opened yet', async () => {
    const view = await mount();
    expect(await run(() => view.result.current.ensureCircle('florence', 1))).toEqual({
      ok: false,
      reason: 'no-content',
    });
  });

  it('reports "soon" when the content cannot fill another circle', async () => {
    const view = await mount();
    await run(() => view.result.current.ensureCircle('rome', 1));
    await run(() => view.result.current.recordCircle('rome', 1, CIRCLE, CIRCLE));

    // Circle 2 is open by progress but Rome has only eight questions per act.
    expect(await run(() => view.result.current.ensureCircle('rome', 2))).toEqual({
      ok: false,
      reason: 'soon',
    });
  });
});

describe('migration from italy.progress.v1', () => {
  const seenExactly = () => drawCircle(rome, ROME_QUESTIONS, new Set())!;

  it('turns a v1 record into circle 1 without losing anything', async () => {
    const seen = seenExactly();
    const v1 = JSON.stringify({ rome: { stars: 2, bestPct: 85, plays: 3, seen } });
    await AsyncStorage.setItem(KEY_V1, v1);

    const view = await mount();
    await waitFor(() => expect(view.result.current.progress.rome).toBeDefined());

    expect(view.result.current.progress.rome.circles).toEqual([
      { index: 1, ids: seen, stars: 2, bestPct: 85, plays: 3 },
    ]);
    // The old key is left byte-identical: an app rollback must still find it.
    expect(await AsyncStorage.getItem(KEY_V1)).toBe(v1);
  });

  it('keeps the stars when the seen set is not exactly one tour', async () => {
    // Several tours were merged into `seen`, so the set cannot be reconstructed —
    // but the circle still counts as passed and is re-fixed on next entry.
    const partial = ROME_QUESTIONS.slice(0, 25).map((q) => q.id);
    await AsyncStorage.setItem(
      KEY_V1,
      JSON.stringify({ rome: { stars: 2, bestPct: 85, plays: 4, seen: partial } }),
    );

    const view = await mount();
    await waitFor(() => expect(view.result.current.progress.rome).toBeDefined());
    expect(view.result.current.progress.rome.circles[0]).toMatchObject({ ids: [], stars: 2 });

    const fixed = await run(() => view.result.current.ensureCircle('rome', 1));
    expect(fixed).toMatchObject({ ok: true, fresh: true });
    if (!fixed.ok) throw new Error('unreachable');
    expect(fixed.ids).toHaveLength(CIRCLE);

    // Fixing a set must never cost a star — this is the spread order in
    // upsertCircle, and it is the single most breakable line in the change.
    const stored = await readV2();
    expect(stored.rome.circles[0]).toMatchObject({
      ids: fixed.ids,
      stars: 2,
      bestPct: 85,
      plays: 4,
    });
  });

  it('runs once: a v2 map always wins over whatever v1 still says', async () => {
    await AsyncStorage.setItem(
      KEY_V1,
      JSON.stringify({ rome: { stars: 3, bestPct: 100, plays: 9, seen: [] } }),
    );
    await AsyncStorage.setItem(
      KEY_V2,
      JSON.stringify({ rome: { circles: [{ index: 1, ids: [], stars: 1, bestPct: 55, plays: 1 }] } }),
    );

    const view = await mount();
    await waitFor(() => expect(view.result.current.progress.rome).toBeDefined());
    expect(view.result.current.progress.rome.circles[0]).toMatchObject({ stars: 1, bestPct: 55 });
  });

  it('writes nothing at all when there is no progress to migrate', async () => {
    const view = await mount();
    expect(view.result.current.progress).toEqual({});
    expect(await AsyncStorage.getItem(KEY_V2)).toBeNull();
  });

  it('drops the legacy mid-tour blobs but not the new per-circle ones', async () => {
    await AsyncStorage.setItem(
      KEY_V1,
      JSON.stringify({ rome: { stars: 1, bestPct: 55, plays: 1, seen: [] } }),
    );
    await AsyncStorage.setItem('italy.tour.rome', JSON.stringify({ ids: [1], pos: 1, wrong: [] }));
    await AsyncStorage.setItem(
      'italy.tour.rome.c1',
      JSON.stringify({ ids: [1], pos: 1, wrong: [] }),
    );

    const view = await mount();
    await waitFor(() => expect(view.result.current.progress.rome).toBeDefined());

    expect(await AsyncStorage.getItem('italy.tour.rome')).toBeNull();
    expect(await AsyncStorage.getItem('italy.tour.rome.c1')).not.toBeNull();
  });

  it('drops a set that references questions the content no longer has', async () => {
    await AsyncStorage.setItem(
      KEY_V2,
      JSON.stringify({
        rome: { circles: [{ index: 1, ids: [9001, 9002], stars: 2, bestPct: 80, plays: 1 }] },
      }),
    );

    const view = await mount();
    await waitFor(() => expect(view.result.current.progress.rome).toBeDefined());
    expect(view.result.current.progress.rome.circles[0]).toMatchObject({ ids: [], stars: 2 });
  });
});

describe('recordCircle', () => {
  it('keeps the best stars and never moves the set', async () => {
    const view = await mount();
    const fixed = await run(() => view.result.current.ensureCircle('rome', 1));
    if (!fixed.ok) throw new Error('unreachable');

    await run(() => view.result.current.recordCircle('rome', 1, CIRCLE, CIRCLE));
    const weak = await run(() => view.result.current.recordCircle('rome', 1, 5, CIRCLE));

    expect(weak.earned).toBe(0);
    const stored = await readV2();
    expect(stored.rome.circles[0]).toEqual({
      index: 1,
      ids: fixed.ids,
      stars: 3,
      bestPct: 100,
      plays: 2,
    });
  });

  it('announces the new city when a first circle is cleared', async () => {
    const view = await mount();
    await run(() => view.result.current.ensureCircle('rome', 1));
    const outcome = await run(() => view.result.current.recordCircle('rome', 1, CIRCLE / 2, CIRCLE));

    expect(outcome).toEqual({
      earned: 1,
      passed: true,
      unlocked: { kind: 'city', placeId: 'florence' },
    });
    // …and that is what actually opens Florence on the map.
    expect(view.result.current.progress.rome.circles[0].stars).toBe(1);
  });

  it('announces nothing the second time the same circle is cleared', async () => {
    const view = await mount();
    await run(() => view.result.current.ensureCircle('rome', 1));
    await run(() => view.result.current.recordCircle('rome', 1, CIRCLE / 2, CIRCLE));
    const again = await run(() => view.result.current.recordCircle('rome', 1, CIRCLE, CIRCLE));
    expect(again).toMatchObject({ earned: 3, passed: true, unlocked: null });
  });

  it('is a no-op on a circle that was never entered', async () => {
    const view = await mount();
    const outcome = await run(() => view.result.current.recordCircle('rome', 4, CIRCLE, CIRCLE));
    expect(outcome).toEqual({ earned: 3, passed: true, unlocked: null });
    expect(await AsyncStorage.getItem(KEY_V2)).toBeNull();
  });
});

describe('concurrent writes', () => {
  it('does not let a set-fix and a result overwrite each other', async () => {
    const view = await mount();
    const fixed = await run(() => view.result.current.ensureCircle('rome', 1));
    if (!fixed.ok) throw new Error('unreachable');

    // Both in the same tick. Under the old fire-and-forget write one of these
    // would silently win and the player would lose either the ids or the star.
    await run(() =>
      Promise.all([
        view.result.current.ensureCircle('rome', 1),
        view.result.current.recordCircle('rome', 1, CIRCLE, CIRCLE),
      ]),
    );

    const stored = await readV2();
    expect(stored.rome.circles[0]).toMatchObject({ ids: fixed.ids, stars: 3, plays: 1 });
  });

  it('draws one set even when two ensures race', async () => {
    const view = await mount();
    const [a, b] = await run(() =>
      Promise.all([
        view.result.current.ensureCircle('rome', 1),
        view.result.current.ensureCircle('rome', 1),
      ]),
    );

    if (!a.ok || !b.ok) throw new Error('unreachable');
    expect(a.ids).toEqual(b.ids);
    expect([a.fresh, b.fresh].filter(Boolean)).toHaveLength(1);
    expect((await readV2()).rome.circles).toHaveLength(1);
  });
});
