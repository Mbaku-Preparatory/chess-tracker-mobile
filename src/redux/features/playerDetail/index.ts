import type { PlayerDetail } from "@/types";
import {
  CLEAR_PLAYER_DETAIL,
  FETCH_PLAYER_DETAIL,
  FETCH_PLAYER_DETAIL_PENDING,
} from "@/redux/actions/actionTypes";

interface PlayerDetailState {
  player: PlayerDetail | null;
  loading: boolean;
  error: string | null;
}

const initialState: PlayerDetailState = {
  player: null,
  loading: false,
  error: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const playerDetailReducer = (state = initialState, action: any): PlayerDetailState => {
  switch (action.type) {
    case FETCH_PLAYER_DETAIL_PENDING:
      return { ...state, loading: true, error: null };

    case FETCH_PLAYER_DETAIL:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors) };
      }
      return { ...state, loading: false, player: action.payload.player };

    case CLEAR_PLAYER_DETAIL:
      return { ...state, player: null, error: null };

    default:
      return state;
  }
};

export default playerDetailReducer;
