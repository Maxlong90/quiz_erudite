import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getMistakeIds } from '@/lib/mistakes';

/**
 * Live count of recorded mistakes. Refreshes whenever the screen
 * regains focus so the home tile updates immediately after a quiz run
 * adds new mistakes.
 */
export function useMistakes() {
  const [count, setCount] = useState(0);

  const reload = useCallback(async () => {
    const ids = await getMistakeIds();
    setCount(ids.length);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  return { count, reload };
}
