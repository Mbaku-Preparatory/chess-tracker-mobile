import graphqlClient from "@/api/graphqlClient";
import {
  CreateTournamentMutation,
  GetActiveTournamentQuery,
  UpdateTournamentMutation,
  UpsertPairingMutation,
} from "@/api/graphql/queries/tournament";
import {
  CLOSE_TOURNAMENT,
  CREATE_TOURNAMENT,
  CREATE_TOURNAMENT_PENDING,
  FETCH_ACTIVE_TOURNAMENT,
  FETCH_ACTIVE_TOURNAMENT_PENDING,
  UPSERT_PAIRING,
} from "@/redux/actions/actionTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseTournament = (t: Record<string, unknown>) => ({
  id: t.id,
  name: t.name,
  url: t.url,
  is_active: t.isActive,
  created_at: t.createdAt,
  pairings: ((t.pairings as Record<string, unknown>[]) ?? []).map((p) => ({
    id: p.id,
    round_number: p.roundNumber,
    opponent_name: p.opponentName,
    color: p.color,
    result: p.result,
  })),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tournamentMiddleware = (storeAPI: any) => (next: any) => async (action: any) => {
  switch (action.type) {
    case FETCH_ACTIVE_TOURNAMENT: {
      storeAPI.dispatch({ type: FETCH_ACTIVE_TOURNAMENT_PENDING });
      try {
        const result = await graphqlClient({ data: { query: GetActiveTournamentQuery() } });
        if (result.data.errors) {
          action.errors = result.data.errors[0]?.message ?? "Failed to fetch tournament";
        } else {
          const t = result.data.data.activeTournament;
          action.payload = { tournament: t ? parseTournament(t) : null };
        }
      } catch (err) {
        action.errors = err instanceof Error ? err.message : "Failed to fetch tournament";
      }
      break;
    }

    case CREATE_TOURNAMENT: {
      storeAPI.dispatch({ type: CREATE_TOURNAMENT_PENDING });
      try {
        const { name = "", url = "" } = action.payload;
        const result = await graphqlClient({
          data: { query: CreateTournamentMutation(name, url) },
        });
        if (result.data.errors) {
          action.errors = result.data.errors[0]?.message ?? "Failed to create tournament";
        } else {
          action.payload = { tournament: parseTournament(result.data.data.createTournament) };
        }
      } catch (err) {
        action.errors = err instanceof Error ? err.message : "Failed to create tournament";
      }
      break;
    }

    case UPSERT_PAIRING: {
      try {
        const { tournamentId, pairing } = action.payload;
        const result = await graphqlClient({
          data: {
            query: UpsertPairingMutation(
              tournamentId,
              pairing.round_number,
              pairing.opponent_name,
              pairing.color,
              pairing.result
            ),
          },
        });
        if (result.data.errors) {
          action.errors = result.data.errors[0]?.message ?? "Failed to upsert pairing";
        } else {
          const p = result.data.data.upsertPairing;
          action.payload = {
            pairing: {
              id: p.id,
              round_number: p.roundNumber,
              opponent_name: p.opponentName,
              color: p.color,
              result: p.result,
            },
          };
        }
      } catch (err) {
        action.errors = err instanceof Error ? err.message : "Failed to upsert pairing";
      }
      break;
    }

    case CLOSE_TOURNAMENT: {
      try {
        const { tournamentId } = action.payload;
        await graphqlClient({
          data: { query: UpdateTournamentMutation(tournamentId, false) },
        });
      } catch (err) {
        action.errors = err instanceof Error ? err.message : "Failed to close tournament";
      }
      break;
    }
  }
  return next(action);
};
