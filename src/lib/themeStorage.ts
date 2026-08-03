import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeId } from "@/lib/themes";

const MODE_KEY = "theme";
const SCHEME_KEY = "color_scheme";
const CUSTOM_COLOR_KEY = "custom_color";

interface ThemeCache {
  mode: "light" | "dark" | null;
  colorScheme: ThemeId | null;
  customColor: string | null;
}

const cache: ThemeCache = { mode: null, colorScheme: null, customColor: null };

// Same synchronous-read-over-hydrated-cache pattern as lib/auth.ts.
export async function hydrateThemeStorage(): Promise<void> {
  const [mode, colorScheme, customColor] = await Promise.all([
    AsyncStorage.getItem(MODE_KEY),
    AsyncStorage.getItem(SCHEME_KEY),
    AsyncStorage.getItem(CUSTOM_COLOR_KEY),
  ]);
  cache.mode = mode === "dark" ? "dark" : mode === "light" ? "light" : null;
  cache.colorScheme = (colorScheme as ThemeId) ?? null;
  cache.customColor = customColor;
}

export const themeStorage = {
  getMode(): "light" | "dark" | null {
    return cache.mode;
  },
  setMode(mode: "light" | "dark") {
    cache.mode = mode;
    void AsyncStorage.setItem(MODE_KEY, mode);
  },
  getColorScheme(): ThemeId | null {
    return cache.colorScheme;
  },
  getCustomColor(): string | null {
    return cache.customColor;
  },
  setColorScheme(id: ThemeId, customColor?: string) {
    cache.colorScheme = id;
    void AsyncStorage.setItem(SCHEME_KEY, id);
    if (customColor) {
      cache.customColor = customColor;
      void AsyncStorage.setItem(CUSTOM_COLOR_KEY, customColor);
    }
  },
};
