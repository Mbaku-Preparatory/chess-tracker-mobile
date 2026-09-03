import type { Appearance } from "@/lib/themeStorage";
import { LOAD_THEME, SET_APPEARANCE } from "./actionTypes";

export const loadThemeFromStorage = () => ({ type: LOAD_THEME });
export const setAppearance = (appearance: Appearance) => ({
  type: SET_APPEARANCE,
  payload: appearance,
});
