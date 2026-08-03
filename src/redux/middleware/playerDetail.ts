import graphqlClient from "@/api/graphqlClient";
import { GetPlayerQuery } from "@/api/graphql/queries/players";
import { FETCH_PLAYER_DETAIL, FETCH_PLAYER_DETAIL_PENDING } from "@/redux/actions/actionTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mapGame = (g: Record<string, unknown>) => ({
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
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fetchPlayerDetailFromGraphQL = async (action: any) => {
  try {
    const { slug } = action.payload;
    const query = GetPlayerQuery(slug);
    const result = await graphqlClient({ data: { query } });
    if (result.data.errors) {
      action.errors = result.data.errors[0]?.message ?? "Failed to fetch player";
    } else {
      const p = result.data.data.player;
      if (!p) {
        action.errors = "Player not found";
      } else {
        const ps = p.performanceSummary;
        action.payload = {
          ...action.payload,
          player: {
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
            bio: p.bio,
            birth_year: p.birthYear,
            profile_image: p.profileImage,
            created_at: p.createdAt,
            performance_summary: ps ? {
              total_games: ps.totalGames,
              wins: ps.wins,
              draws: ps.draws,
              losses: ps.losses,
              win_rate: ps.winRate,
              white_games: ps.whiteGames,
              white_score: ps.whiteScore,
              black_games: ps.blackGames,
              black_score: ps.blackScore,
              summary_text: ps.summaryText,
            } : null,
            opening_stats: (p.openingStats ?? []).map((o: Record<string, unknown>) => ({
              eco_code: o.ecoCode,
              opening_name: o.openingName,
              color_choice: o.colorChoice,
              games_count: o.gamesCount,
              score_percent: o.scorePercent,
            })),
            strengths: (p.strengths ?? []).map((s: Record<string, unknown>) => ({
              title: s.title,
              description: s.description,
              order: s.order,
            })),
            weaknesses: (p.weaknesses ?? []).map((w: Record<string, unknown>) => ({
              title: w.title,
              description: w.description,
              order: w.order,
            })),
            recent_games: (p.recentGames ?? []).map(mapGame),
            game_source_counts: p.gameSourceCounts ? {
              chess_results: p.gameSourceCounts.chessResults,
              chess_com: p.gameSourceCounts.chessCom,
              lichess: p.gameSourceCounts.lichess,
            } : null,
          },
        };
      }
    }
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    console.error("[playerDetail] fetch failed", {
      message: e?.message,
      code: e?.code,
      status: e?.response?.status,
      url: e?.config?.url,
    });
    action.errors = err instanceof Error ? err.message : "Failed to fetch player";
  }
  return action;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const playerDetailMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_PLAYER_DETAIL:
      storeAPI.dispatch({ type: FETCH_PLAYER_DETAIL_PENDING });
      action = await fetchPlayerDetailFromGraphQL(action);
      break;
  }
  return next(action);
};
