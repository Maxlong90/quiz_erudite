import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getHints, type HintsState } from '@/lib/hints';

const EMPTY: HintsState = { fiftyFifty: 0, statistics: 0, replaceQuestion: 0 };

export function useHintsState() {
  const [state, setState] = useState<HintsState>(EMPTY);

  const reload = useCallback(async () => {
    setState(await getHints());
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { state, reload };
}
