import type { Pairing } from "@/types";
import {
  CLEAR_TOURNAMENT_ERROR,
  CLOSE_TOURNAMENT,
  CREATE_TOURNAMENT,
  FETCH_ACTIVE_TOURNAMENT,
  UPSERT_PAIRING,
} from "./actionTypes";

export const fetchActiveTournament = () => ({
  type: FETCH_ACTIVE_TOURNAMENT,
  payload: {},
  errors: null,
});

export const createTournament = (payload: { name?: string; url?: string }) => ({
  type: CREATE_TOURNAMENT,
  payload,
  errors: null,
});

export const upsertPairing = (payload: {
  tournamentId: number;
  pairing: Pick<Pairing, "round_number" | "opponent_name" | "color" | "result">;
}) => ({
  type: UPSERT_PAIRING,
  payload,
  errors: null,
});

export const closeTournament = (tournamentId: number) => ({
  type: CLOSE_TOURNAMENT,
  payload: { tournamentId },
  errors: null,
});

export const clearTournamentError = () => ({ type: CLEAR_TOURNAMENT_ERROR });
