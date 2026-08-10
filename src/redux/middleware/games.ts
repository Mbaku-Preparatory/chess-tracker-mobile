import graphqlClient from "@/api/graphqlClient";
import { GetPlayerGamesQuery } from "@/api/graphql/queries/games";
import { FETCH_GAMES, FETCH_GAMES_PENDING } from "@/redux/actions/actionTypes";
import { userMessage } from "@/lib/apiError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchGamesFromGraphQL = async (action: any) => {
  try {
    const { slug, filters = {} } = action.payload;
    const query = GetPlayerGamesQuery(
      slug,
      filters.color_played,
      filters.result,
      filters.eco_code,
      filters.page
    );
    const result = await graphqlClient({ data: { query } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Failed to fetch games";
    } else {
      const data = result.data.data.playerGames;
      action.payload = {
        ...action.payload,
        items: (data.results ?? []).map((g: Record<string, unknown>) => ({
          id: g.id,
          event: g.event,
          opponent_name: g.opponentName,
          opponent_rating: g.opponentRating,
          color_played: g.colorPlayed,
          result: g.result,
          eco_code: g.ecoCode,
          opening_name: g.openingName,
          date_played: g.datePlayed,
          num_moves: g.numMoves,
          source: g.source,
          source_url: g.sourceUrl,
        })),
        total: data.count ?? 0,
      };
    }
  } catch (err) {
    action.errors = userMessage(err, "Failed to fetch games");
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const gamesMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_GAMES:
      storeAPI.dispatch({ type: FETCH_GAMES_PENDING });
      action = await fetchGamesFromGraphQL(action);
      break;
  }
  return next(action);
};
