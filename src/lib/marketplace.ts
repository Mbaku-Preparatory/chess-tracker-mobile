import type { Player } from "@/types";

export function getPrimaryRating(player: Player): number | null {
  return player.standard_rating ?? player.rapid_rating ?? player.blitz_rating ?? null;
}

export function getPrepProductName(player: Player): string {
  const surname = player.full_name.trim().split(/\s+/).at(-1) || player.full_name;
  return `${surname} Prep`;
}
