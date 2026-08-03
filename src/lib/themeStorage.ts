import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeId } from "@/lib/themes";

const SCHEME_KEY = "color_scheme";
const CUSTOM_COLOR_KEY = "custom_color";

interface ThemeCache {
  colorScheme: ThemeId | null;
  customColor: string | null;
}

const cache: ThemeCache = { colorScheme: null, customColor: null };

// Same synchronous-read-over-hydrated-cache pattern as lib/auth.ts.
export async function hydrateThemeStorage(): Promise<void> {
  const [colorScheme, customColor] = await Promise.all([
    AsyncStorage.getItem(SCHEME_KEY),
    AsyncStorage.getItem(CUSTOM_COLOR_KEY),
  ]);
  cache.colorScheme = (colorScheme as ThemeId) ?? null;
  cache.customColor = customColor;
}

export const themeStorage = {
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
