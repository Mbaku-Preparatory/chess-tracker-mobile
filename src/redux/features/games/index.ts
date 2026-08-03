import type { Game, GamesFilter } from "@/types";
import {
  FETCH_GAMES,
  FETCH_GAMES_PENDING,
  RESET_GAMES_FILTERS,
  SET_GAMES_FILTERS,
} from "@/redux/actions/actionTypes";

interface GamesState {
  items: Game[];
  total: number;
  loading: boolean;
  error: string | null;
  filters: GamesFilter;
}

const defaultFilters: GamesFilter = {
  color_played: "",
  result: "",
  eco_code: "",
  search: "",
  page: 1,
};

const initialState: GamesState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  filters: defaultFilters,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const gamesReducer = (state = initialState, action: any): GamesState => {
  switch (action.type) {
    case FETCH_GAMES_PENDING:
      return { ...state, loading: true, error: null };

    case FETCH_GAMES:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors) };
      }
      return {
        ...state,
        loading: false,
        items: action.payload.items ?? [],
        total: action.payload.total ?? 0,
      };

    case SET_GAMES_FILTERS:
      return { ...state, filters: { ...state.filters, ...action.payload } };

    case RESET_GAMES_FILTERS:
      return { ...state, filters: defaultFilters };

    default:
      return state;
  }
};

export default gamesReducer;
