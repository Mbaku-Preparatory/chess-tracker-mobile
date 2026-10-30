import { Chess } from "chess.js";

import type { BotBookGame } from "@/types";

import { BOOK_PLIES, positionKey, recency, type BookMove } from "./book";

/**
 * The same opening book as buildBook (lib/bot/book.ts), built one move-depth
 * at a time. On the web, replaying a player's games through chess.js takes
 * half a second; a phone runs JavaScript without a JIT, and the same 3,000
 * moves took twenty seconds, all of it before the first move.
 *
 * But a game only ever asks for one depth at a time: the moves played from
 * the position after n plies. So level n is the positions every game reached
 * after n plies and what was played there, and it is built when it is first
 * needed, or ahead of time in small slices (`work`) while the person thinks.
 * Level 0 is about a second on a mid-range phone; each later level is less
 * than that and is usually ready before anyone asks.
 *
 * Positions are matched by FEN within a level, so a transposition (another
 * move order to the same position after the same number of moves) is still
 * their game, as on the web.
 */
export class LevelBook {
  private readonly games: BotBookGame[];
  private readonly weights: number[];
  // Each game's board, advanced one ply per level; null once a move in it
  // will not play (the rest of that game cannot be trusted).
  private readonly boards: (Chess | null)[];
  private readonly levels: Map<string, Map<string, BookMove>>[] = [];
  // How far into the level being built (game index).
  private cursor = 0;
  private building: Map<string, Map<string, BookMove>> = new Map();

  constructor(games: BotBookGame[], now = Date.now()) {
    this.games = games;
    this.weights = games.map((g) => recency(g.date, now));
    this.boards = games.map(() => new Chess());
  }

  /** Levels built so far. */
  get depth(): number {
    return this.levels.length;
  }

  /** Builds up to `budget` games' worth of the next level. False when there is nothing left to build. */
  work(budget = 20): boolean {
    const level = this.levels.length;
    if (level >= BOOK_PLIES) return false;
    const end = Math.min(this.games.length, this.cursor + budget);
    for (let i = this.cursor; i < end; i++) {
      const board = this.boards[i];
      const san = this.games[i].moves[level];
      if (!board || !san) {
        this.boards[i] = null;
        continue;
      }
      const key = positionKey(board.fen());
      let played: string;
      try {
        played = board.move(san).san;
      } catch {
        this.boards[i] = null; // the rest of this game cannot be trusted
        continue;
      }
      let moves = this.building.get(key);
      if (!moves) this.building.set(key, (moves = new Map()));
      const entry = moves.get(played);
      if (entry) {
        entry.count += 1;
        entry.weight += this.weights[i];
      } else {
        moves.set(played, { san: played, count: 1, weight: this.weights[i] });
      }
    }
    this.cursor = end;
    if (this.cursor >= this.games.length) {
      this.levels.push(this.building);
      this.building = new Map();
      this.cursor = 0;
    }
    return this.levels.length < BOOK_PLIES;
  }

  /** The moves the player chose in this position, `ply` plies into a game, most played first. */
  moves(fen: string, ply: number): BookMove[] {
    if (ply >= BOOK_PLIES) return [];
    while (this.levels.length <= ply) this.work(this.games.length);
    const found = this.levels[ply].get(positionKey(fen));
    return found ? [...found.values()].sort((a, b) => b.count - a.count) : [];
  }

  /** One of those moves, at random in proportion to its weight. */
  pick(fen: string, ply: number, random = Math.random): BookMove | null {
    const moves = this.moves(fen, ply);
    const total = moves.reduce((sum, m) => sum + m.weight, 0);
    let r = random() * total;
    for (const m of moves) {
      r -= m.weight;
      if (r <= 0) return m;
    }
    return moves[moves.length - 1] ?? null;
  }
}
