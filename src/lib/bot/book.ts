import { Chess } from "chess.js";

import type { BotBookGame } from "@/types";

/**
 * The opening book for "Play <player> bot", built from the player's own games.
 * The web app's lib/bot/book.ts, word for word (only `recency` is exported
 * here): keep the two the same. The phone builds it level by level instead
 * (lib/bot/levelBook.ts), because replaying every game up front is seconds.
 *
 * In the opening the bot plays a move the player actually played in that
 * position, chosen at random in proportion to how often they played it, with
 * recent games counting for more: a player who switched openings last year
 * should not be played as they were five years ago. Positions are matched by
 * FEN, so a transposition into one of their games is still their game.
 */

/** How far the bot follows the player's games before the engine takes over. */
export const BOOK_MOVES = 10;
export const BOOK_PLIES = BOOK_MOVES * 2;

/** A game this many years old counts half as much as one played today. */
const HALF_LIFE_YEARS = 2;
/** An undated game counts as one this old. */
const UNDATED_WEIGHT = 0.5;

export interface BookMove {
  san: string;
  /** Games that played it here. */
  count: number;
  weight: number;
}

export interface Book {
  /** Position (FEN without the move counters) → the moves played there. */
  positions: Map<string, Map<string, BookMove>>;
  games: number;
}

export const positionKey = (fen: string) => fen.split(" ").slice(0, 4).join(" ");

export function recency(date: string | null, now: number): number {
  if (!date) return UNDATED_WEIGHT;
  const years = (now - Date.parse(date)) / (365.25 * 24 * 3600 * 1000);
  return Math.pow(0.5, Math.max(0, years) / HALF_LIFE_YEARS);
}

export function buildBook(games: BotBookGame[], now = Date.now()): Book {
  const positions = new Map<string, Map<string, BookMove>>();
  for (const game of games) {
    const weight = recency(game.date, now);
    const chess = new Chess();
    for (const san of game.moves.slice(0, BOOK_PLIES)) {
      const key = positionKey(chess.fen());
      let played: string;
      try {
        played = chess.move(san).san;
      } catch {
        break; // the rest of this game cannot be trusted
      }
      let moves = positions.get(key);
      if (!moves) positions.set(key, (moves = new Map()));
      const entry = moves.get(played);
      if (entry) {
        entry.count += 1;
        entry.weight += weight;
      } else {
        moves.set(played, { san: played, count: 1, weight });
      }
    }
  }
  return { positions, games: games.length };
}

/** The moves the player chose in this position, most played first. */
export function bookMoves(book: Book, fen: string): BookMove[] {
  const moves = book.positions.get(positionKey(fen));
  return moves ? [...moves.values()].sort((a, b) => b.count - a.count) : [];
}

/** One of those moves, at random in proportion to its weight. */
export function pickBookMove(book: Book, fen: string, random = Math.random): BookMove | null {
  const moves = bookMoves(book, fen);
  const total = moves.reduce((sum, m) => sum + m.weight, 0);
  let r = random() * total;
  for (const m of moves) {
    r -= m.weight;
    if (r <= 0) return m;
  }
  return moves[moves.length - 1] ?? null;
}

/** The games that went exactly this way, move for move. A transposition into
 * a game does not count here: this is for "I played this game against …". */
export function gamesOnLine(games: BotBookGame[], line: string[]): BotBookGame[] {
  return games.filter((g) => g.moves.length >= line.length && line.every((san, i) => g.moves[i] === san));
}
