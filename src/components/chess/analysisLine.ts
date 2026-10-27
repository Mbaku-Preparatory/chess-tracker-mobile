import { Chess } from "chess.js";

import type { ParsedMove } from "./GameReplay";

/**
 * The game, plus whatever you played instead — as plain data.
 *
 * Deliberately free of React so it can be reasoned about, and run, on its own.
 * `useAnalysisLine` is a thin wrapper that holds this in state.
 *
 * The game itself is never edited. A move that leaves the score opens a branch
 * — the ply it left from, and the moves played since — and the board then reads
 * the main line up to that point followed by the branch. Discard the branch and
 * the game is exactly as it was, because nothing ever wrote to it.
 *
 * One deliberate simplification against a full PGN tree: **one branch at a
 * time.** Playing a different move from inside a branch replaces what followed
 * it; leaving the branch and playing elsewhere starts a new one. A tree needs a
 * tree view to be navigable, and a tree view on a phone is a worse way to read
 * a game than the single line people opened it for.
 *
 * The branch stays when you step back onto the game: like Chess.com, the move
 * list shows the game and, under the move it replaced, the line you tried, and
 * either can be clicked. `onBranch` says which of the two the board follows.
 */

/** The position before any move. */
export const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export interface Branch {
  /**
   * Index in the main line the branch leaves *from*: the position after
   * `mainMoves[fromIndex]`. -1 branches from the starting position.
   */
  fromIndex: number;
  moves: ParsedMove[];
}

export interface LineState {
  /** -1 is the starting position. An index into `lineOf(state)`. */
  index: number;
  branch: Branch | null;
  /** Following the branch rather than the game. */
  onBranch: boolean;
}

export const INITIAL: LineState = { index: -1, branch: null, onBranch: false };

/** Main line, or main line up to the branch point followed by the branch. */
export function movesOf(mainMoves: ParsedMove[], branch: Branch | null): ParsedMove[] {
  if (!branch) return mainMoves;
  return [...mainMoves.slice(0, branch.fromIndex + 1), ...branch.moves];
}

/** The line the board is following: the game, or the game into the branch. */
export function lineOf(mainMoves: ParsedMove[], state: LineState): ParsedMove[] {
  return state.onBranch ? movesOf(mainMoves, state.branch) : mainMoves;
}

/** Where the branch begins within `movesOf`, or null when there is none. */
export function branchStartsAt(branch: Branch | null): number | null {
  return branch ? branch.fromIndex + 1 : null;
}

export function fenAt(moves: ParsedMove[], index: number): string {
  return index >= 0 ? moves[index]?.fen ?? START_FEN : START_FEN;
}

export function legalTargets(fen: string, from: string): string[] {
  try {
    return new Chess(fen).moves({ square: from as never, verbose: true }).map((m) => m.to);
  } catch {
    // An unreachable position should disable the board, never crash it.
    return [];
  }
}

/**
 * Play a move from the current position.
 *
 * Returns the next state, or null when the move is not legal — the caller
 * treats null as "that tap meant something else", not as an error.
 */
export function playMove(
  state: LineState,
  mainMoves: ParsedMove[],
  from: string,
  to: string
): LineState | null {
  const moves = lineOf(mainMoves, state);
  const chess = new Chess(fenAt(moves, state.index));

  let played;
  try {
    // Always a queen. Under-promotion is rare enough that asking every time
    // costs more than it saves, and a known simplification beats a silent
    // wrong guess.
    played = chess.move({ from, to, promotion: "q" });
  } catch {
    return null;
  }
  if (!played) return null;

  const move: ParsedMove = {
    san: played.san,
    fen: played.after,
    from: played.from,
    to: played.to,
    moveNumber: Math.ceil((state.index + 2) / 2),
    color: played.color,
  };

  const startsAt = branchStartsAt(state.branch);
  const insideBranch = state.onBranch && startsAt !== null && state.index >= startsAt;

  // Playing the game's own next move is not a deviation — it just walks
  // forward. Without this, following a game by hand would fork the line at
  // every move and bury the score inside a branch identical to it.
  if (!insideBranch && mainMoves[state.index + 1]?.san === move.san) {
    return { index: state.index + 1, branch: state.branch, onBranch: false };
  }

  if (state.branch && insideBranch) {
    const keep = state.index - (startsAt as number) + 1;
    // The branch's own next move, played by hand, walks forward the same way.
    if (state.branch.moves[keep]?.san === move.san) {
      return { ...state, index: state.index + 1 };
    }
    // A different move from further back inside the branch replaces what
    // followed it, which is what "take that back and try this instead" means.
    return {
      index: state.index + 1,
      branch: { ...state.branch, moves: [...state.branch.moves.slice(0, keep), move] },
      onBranch: true,
    };
  }

  return { index: state.index + 1, branch: { fromIndex: state.index, moves: [move] }, onBranch: true };
}
