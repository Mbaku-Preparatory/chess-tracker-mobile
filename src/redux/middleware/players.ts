import graphqlClient from "@/api/graphqlClient";
import { GetPlayersQuery } from "@/api/graphql/queries/players";
import { FETCH_PLAYERS, FETCH_PLAYERS_PENDING } from "@/redux/actions/actionTypes";
import { userMessage } from "@/lib/apiError";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchPlayersFromGraphQL = async (action: any) => {
  try {
    const { search = "", page = 1, ordering = "-created_at" } = action.payload ?? {};
    const query = GetPlayersQuery(search, page, ordering);
    const result = await graphqlClient({ data: { query } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Failed to fetch players";
    } else {
      const data = result.data.data.players;
      action.payload = {
        ...action.payload,
        items: (data.results ?? []).map((p: Record<string, unknown>) => {
          const sc = p.gameSourceCounts as Record<string, number> | null;
          return {
            id: p.id,
            public_id: p.publicId,
            full_name: p.fullName,
            slug: p.slug,
            title: p.title,
            standard_rating: p.standardRating,
            rapid_rating: p.rapidRating,
            blitz_rating: p.blitzRating,
            fide_id: p.fideId,
            chesscom_username: p.chesscomUsername,
            lichess_username: p.lichessUsername,
            federation: p.federation,
            profile_image: p.profileImage,
            created_at: p.createdAt,
            game_source_counts: sc
              ? { chess_results: sc.chessResults, chess_com: sc.chessCom, lichess: sc.lichess }
              : null,
          };
        }),
        total: data.count ?? 0,
      };
    }
  } catch (err) {
    action.errors = userMessage(err, "Failed to fetch players");
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const playersMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_PLAYERS:
      storeAPI.dispatch({ type: FETCH_PLAYERS_PENDING });
      action = await fetchPlayersFromGraphQL(action);
      break;
  }
  return next(action);
};
