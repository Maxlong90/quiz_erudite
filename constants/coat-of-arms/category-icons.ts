import { useEffect, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import { Asset } from 'expo-asset';

/**
 * Coat-of-arms Play-screen category icons (bundled, transparent PNGs). Shared so
 * they can be PRELOADED from the feature layout — long before the Play screen
 * mounts — which is what stops the "flash" when opening Play: by the time the
 * user taps Play the icons are already decoded, so the background + buttons +
 * icons all appear in one frame instead of the screen holding a plain blue base
 * while the icons warm up.
 */
export const CATEGORY_ICON = {
  allCountries: require('../../assets/coat-of-arms/categories/all-countries.png'),
  byContinents: require('../../assets/coat-of-arms/categories/by-continents.png'),
  challenge: require('../../assets/coat-of-arms/categories/challenge.png'),
  cities: require('../../assets/coat-of-arms/categories/cities.png'),
  bonus: require('../../assets/coat-of-arms/categories/bonus.png'),
} as const satisfies Record<string, ImageSourcePropType>;

// `require()` of a bundled image resolves to a numeric module id — the shape
// Asset.loadAsync expects.
export const CATEGORY_ICON_MODULES = Object.values(CATEGORY_ICON) as number[];

/** Warm all category icons into the asset cache. Fails open; idempotent (later
 *  calls resolve instantly once cached). Call it early (feature layout) so the
 *  Play screen never has to wait. */
export function preloadCategoryIcons(): Promise<unknown> {
  return Asset.loadAsync(CATEGORY_ICON_MODULES).catch(() => {});
}

/** True once every category icon is decoded and cached. */
export function useCategoryIconsReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    preloadCategoryIcons().finally(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
