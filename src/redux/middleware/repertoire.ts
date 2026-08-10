import graphqlClient from "@/api/graphqlClient";
import { GetRepertoireQuery, SaveRepertoireMutation } from "@/api/graphql/queries/repertoire";
import {
  FETCH_REPERTOIRE,
  FETCH_REPERTOIRE_PENDING,
  SAVE_REPERTOIRE,
  SAVE_REPERTOIRE_PENDING,
} from "@/redux/actions/actionTypes";
import { userMessage } from "@/lib/apiError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseOpening = (o: Record<string, unknown>) => ({
  slug: o.slug,
  name: o.name,
  eco_code: o.ecoCode,
  family: o.family,
  variation: o.variation,
  pgn: o.pgn,
  uci: o.uci,
  epd: o.epd,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchRepertoireFromGraphQL = async (action: any) => {
  try {
    const result = await graphqlClient({ data: { query: GetRepertoireQuery() } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Failed to fetch repertoire";
    } else {
      const data = result.data.data.repertoire;
      action.payload = {
        white: (data.white ?? []).map(parseOpening),
        black: (data.black ?? []).map(parseOpening),
        onboardingComplete: data.onboardingComplete ?? false,
      };
    }
  } catch (err) {
    action.errors = userMessage(err, "Failed to fetch repertoire");
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const saveRepertoireToGraphQL = async (action: any, storeAPI: any) => {
  try {
    const { white, black, onboardingComplete } = storeAPI.getState().repertoire;
    const query = SaveRepertoireMutation(white, black, onboardingComplete);
    const result = await graphqlClient({ data: { query } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Failed to save repertoire";
    }
  } catch (err) {
    action.errors = userMessage(err, "Failed to save repertoire");
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const repertoireMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_REPERTOIRE:
      storeAPI.dispatch({ type: FETCH_REPERTOIRE_PENDING });
      action = await fetchRepertoireFromGraphQL(action);
      break;
    case SAVE_REPERTOIRE:
      storeAPI.dispatch({ type: SAVE_REPERTOIRE_PENDING });
      action = await saveRepertoireToGraphQL(action, storeAPI);
      break;
  }
  return next(action);
};
