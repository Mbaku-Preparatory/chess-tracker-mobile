import { FETCH_PLAYER_DETAIL } from "./actionTypes";

export const fetchPlayerDetail = (slug: string) => ({
  type: FETCH_PLAYER_DETAIL,
  payload: { slug },
  errors: null,
});
