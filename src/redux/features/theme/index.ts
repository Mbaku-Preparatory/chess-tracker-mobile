import type { ThemeId } from "@/lib/themes";
import { themeStorage } from "@/lib/themeStorage";
import { LOAD_THEME, SET_COLOR_SCHEME, TOGGLE_THEME } from "@/redux/actions/actionTypes";

type ThemeMode = "light" | "dark";

interface ThemeState {
  mode: ThemeMode;
  colorScheme: ThemeId;
  customColor: string | null;
}

const initialState: ThemeState = {
  mode: "light",
  colorScheme: "ocean",
  customColor: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME: {
      return {
        mode: themeStorage.getMode() === "dark" ? "dark" : "light",
        colorScheme: themeStorage.getColorScheme() ?? "ocean",
        customColor: themeStorage.getCustomColor(),
      };
    }
    case TOGGLE_THEME: {
      const mode: ThemeMode = state.mode === "light" ? "dark" : "light";
      themeStorage.setMode(mode);
      return { ...state, mode };
    }
    case SET_COLOR_SCHEME: {
      const { id, customColor } = action.payload as { id: ThemeId; customColor?: string };
      themeStorage.setColorScheme(id, customColor);
      return {
        ...state,
        colorScheme: id,
        customColor: customColor ?? (id === "custom" ? state.customColor : null),
      };
    }
    default:
      return state;
  }
};

export default themeReducer;
