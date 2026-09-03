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
      "--brand-50":  rgb(240, 247, 255),
      "--brand-100": rgb(224, 239, 254),
      "--brand-200": rgb(186, 224, 253),
      "--brand-300": rgb(124, 200, 251),
      "--brand-400": rgb(54,  173, 246),
      "--brand-500": rgb(12,  147, 231),
      "--brand-600": rgb(0,   116, 197),
      "--brand-700": rgb(1,    93, 160),
      "--brand-800": rgb(6,    79, 132),
      "--brand-900": rgb(11,   66, 110),
      "--brand-950": rgb(7,    42,  73),
};

export type BrandShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export function brandColor(shade: BrandShade): string {
  const channels = BRAND[`--brand-${shade}`] ?? BRAND["--brand-600"];
  return `rgb(${channels.trim().split(/\s+/).join(", ")})`;
}
