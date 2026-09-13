import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useTourProgress } from '@/hooks/italy-quiz/use-tour-progress';

/**
 * The hook no longer draws anything — a circle's order is fixed upstream and
 * handed in. What is left is the part that can still lose a player's place: how
 * a saved position is matched against the circle being entered.
 */
const KEY = 'italy.tour.rome.c1';
const IDS = [5, 9, 1, 7];

const mount = (opts: Parameters<typeof useTourProgress>[0]) => renderHook(() => useTourProgress(opts));

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('waits, showing nothing, while the circle is still being resolved', async () => {
  const view = mount({ key: KEY, ids: null, retry: null, epoch: 0 });
  expect(view.result.current.hydrated).toBe(false);
  expect(view.result.current.ids).toEqual([]);
});

it('resumes a saved position when the set matches exactly', async () => {
  await AsyncStorage.setItem(KEY, JSON.stringify({ ids: IDS, pos: 2, wrong: [9] }));

  const view = mount({ key: KEY, ids: IDS, retry: null, epoch: 0 });
  await waitFor(() => expect(view.result.current.hydrated).toBe(true));

  expect(view.result.current.pos).toBe(2);
  expect(view.result.current.wrong).toEqual([9]);
});

it('discards a saved position whose ORDER differs', async () => {
  // Same twenty in a different order is a different circle as far as a resume is
  // concerned: the position would land on the wrong question.
  await AsyncStorage.setItem(KEY, JSON.stringify({ ids: [...IDS].reverse(), pos: 2, wrong: [] }));

  const view = mount({ key: KEY, ids: IDS, retry: null, epoch: 0 });
  await waitFor(() => expect(view.result.current.hydrated).toBe(true));

  expect(view.result.current.pos).toBe(0);
  expect(view.result.current.ids).toEqual(IDS);
});

it('never persists a mistakes review', async () => {
  const view = mount({ key: null, ids: null, retry: [9, 7], epoch: 0 });
  await waitFor(() => expect(view.result.current.hydrated).toBe(true));

  expect(view.result.current.ids).toEqual([9, 7]);
  act(() => view.result.current.setPos(1));

  await waitFor(() => expect(view.result.current.pos).toBe(1));
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});
