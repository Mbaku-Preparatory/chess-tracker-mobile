import type { PrepSession } from "@/types";
import {
  ADD_PREP_SESSION,
  DELETE_PREP_SESSION,
  FETCH_PREP_SESSIONS,
  UPDATE_PREP_SESSION,
} from "./actionTypes";

export const fetchPrepSessions = () => ({
  type: FETCH_PREP_SESSIONS,
  payload: {},
  errors: null,
});

export const updatePrepSession = (id: number, completed: boolean) => ({
  type: UPDATE_PREP_SESSION,
  payload: { id, completed },
  errors: null,
});

export const deletePrepSession = (id: number) => ({
  type: DELETE_PREP_SESSION,
  payload: { id },
  errors: null,
});

export const addPrepSession = (session: PrepSession) => ({
  type: ADD_PREP_SESSION,
  payload: session,
});
