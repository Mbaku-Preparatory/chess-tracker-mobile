/**
 * How a game is labelled wherever it is shown: its source (name and colour)
 * and its date. One place, so the badges, the prep panel, the import tabs and
 * the filters agree, the way the web app's lib/games.ts does.
 */

import type { GameSource } from "@/types";

export interface GameSourceStyle {
  /** In filters and tabs. */
  label: string;
  /** On a badge. */
  short: string;
  /** The source's own colour: dots, tabs, the import panel. */
  color: string;
  /** Text on a badge tinted with `color`. */
  text: string;
}

export const GAME_SOURCES: Record<GameSource, GameSourceStyle> = {
  chess_results: { label: "OTB", short: "OTB", color: "#1a3a6b", text: "#1a3a6b" },
  chess_com: { label: "Chess.com", short: "Chess.com", color: "#7fa650", text: "#4a6e2e" },
  lichess: { label: "Lichess", short: "Lichess", color: "#b05000", text: "#7a3800" },
  pgn_import: { label: "PGN import", short: "PGN", color: "#7c3aed", text: "#6d28d9" },
  manual: { label: "Manual", short: "Manual", color: "#6b7280", text: "#4b5563" },
};

/** A source the server added after this list: shown as it comes. */
export function gameSource(source: string): GameSourceStyle {
  return GAME_SOURCES[source as GameSource] ?? { label: source, short: source, color: "#6b7280", text: "#4b5563" };
}

/** `color` at an opacity, for tints: "#7fa650" at 0.12 is "#7fa6501f". */
export function tint(color: string, opacity: number): string {
  return `${color}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`;
}

/** "5 Mar 2025". A game date has no time of day, so it is read as UTC: in
 * local time it would show the day before west of Greenwich. */
export function formatGameDate(date: string | null | undefined): string | null {
  if (!date) return null;
  return new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

/** Games per page in the games list. Sent to the server, which otherwise pages by 25. */
export const GAMES_PAGE_SIZE = 20;
