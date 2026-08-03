import type { ThemeId } from "@/lib/themes";
import { LOAD_THEME, SET_COLOR_SCHEME } from "./actionTypes";

export const loadThemeFromStorage = () => ({ type: LOAD_THEME });
export const setColorScheme = (payload: { id: ThemeId; customColor?: string }) => ({
  type: SET_COLOR_SCHEME,
  payload,
});
