/**
 * The app's brand palette.
 *
 * This used to be six selectable schemes plus a custom colour, chosen at
 * runtime and persisted. That picker is gone; the palette is fixed here so
 * there is one source of truth rather than a stored id resolving to a table.
 *
 * React Native's StyleSheet accepts CSS-style "rgb(r, g, b)" strings directly,
 * so the space-separated channel values can be used as-is.
 */

const rgb = (r: number, g: number, b: number) => `${r} ${g} ${b}`;

const BRAND: Record<string, string> = {
      // Board Green — kept in lockstep with the frontend's globals.css ramp.
      // --brand-500 is the mark's own green (#7cac42); the filled-button step
      // at 600 is darker on purpose, because #7cac42 carries white text at
      // only 2.7:1 while #5c7a33 clears AA at 4.9:1.
      "--brand-50":  rgb(243, 248, 234),
      "--brand-100": rgb(228, 241, 207),
      "--brand-200": rgb(203, 227, 166),
      "--brand-300": rgb(174, 209, 119),
      "--brand-400": rgb(147, 190,  82),
      "--brand-500": rgb(124, 172,  66),
      "--brand-600": rgb(92,  122,  51),
      "--brand-700": rgb(74,   99,  41),
      "--brand-800": rgb(59,   79,  33),
      "--brand-900": rgb(47,   64,  27),
      "--brand-950": rgb(27,   37,  16),
};

export type BrandShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export function brandColor(shade: BrandShade): string {
  const channels = BRAND[`--brand-${shade}`] ?? BRAND["--brand-600"];
  return `rgb(${channels.trim().split(/\s+/).join(", ")})`;
}
