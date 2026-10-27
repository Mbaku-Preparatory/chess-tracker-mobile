import { authStorage } from "@/lib/auth";
import {
  CLEAR_AUTH,
  LOAD_AUTH,
  SET_AUTH,
  SET_PROFILE_PIC,
} from "@/redux/actions/actionTypes";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  profilePic: string | null;
  initialized: boolean;
}

const initialState: AuthState = {
  token: null,
  refreshToken: null,
  email: null,
  profilePic: null,
  initialized: false,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authReducer = (state = initialState, action: any): AuthState => {
  switch (action.type) {
    case LOAD_AUTH:
      return {
        ...state,
        token: authStorage.getToken(),
        refreshToken: authStorage.getRefreshToken(),
        email: authStorage.getEmail(),
        profilePic: authStorage.getProfilePic(),
        initialized: true,
      };

    case SET_AUTH:
      authStorage.setToken(action.payload.token);
      if (action.payload.refreshToken) authStorage.setRefreshToken(action.payload.refreshToken);
      authStorage.setEmail(action.payload.email);
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken ?? state.refreshToken,
        email: action.payload.email,
        initialized: true,
      };

    case SET_PROFILE_PIC:
      authStorage.setProfilePic(action.payload);
      return { ...state, profilePic: action.payload };

    case CLEAR_AUTH:
      authStorage.clear();
      return { ...initialState, initialized: true };

    default:
      return state;
  }
};

export default authReducer;
