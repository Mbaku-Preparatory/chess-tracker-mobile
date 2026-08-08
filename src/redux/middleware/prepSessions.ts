import { api } from "@/lib/api";
import {
  DELETE_PREP_SESSION,
  DELETE_PREP_SESSION_PENDING,
  FETCH_PREP_SESSIONS,
  FETCH_PREP_SESSIONS_PENDING,
  UPDATE_PREP_SESSION,
  UPDATE_PREP_SESSION_PENDING,
} from "@/redux/actions/actionTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchPrepSessionsFromApi = async (action: any) => {
  try {
    action.payload = { items: await api.getPrepSessions() };
  } catch (err) {
    action.errors = err instanceof Error ? err.message : "Failed to load prep sessions";
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const updatePrepSessionViaApi = async (action: any) => {
  try {
    const { id, changes } = action.payload;
    action.payload = { item: await api.updatePrepSession(id, changes) };
  } catch (err) {
    action.errors = err instanceof Error ? err.message : "Failed to update prep session";
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deletePrepSessionViaApi = async (action: any) => {
  try {
    const { id } = action.payload;
    await api.deletePrepSession(id);
    action.payload = { id };
  } catch (err) {
    action.errors = err instanceof Error ? err.message : "Failed to delete prep session";
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prepSessionsMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_PREP_SESSIONS:
      storeAPI.dispatch({ type: FETCH_PREP_SESSIONS_PENDING });
      action = await fetchPrepSessionsFromApi(action);
      break;
    case UPDATE_PREP_SESSION:
      storeAPI.dispatch({ type: UPDATE_PREP_SESSION_PENDING });
      action = await updatePrepSessionViaApi(action);
      break;
    case DELETE_PREP_SESSION:
      storeAPI.dispatch({ type: DELETE_PREP_SESSION_PENDING });
      action = await deletePrepSessionViaApi(action);
      break;
  }
  return next(action);
};
