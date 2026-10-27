import {
  CLEAR_AUTH,
  LOAD_AUTH,
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
