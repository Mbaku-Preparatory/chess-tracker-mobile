import type { PrepSession } from "@/types";
import {
  ADD_PREP_SESSION,
  DELETE_PREP_SESSION,
  FETCH_PREP_SESSIONS,
  REPLACE_PREP_SESSION,
  UPDATE_PREP_SESSION,
} from "./actionTypes";

export const fetchPrepSessions = () => ({
  type: FETCH_PREP_SESSIONS,
  payload: {},
  errors: null,
});

export const updatePrepSession = (
  id: number,
  changes: Partial<
    Pick<
      PrepSession,
      | "title"
      | "notes"
      | "scheduled_for"
      | "scheduled_time"
      | "duration_minutes"
      | "completed_at"
      | "reminder_sound_uri"
      | "reminder_sound_name"
    >
  >
) => ({
  type: UPDATE_PREP_SESSION,
  payload: { id, changes },
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

/** Replaces an already-loaded session in place - for screens that call the API directly (see SessionNewScreen's create flow) rather than going through the async updatePrepSession action. */
export const replacePrepSession = (session: PrepSession) => ({
  type: REPLACE_PREP_SESSION,
  payload: session,
});
