// Static design tokens ported from tailwind.config.ts / globals.css.
// Brand (accent) colors are theme-able at runtime — see ThemeContext.tsx —
// everything here is the fixed part of the palette.

export const gray = {
  50: "#f9fafb",
  100: "#f3f4f6",
  200: "#e5e7eb",
  300: "#d1d5db",
  400: "#9ca3af",
  500: "#6b7280",
  600: "#4b5563",
  700: "#374151",
  800: "#1f2937",
  900: "#111827",
} as const;

export const dark = {
  bg: "#0b0b0f",
  surface: "#14141c",
  elevated: "#1d1d28",
  border: "#2c2c3e",
  muted: "#35354a",
} as const;

export const semantic = {
  emerald50: "#ecfdf5",
  emerald500: "#10b981",
  emerald600: "#059669",
  emerald700: "#047857",
  emeraldDark: "#34d399",
  red50: "#fef2f2",
  red200: "#fecaca",
  red500: "#ef4444",
  red600: "#dc2626",
  red700: "#b91c1c",
  redDark: "#f87171",
  amber50: "#fffbeb",
  amber100: "#fef3c7",
  amber500: "#f59e0b",
  amber600: "#d97706",
  amber700: "#b45309",
  amber800: "#92400e",
  amberDark: "#fbbf24",
  sky50: "#f0f9ff",
  sky700: "#0369a1",
  sky800: "#075985",
} as const;
