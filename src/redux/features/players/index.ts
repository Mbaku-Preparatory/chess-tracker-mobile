import type { Player } from "@/types";
import {
  FETCH_PLAYERS,
  FETCH_PLAYERS_PENDING,
  SET_PLAYERS_ORDERING,
  SET_PLAYERS_PAGE,
  SET_PLAYERS_SEARCH,
} from "@/redux/actions/actionTypes";
import type { PlayerOrdering } from "@/redux/actions/players";

interface PlayersState {
  items: Player[];
  total: number;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  ordering: PlayerOrdering;
  currentPage: number;
}

const initialState: PlayersState = {
  items: [],
  total: 0,
  loading: false,
  error: null,
  searchQuery: "",
  ordering: "-created_at",
  currentPage: 1,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playersReducer = (state = initialState, action: any): PlayersState => {
  switch (action.type) {
    case FETCH_PLAYERS_PENDING:
      return { ...state, loading: true, error: null };

    case FETCH_PLAYERS:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors) };
      }
      return {
        ...state,
        loading: false,
        items: action.payload.items ?? [],
        total: action.payload.total ?? 0,
      };

    case SET_PLAYERS_SEARCH:
      return { ...state, searchQuery: action.payload, currentPage: 1 };

    case SET_PLAYERS_ORDERING:
      return { ...state, ordering: action.payload, currentPage: 1 };

    case SET_PLAYERS_PAGE:
      return { ...state, currentPage: action.payload };

    default:
      return state;
  }
};

export default playersReducer;
