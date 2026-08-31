import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Set the first time the help sheet is shown, so it auto-opens exactly ONCE per
// install. After that the player re-opens it on demand from the "?" HUD button.
const HELP_SEEN_KEY = 'flags.help.seen.v1';

/**
 * Drives the Flags Quiz help sheet. On the very first entry into the questions
 * (either game mode) after a fresh install, the sheet auto-opens once and the
 * seen-flag is persisted; every later visit leaves it closed until the player
 * taps "?". Both gameplay screens share this hook and the same storage key, so
 * whichever mode is opened first is the one that shows it — and only once.
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
