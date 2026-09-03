import type { Game } from "@/types";

/**
 * The identifier to address a game by in a URL.
 *
 * public_id normally, falling back to the sequential id. The fallback is not
 * decoration: while both identifiers are accepted, a Game object can reach a
 * component without a public_id — one built client-side from a payload served
 * before that field existed, or held by a screen opened across a deploy.
 * Sending `undefined` produced a 500 rather than a miss.
 *
 * Delete this along with the backend's integer support, once no client can be
 * holding a Game that predates public_id.
 */
export function gameRef(game: Pick<Game, "id" | "public_id">): string {
  return game.public_id || String(game.id);
}
