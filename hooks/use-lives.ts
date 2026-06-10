import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getLives, isDailyClaimAvailable } from '@/lib/lives';

/**
 * Live lives count + whether the player has an unclaimed daily +10
 * waiting. The home screen reads `canClaim` to pop a "Claim 10 lives"
 * modal once per local day.
 */
export function useLives() {
  const [count, setCount] = useState(0);
  const [canClaim, setCanClaim] = useState(false);

  const reload = useCallback(async () => {
    const [c, claimable] = await Promise.all([getLives(), isDailyClaimAvailable()]);
    setCount(c);
    setCanClaim(claimable);
  }, []);

  useEffect(() => { reload(); }, [reload]);
  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  return { count, canClaim, reload };
}
