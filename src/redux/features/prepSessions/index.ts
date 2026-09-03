import type { PrepSession } from "@/types";
import {
  ADD_PREP_SESSION,
  DELETE_PREP_SESSION,
  FETCH_PREP_SESSIONS,
  FETCH_PREP_SESSIONS_PENDING,
  REPLACE_PREP_SESSION,
  UPDATE_PREP_SESSION,
} from "@/redux/actions/actionTypes";

interface PrepSessionsState {
  items: PrepSession[];
  loading: boolean;
  error: string | null;
}

const initialState: PrepSessionsState = {
  items: [],
  loading: false,
  error: null,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prepSessionsReducer = (state = initialState, action: any): PrepSessionsState => {
  switch (action.type) {
    case FETCH_PREP_SESSIONS_PENDING:
      return { ...state, loading: true, error: null };

    case FETCH_PREP_SESSIONS:
      if (action.errors) {
        return { ...state, loading: false, error: String(action.errors) };
      }
      return { ...state, loading: false, items: action.payload.items ?? [] };

    case UPDATE_PREP_SESSION:
      if (action.errors || !action.payload?.item) {
        return state;
      }
      return {
        ...state,
        items: state.items.map((item) =>
          item.public_id === action.payload.item.public_id ? action.payload.item : item
        ),
      };

    case DELETE_PREP_SESSION:
      if (action.errors) {
        return state;
      }
      return { ...state, items: state.items.filter((item) => item.public_id !== action.payload.publicId) };

    case ADD_PREP_SESSION:
      return { ...state, items: [action.payload, ...state.items] };

    case REPLACE_PREP_SESSION:
      return {
        ...state,
        items: state.items.map((item) =>
          item.public_id === action.payload.public_id ? action.payload : item
        ),
      };

    default:
      return state;
  }
};

export default prepSessionsReducer;
