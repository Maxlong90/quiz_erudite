/**
 * The outline of Italy as SVG paths in a 100x120 viewBox, plus where each
 * place's pin sits inside it.
 *
 * Generated once from public country borders (johan/world.geo.json, ITA) and
 * checked in rather than fetched: the map is chrome, it has to draw instantly and
 * offline, and the shape of Italy is not going to change. Longitudes are squeezed
 * by cos(42) so the country reads at its true proportions instead of stretched
 * sideways, and the rings are simplified with Douglas-Peucker to keep the boot,
 * the heel and the islands recognisable without carrying thousands of points.
 *
 * Note for anyone regenerating this: a closed ring must be CUT before it is
 * simplified. With first == last the chord through the endpoints is degenerate,
 * every perpendicular distance comes out zero, and the whole coastline collapses
 * to two points.
 *
 * Pin coordinates run each city's real latitude and longitude through the SAME
 * projection, so a place sits where it actually is. `sicily` is the island's
 * centre rather than Palermo, because the whole island is the place.
 */

/** Mainland first (index 0 is the boot), then Sicily and Sardinia. */
export const ITALY_PATHS = [
  'M47.97,3.99 L60.16,6.95 L59.23,12.60 L61.27,17.49 L54.49,15.82 L47.56,19.89 L48.03,25.58 L46.99,28.85 L49.78,34.69 L57.77,40.47 L62.06,49.95 L71.55,59.20 L78.23,59.12 L80.30,61.66 L77.91,63.95 L91.81,71.56 L99.12,77.54 L100.00,79.69 L98.41,83.79 L93.68,78.44 L86.27,76.55 L82.68,83.97 L88.84,88.22 L87.83,94.21 L84.27,94.89 L79.72,104.73 L76.16,105.61 L76.20,102.10 L77.94,95.95 L79.79,93.50 L73.86,81.07 L70.32,79.64 L67.80,74.69 L62.32,72.60 L58.63,67.99 L52.33,67.25 L45.67,62.07 L37.87,54.60 L32.07,48.00 L29.41,36.66 L25.17,35.32 L18.23,31.54 L14.31,33.09 L9.38,38.41 L5.84,39.25 L6.82,34.27 L2.20,32.82 L0.00,23.94 L2.96,20.45 L0.45,16.14 L0.80,12.90 L4.47,15.35 L8.58,14.81 L13.36,10.92 L14.83,12.74 L18.89,12.37 L20.74,7.75 L27.05,9.18 L30.80,7.25 L31.48,2.54 L36.65,4.18 L37.64,1.99 L46.06,0.00 Z',
  'M74.77,101.91 L71.70,110.94 L72.97,114.50 L71.18,120.40 L64.66,116.08 L60.33,114.84 L48.43,109.01 L49.62,103.12 L59.60,104.17 Z',
  'M20.97,67.74 L26.09,75.89 L24.89,91.06 L21.01,90.34 L17.54,94.17 L14.31,91.12 L13.97,77.28 L12.02,70.73 L16.71,71.30 Z',
];

export const ITALY_VIEWBOX = { width: 100, height: 120.4 };

/** Pin position per place id, in viewBox units. */
export const PLACE_PINS: Record<string, { x: number; y: number }> = {
  milan: { x: 20.8, y: 18.9 },
  venice: { x: 47.4, y: 19.2 },
  florence: { x: 38.4, y: 38.4 },
  rome: { x: 49.0, y: 59.8 },
  naples: { x: 64.1, y: 71.9 },
  sicily: { x: 61.9, y: 109.2 },
};
