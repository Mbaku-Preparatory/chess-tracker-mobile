import type { ThemeId } from "@/lib/themes";
import { LOAD_THEME, SET_COLOR_SCHEME, TOGGLE_THEME } from "./actionTypes";

export const loadThemeFromStorage = () => ({ type: LOAD_THEME });
export const toggleTheme = () => ({ type: TOGGLE_THEME });
export const setColorScheme = (payload: { id: ThemeId; customColor?: string }) => ({
  type: SET_COLOR_SCHEME,
  payload,
});
