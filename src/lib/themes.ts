export type ThemeId = "ocean" | "forest" | "purple" | "rose" | "amber" | "teal" | "custom";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  preview: string; // hex for the swatch circle
  vars: Record<string, string>; // space-separated RGB channel values
}

const rgb = (r: number, g: number, b: number) => `${r} ${g} ${b}`;

export const THEMES: ThemeConfig[] = [
  {
    id: "ocean",
    name: "Ocean",
    preview: "#0074c5",
    vars: {
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
    },
  },
  {
    id: "forest",
    name: "Forest",
    preview: "#16a34a",
    vars: {
      "--brand-50":  rgb(240, 253, 244),
      "--brand-100": rgb(220, 252, 231),
      "--brand-200": rgb(187, 247, 208),
      "--brand-300": rgb(134, 239, 172),
      "--brand-400": rgb(74,  222, 128),
      "--brand-500": rgb(34,  197,  94),
      "--brand-600": rgb(22,  163,  74),
      "--brand-700": rgb(21,  128,  61),
      "--brand-800": rgb(22,  101,  52),
      "--brand-900": rgb(20,   83,  45),
      "--brand-950": rgb(5,    46,  22),
    },
  },
  {
    id: "purple",
    name: "Royal",
    preview: "#9333ea",
    vars: {
      "--brand-50":  rgb(250, 245, 255),
      "--brand-100": rgb(243, 232, 255),
      "--brand-200": rgb(233, 213, 255),
      "--brand-300": rgb(216, 180, 254),
      "--brand-400": rgb(192, 132, 252),
      "--brand-500": rgb(168,  85, 247),
      "--brand-600": rgb(147,  51, 234),
      "--brand-700": rgb(126,  34, 206),
      "--brand-800": rgb(107,  33, 168),
      "--brand-900": rgb(88,   28, 135),
      "--brand-950": rgb(59,    7, 100),
    },
  },
  {
    id: "rose",
    name: "Rose",
    preview: "#e11d48",
    vars: {
      "--brand-50":  rgb(255, 241, 242),
      "--brand-100": rgb(255, 228, 230),
      "--brand-200": rgb(254, 205, 211),
      "--brand-300": rgb(253, 164, 175),
      "--brand-400": rgb(251, 113, 133),
      "--brand-500": rgb(244,  63,  94),
      "--brand-600": rgb(225,  29,  72),
      "--brand-700": rgb(190,  18,  60),
      "--brand-800": rgb(159,  18,  57),
      "--brand-900": rgb(136,  19,  55),
      "--brand-950": rgb(76,    5,  25),
    },
  },
  {
    id: "amber",
    name: "Amber",
    preview: "#d97706",
    vars: {
      "--brand-50":  rgb(255, 251, 235),
      "--brand-100": rgb(254, 243, 199),
      "--brand-200": rgb(253, 230, 138),
      "--brand-300": rgb(252, 211,  77),
      "--brand-400": rgb(251, 191,  36),
      "--brand-500": rgb(245, 158,  11),
      "--brand-600": rgb(217, 119,   6),
      "--brand-700": rgb(180,  83,   9),
      "--brand-800": rgb(146,  64,  14),
      "--brand-900": rgb(120,  53,  15),
      "--brand-950": rgb(69,   26,   3),
    },
  },
  {
    id: "teal",
    name: "Teal",
    preview: "#0d9488",
    vars: {
      "--brand-50":  rgb(240, 253, 250),
      "--brand-100": rgb(204, 251, 241),
      "--brand-200": rgb(153, 246, 228),
      "--brand-300": rgb(94,  234, 212),
      "--brand-400": rgb(45,  212, 191),
      "--brand-500": rgb(20,  184, 166),
      "--brand-600": rgb(13,  148, 136),
      "--brand-700": rgb(15,  118, 110),
      "--brand-800": rgb(17,   94,  89),
      "--brand-900": rgb(19,   78,  74),
      "--brand-950": rgb(4,    47,  46),
    },
  },
];

// ── Custom palette generator ──────────────────────────────────────────────────

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToRgbStr(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * Math.max(0, Math.min(1, c)));
  };
  return `${f(0)} ${f(8)} ${f(4)}`;
}

export function generatePaletteVars(hex: string): Record<string, string> {
  const [h, s, l] = hexToHsl(hex);
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return {
    "--brand-50":  hslToRgbStr(h, clamp(s * 0.4), 97),
    "--brand-100": hslToRgbStr(h, clamp(s * 0.5), 93),
    "--brand-200": hslToRgbStr(h, clamp(s * 0.6), 86),
    "--brand-300": hslToRgbStr(h, clamp(s * 0.75), 76),
    "--brand-400": hslToRgbStr(h, clamp(s * 0.88), 65),
    "--brand-500": hslToRgbStr(h, s, clamp(l + 8)),
    "--brand-600": hslToRgbStr(h, s, l),
    "--brand-700": hslToRgbStr(h, clamp(s * 1.05), clamp(l * 0.78)),
    "--brand-800": hslToRgbStr(h, clamp(s * 1.1), clamp(l * 0.63)),
    "--brand-900": hslToRgbStr(h, clamp(s * 1.1), clamp(l * 0.52)),
    "--brand-950": hslToRgbStr(h, clamp(s * 1.1), clamp(l * 0.37)),
  };
}

export function getThemeVars(id: ThemeId, customColor?: string | null): Record<string, string> {
  if (id === "custom" && customColor) return generatePaletteVars(customColor);
  return THEMES.find((t) => t.id === id)?.vars ?? THEMES[0].vars;
}

// RN-only addition: React Native's StyleSheet accepts CSS-style "rgb(r,g,b)"
// color strings directly, so the space-separated channel values above can be
// used as-is without a build-time CSS variable step like the web app has.
export type BrandShade = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950;

export function brandColor(vars: Record<string, string>, shade: BrandShade): string {
  const channels = vars[`--brand-${shade}`] ?? vars["--brand-600"];
  return `rgb(${channels.trim().split(/\s+/).join(", ")})`;
}
