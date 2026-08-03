import { api } from "@/lib/api";
import type { TournamentPlayer } from "@/types";

/**
 * Find or create a player profile for a tournament opponent, then return
 * their slug so the caller can navigate to the prep page.
 *
 * Matching is exact (case-insensitive) on full_name.  On creation the player
 * is seeded with whatever data we scraped from chess-results (fide_id,
 * federation).  If a fide_id is provided the backend will auto-sync the FIDE
 * profile, pulling in ratings, title, birth year.
 */
export async function prepareOpponent(
  opponent: Pick<TournamentPlayer, "name" | "fide_id" | "federation">
): Promise<string> {
  const { results } = await api.getPlayers(opponent.name);
  const match = results.find(
    (p) => p.full_name.toLowerCase() === opponent.name.toLowerCase()
  );

  if (match) return match.slug;

  const created = await api.createPlayer({
    full_name: opponent.name,
    ...(opponent.fide_id ? { fide_id: opponent.fide_id } : {}),
    ...(opponent.federation ? { federation: opponent.federation } : {}),
  });

  return created.slug;
}


export function getPreparedPlayerImportHref(slug: string): string {
  return `/players/${slug}/import?source=chess_results`;
}
