import type { Pairing, Tournament } from "@/types";
import {
  CLEAR_TOURNAMENT_ERROR,
  CLOSE_TOURNAMENT,
  CREATE_TOURNAMENT,
  CREATE_TOURNAMENT_PENDING,
  FETCH_ACTIVE_TOURNAMENT,
  FETCH_ACTIVE_TOURNAMENT_PENDING,
  UPSERT_PAIRING,
} from "@/redux/actions/actionTypes";

interface TournamentState {
  active: Tournament | null;
  loading: boolean;
  error: string | null;
  initialized: boolean;
}

const initialState: TournamentState = {
  active: null,
  loading: false,
  error: null,
  initialized: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tournamentReducer = (state = initialState, action: any): TournamentState => {
  switch (action.type) {
    case FETCH_ACTIVE_TOURNAMENT_PENDING:
      return { ...state, loading: true, error: null };

    case FETCH_ACTIVE_TOURNAMENT:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors), initialized: true };
      }
      return {
        ...state,
        loading: false,
        active: action.payload.tournament,
        initialized: true,
      };

    case CREATE_TOURNAMENT_PENDING:
      return { ...state, loading: true, error: null };

    case CREATE_TOURNAMENT:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors) };
      }
      return { ...state, loading: false, active: action.payload.tournament };

    case UPSERT_PAIRING: {
      if (!state.active || action.errors) return state;
      const pairing = action.payload.pairing as Pairing;
      const idx = state.active.pairings.findIndex(
        (p) => p.round_number === pairing.round_number
      );
      const pairings =
        idx >= 0
          ? state.active.pairings.map((p, i) => (i === idx ? pairing : p))
          : [...state.active.pairings, pairing].sort(
              (a, b) => a.round_number - b.round_number
            );
      return { ...state, active: { ...state.active, pairings } };
    }

    case CLOSE_TOURNAMENT:
      return { ...state, active: null };

    case CLEAR_TOURNAMENT_ERROR:
      return { ...state, error: null };

    default:
      return state;
  }
};

export default tournamentReducer;
