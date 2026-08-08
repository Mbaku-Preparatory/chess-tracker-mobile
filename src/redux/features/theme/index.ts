import type { ThemeId } from "@/lib/themes";
import { themeStorage, type Appearance } from "@/lib/themeStorage";
import { LOAD_THEME, SET_APPEARANCE, SET_COLOR_SCHEME } from "@/redux/actions/actionTypes";

interface ThemeState {
  colorScheme: ThemeId;
  customColor: string | null;
  appearance: Appearance;
}

const initialState: ThemeState = {
  colorScheme: "ocean",
  customColor: null,
  appearance: "system",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME: {
      return {
        colorScheme: themeStorage.getColorScheme() ?? "ocean",
        customColor: themeStorage.getCustomColor(),
        appearance: themeStorage.getAppearance(),
      };
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
    case SET_APPEARANCE: {
      const appearance = action.payload as Appearance;
      themeStorage.setAppearance(appearance);
      return { ...state, appearance };
    }
    default:
      return state;
  }
};

export default themeReducer;
