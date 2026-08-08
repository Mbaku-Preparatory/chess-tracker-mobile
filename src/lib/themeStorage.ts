import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ThemeId } from "@/lib/themes";

const SCHEME_KEY = "color_scheme";
const CUSTOM_COLOR_KEY = "custom_color";
const APPEARANCE_KEY = "appearance";

/** Light/dark preference. "system" defers to the OS, which is the default. */
export type Appearance = "system" | "light" | "dark";

const APPEARANCES: Appearance[] = ["system", "light", "dark"];

interface ThemeCache {
  colorScheme: ThemeId | null;
  customColor: string | null;
  appearance: Appearance;
}

const cache: ThemeCache = { colorScheme: null, customColor: null, appearance: "system" };

// Same synchronous-read-over-hydrated-cache pattern as lib/auth.ts.
export async function hydrateThemeStorage(): Promise<void> {
  const [colorScheme, customColor, appearance] = await Promise.all([
    AsyncStorage.getItem(SCHEME_KEY),
    AsyncStorage.getItem(CUSTOM_COLOR_KEY),
    AsyncStorage.getItem(APPEARANCE_KEY),
  ]);
  cache.colorScheme = (colorScheme as ThemeId) ?? null;
  cache.customColor = customColor;
  // Validated rather than cast: a stored value from an older build (or a hand-edited
  // key) would otherwise become an appearance the theme switch can't resolve.
  cache.appearance = APPEARANCES.includes(appearance as Appearance)
    ? (appearance as Appearance)
    : "system";
}

export const themeStorage = {
  getColorScheme(): ThemeId | null {
    return cache.colorScheme;
  },
  getCustomColor(): string | null {
    return cache.customColor;
  },
  getAppearance(): Appearance {
    return cache.appearance;
  },
  setAppearance(appearance: Appearance) {
    cache.appearance = appearance;
    void AsyncStorage.setItem(APPEARANCE_KEY, appearance);
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
