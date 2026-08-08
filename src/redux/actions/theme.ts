import type { ThemeId } from "@/lib/themes";
import type { Appearance } from "@/lib/themeStorage";
import { LOAD_THEME, SET_APPEARANCE, SET_COLOR_SCHEME } from "./actionTypes";

export const loadThemeFromStorage = () => ({ type: LOAD_THEME });
export const setColorScheme = (payload: { id: ThemeId; customColor?: string }) => ({
  type: SET_COLOR_SCHEME,
  payload,
});
export const setAppearance = (appearance: Appearance) => ({
  type: SET_APPEARANCE,
  payload: appearance,
});
