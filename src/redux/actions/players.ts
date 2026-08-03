import {
  FETCH_PLAYERS,
  SET_PLAYERS_ORDERING,
  SET_PLAYERS_PAGE,
  SET_PLAYERS_SEARCH,
} from "./actionTypes";

export type PlayerOrdering =
  | "-created_at"
  | "created_at"
  | "full_name"
  | "-standard_rating";

export const fetchPlayers = (payload: {
  search?: string;
  page?: number;
  ordering?: PlayerOrdering;
} = {}) => ({
  type: FETCH_PLAYERS,
  payload,
  errors: null,
});

export const setSearchQuery = (query: string) => ({
  type: SET_PLAYERS_SEARCH,
  payload: query,
});

export const setOrdering = (ordering: PlayerOrdering) => ({
  type: SET_PLAYERS_ORDERING,
  payload: ordering,
});

export const setCurrentPage = (page: number) => ({
  type: SET_PLAYERS_PAGE,
  payload: page,
});
