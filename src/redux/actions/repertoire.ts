import {
  ADD_OPENING,
  COMPLETE_ONBOARDING,
  FETCH_REPERTOIRE,
  REMOVE_OPENING,
  RESET_REPERTOIRE,
  SAVE_REPERTOIRE,
  SET_REPERTOIRE_INITIALIZED,
} from "./actionTypes";

export interface RepertoireOpening {
  slug: string;
  name: string;
  eco_code: string;
  family: string;
  variation: string;
  pgn: string;
  uci: string;
  epd: string;
}

export type RepertoireSection = "white" | "black";

export const fetchRepertoire = () => ({
  type: FETCH_REPERTOIRE,
  payload: {},
  errors: null,
});

export const saveRepertoire = () => ({
  type: SAVE_REPERTOIRE,
  payload: {},
  errors: null,
});

export const addOpening = (payload: {
  section: RepertoireSection;
  opening: RepertoireOpening;
}) => ({
  type: ADD_OPENING,
  payload,
});

export const removeOpening = (payload: {
  section: RepertoireSection;
  slug: string;
}) => ({
  type: REMOVE_OPENING,
  payload,
});

export const completeOnboarding = () => ({ type: COMPLETE_ONBOARDING });

export const resetRepertoire = () => ({ type: RESET_REPERTOIRE });

export const setInitialized = () => ({ type: SET_REPERTOIRE_INITIALIZED });
