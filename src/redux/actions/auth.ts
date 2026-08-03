import {
  CLEAR_AUTH,
  LOAD_AUTH,
  LOGIN,
  REGISTER,
  SET_AUTH,
  SET_PROFILE_PIC,
} from "./actionTypes";

export const loadAuthFromStorage = () => ({ type: LOAD_AUTH });

export const setAuth = (payload: { token: string; refreshToken?: string; email: string }) => ({
  type: SET_AUTH,
  payload,
});

export const setProfilePic = (pic: string) => ({
  type: SET_PROFILE_PIC,
  payload: pic,
});

export const clearAuth = () => ({ type: CLEAR_AUTH });

export const login = (payload: { email: string; password: string }) => ({
  type: LOGIN,
  payload,
  errors: null,
});

export const register = (payload: { email: string; password: string }) => ({
  type: REGISTER,
  payload,
  errors: null,
});
