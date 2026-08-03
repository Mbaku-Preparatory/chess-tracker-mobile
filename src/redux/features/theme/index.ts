import type { ThemeId } from "@/lib/themes";
import { themeStorage } from "@/lib/themeStorage";
import { LOAD_THEME, SET_COLOR_SCHEME } from "@/redux/actions/actionTypes";

interface ThemeState {
  colorScheme: ThemeId;
  customColor: string | null;
}

const initialState: ThemeState = {
  colorScheme: "ocean",
  customColor: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME: {
      return {
        colorScheme: themeStorage.getColorScheme() ?? "ocean",
        customColor: themeStorage.getCustomColor(),
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
    default:
      return state;
  }
};

export default themeReducer;
