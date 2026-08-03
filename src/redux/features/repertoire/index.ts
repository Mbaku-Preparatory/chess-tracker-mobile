import {
  ADD_OPENING,
  COMPLETE_ONBOARDING,
  FETCH_REPERTOIRE,
  FETCH_REPERTOIRE_PENDING,
  REMOVE_OPENING,
  RESET_REPERTOIRE,
  SAVE_REPERTOIRE,
  SAVE_REPERTOIRE_PENDING,
  SET_REPERTOIRE_INITIALIZED,
} from "@/redux/actions/actionTypes";
import type { RepertoireOpening, RepertoireSection } from "@/redux/actions/repertoire";

interface RepertoireState {
  white: RepertoireOpening[];
  black: RepertoireOpening[];
  onboardingComplete: boolean;
  initialized: boolean;
  saving: boolean;
}

const initialState: RepertoireState = {
  white: [],
  black: [],
  onboardingComplete: false,
  initialized: false,
  saving: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const repertoireReducer = (state = initialState, action: any): RepertoireState => {
  switch (action.type) {
    case FETCH_REPERTOIRE_PENDING:
      return state;

    case FETCH_REPERTOIRE:
      if (action.errors) return { ...state, initialized: true };
      return {
        ...state,
        white: action.payload.white ?? [],
        black: action.payload.black ?? [],
        onboardingComplete: action.payload.onboardingComplete ?? false,
        initialized: true,
      };

    case SAVE_REPERTOIRE_PENDING:
      return { ...state, saving: true };

    case SAVE_REPERTOIRE:
      return { ...state, saving: false };

    case ADD_OPENING: {
      const { section, opening } = action.payload as {
        section: RepertoireSection;
        opening: RepertoireOpening;
      };
      if (state[section].some((o) => o.slug === opening.slug)) return state;
      return { ...state, [section]: [...state[section], opening] };
    }

    case REMOVE_OPENING: {
      const { section, slug } = action.payload as {
        section: RepertoireSection;
        slug: string;
      };
      return { ...state, [section]: state[section].filter((o) => o.slug !== slug) };
    }

    case COMPLETE_ONBOARDING:
      return { ...state, onboardingComplete: true };

    case RESET_REPERTOIRE:
      return { ...state, white: [], black: [], onboardingComplete: false };

    case SET_REPERTOIRE_INITIALIZED:
      return { ...state, initialized: true };

    default:
      return state;
  }
};

export default repertoireReducer;
