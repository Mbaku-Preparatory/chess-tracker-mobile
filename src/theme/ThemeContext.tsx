import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

import { useAppSelector } from "@/redux/hooks";
import { brandColor, getThemeVars, type BrandShade } from "@/lib/themes";
import { dark, gray, semantic } from "./colors";

export interface AppTheme {
  mode: "light" | "dark";
  brand: (shade: BrandShade) => string;
  bg: string;
  surface: string;
  card: string;
  border: string;
  elevated: string;
  muted: string;
  text: string;
  textMuted: string;
  textFaint: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  white: string;
  black: string;
}

function buildTheme(mode: "light" | "dark", vars: Record<string, string>): AppTheme {
  const isDark = mode === "dark";
  return {
    mode,
    brand: (shade: BrandShade) => brandColor(vars, shade),
    bg: isDark ? dark.bg : gray[50],
    surface: isDark ? dark.surface : "#ffffff",
    card: isDark ? dark.surface : "#ffffff",
    border: isDark ? dark.border : gray[200],
    elevated: isDark ? dark.elevated : gray[100],
    muted: isDark ? dark.muted : gray[200],
    text: isDark ? gray[100] : gray[900],
    textMuted: isDark ? gray[400] : gray[500],
    textFaint: isDark ? gray[500] : gray[400],
    danger: isDark ? semantic.redDark : semantic.red600,
    dangerBg: isDark ? "rgba(153,27,27,0.2)" : semantic.red50,
    dangerBorder: isDark ? "rgba(153,27,27,0.5)" : semantic.red200,
    success: isDark ? semantic.emeraldDark : semantic.emerald600,
    successBg: isDark ? "rgba(6,95,70,0.2)" : semantic.emerald50,
    warning: isDark ? semantic.amberDark : semantic.amber600,
    warningBg: isDark ? "rgba(120,53,15,0.2)" : semantic.amber50,
    white: "#ffffff",
    black: gray[800],
  };
}

const ThemeCtx = createContext<AppTheme>(buildTheme("light", getThemeVars("ocean")));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorScheme, customColor } = useAppSelector((s) => s.theme);
  // Follows the OS setting directly - there is no in-app override, so this
  // stays in sync automatically if the user changes it at the system level.
  const mode = useColorScheme() === "dark" ? "dark" : "light";
  const vars = useMemo(() => getThemeVars(colorScheme, customColor), [colorScheme, customColor]);
  const theme = useMemo(() => buildTheme(mode, vars), [mode, vars]);
  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export function useTheme(): AppTheme {
  return useContext(ThemeCtx);
}
