import AsyncStorage from "@react-native-async-storage/async-storage";

const APPEARANCE_KEY = "appearance";

/** Light/dark preference. "system" defers to the OS, which is the default. */
export type Appearance = "system" | "light" | "dark";

const APPEARANCES: Appearance[] = ["system", "light", "dark"];

// The colour-scheme and custom-colour keys are no longer read. They are left in
// AsyncStorage rather than migrated away: they cost nothing, and deleting a
// user's stored preference is not worth a migration for a feature that may
// come back in another form.
const cache: { appearance: Appearance } = { appearance: "system" };

// Same synchronous-read-over-hydrated-cache pattern as lib/auth.ts.
export async function hydrateThemeStorage(): Promise<void> {
  const appearance = await AsyncStorage.getItem(APPEARANCE_KEY);
  // Validated rather than cast: a stored value from an older build (or a
  // hand-edited key) would otherwise become an appearance the switch cannot
  // resolve.
  cache.appearance = APPEARANCES.includes(appearance as Appearance)
    ? (appearance as Appearance)
    : "system";
}

export const themeStorage = {
  getAppearance(): Appearance {
    return cache.appearance;
  },
  setAppearance(appearance: Appearance) {
    cache.appearance = appearance;
    void AsyncStorage.setItem(APPEARANCE_KEY, appearance);
  },
};
