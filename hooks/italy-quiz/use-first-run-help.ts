import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set the first time the help sheet is shown, so it auto-opens exactly ONCE per
// install. After that the player re-opens it on demand from the "?" button.
//
// Bumped to v2 when the sheet was rewritten around circles: an install that had
// already seen the old mistakes-only paragraph has not been told any of the
// rules it now needs, so it is worth one more automatic showing.
const HELP_SEEN_KEY = 'italy.help.seen.v2';

/**
 * Drives the Italy Quiz help sheet — the same pattern as the Flags Quiz hook.
 * On the very first run after a fresh install the sheet auto-opens once (from
 * the MAP, which is the screen every player reaches before a tour) and the
 * seen-flag is persisted; later runs leave it closed until the player taps "?".
 *
 * Exactly ONE screen may own this. If both the map and the tour called it they
 * would race on mount and the sheet could auto-open twice.
 *
 * Returns the same `[open, setOpen]` shape as useState so the "?" button can
 * force it open at any time.
 */
export function useFirstRunHelp(): [boolean, (open: boolean) => void] {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(HELP_SEEN_KEY)
      .then((seen) => {
        if (active && !seen) {
          setOpen(true);
          AsyncStorage.setItem(HELP_SEEN_KEY, '1').catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return [open, setOpen];
}
