import { themeStorage, type Appearance } from "@/lib/themeStorage";
import { LOAD_THEME, SET_APPEARANCE } from "@/redux/actions/actionTypes";

interface ThemeState {
  appearance: Appearance;
}

const initialState: ThemeState = { appearance: "system" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const themeReducer = (state = initialState, action: any): ThemeState => {
  switch (action.type) {
    case LOAD_THEME:
      return { appearance: themeStorage.getAppearance() };
    case SET_APPEARANCE: {
      const appearance = action.payload as Appearance;
      themeStorage.setAppearance(appearance);
      return { appearance };
    }
    default:
      return state;
  }
};

export default themeReducer;
