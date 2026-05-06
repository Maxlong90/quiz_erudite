import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'onboarding.seen.v1';

export function useOnboarding() {
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => setHasSeen(v === '1'))
      .catch(() => setHasSeen(false));
  }, []);

  const markSeen = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEY, '1');
    setHasSeen(true);
  }, []);

  return { hasSeen, markSeen };
}
