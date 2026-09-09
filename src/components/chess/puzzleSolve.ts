import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";

import type { Puzzle, PuzzleMoveResult } from "@/types";

/**
 * Solving the daily puzzle, one move at a time.
 *
 * The client never holds the line. It plays a move, the server says whether
 * that move was on it, and hands back the single reply — so the board can
 * answer without anyone here knowing what comes after it. A client that could
 * check its own moves would have been given the answer.
 *
 * The state machine below is separated from the hook on purpose. Everything
 * that can be off by one lives in these functions — where a ply goes, when it
 * comes back off, which moves count as found — and they are checked directly.
 * The hook is the timers and the wiring around them.
 */

/**
 * The opponent's reply is played after a beat rather than in the same frame.
 * Chess boards are read by watching pieces move; an answer that lands together
 * with your own move is one you have to reconstruct afterwards.
 */
export const REPLY_DELAY_MS = 350;

/** Long enough to see the refutation on the board, short enough not to stick. */
export const WRONG_MOVE_HOLD_MS = 700;

export type SolveStatus = "playing" | "checking" | "solved" | "failed";

export interface SolveState {
  /**
   * Every ply on the board: the server's `played` plus whatever this session
   * has added. Resuming a half-solved puzzle and solving one in a single
   * sitting are then the same code path.
   */
  plies: string[];
  status: SolveStatus;
  /** Set while a refuted move is still shown, so the board can mark it. */
  wrongMove: { from: string; to: string } | null;
}

export function initialState(puzzle: Puzzle | null): SolveState {
  return {
    plies: puzzle?.played ?? [],
    status: puzzle?.solved ? "solved" : puzzle?.failed ? "failed" : "playing",
    wrongMove: null,
  };
}

/** The player's move goes on the board straight away; the server confirms it. */
export function afterPlay(state: SolveState, uci: string): SolveState {
  return { plies: [...state.plies, uci], status: "checking", wrongMove: null };
}

/**
 * A correct move with no reply is the end of the line, and the puzzle is
 * solved. A correct move with one leaves the board alone: the reply is played
 * by `afterReply` once the pause is over.
 */
export function afterCorrect(state: SolveState, reply: string | null | undefined): SolveState {
  return reply ? state : { ...state, status: "solved" };
}

export function afterReply(state: SolveState, reply: string): SolveState {
  return { plies: [...state.plies, reply], status: "playing", wrongMove: null };
}

/** Wrong. Hold the move on the board so they can see what they played. */
export function afterWrong(state: SolveState, from: string, to: string): SolveState {
  return { ...state, wrongMove: { from, to } };
}

/**
 * Take the refuted move back off. The position then matches the line the
 * player is about to be shown, rather than being one ply past it.
 */
export function afterWrongSettled(state: SolveState): SolveState {
  return { plies: state.plies.slice(0, -1), status: "failed", wrongMove: null };
}

/**
 * The move never reached the server, so it is not spent. Put the board back
 * and let them try again — losing a puzzle to a dropped connection is the
 * kind of thing people do not come back from.
 */
export function afterFailedRequest(state: SolveState): SolveState {
  return { plies: state.plies.slice(0, -1), status: "playing", wrongMove: null };
}

/**
 * How many of the player's own moves are found. Their moves are the even
 * plies, so each found move accounts for two — except the last one of a solved
 * puzzle, which has no reply after it, and a refuted move still sitting on the
 * board, which is not found at all.
 */
export function movesFound(state: SolveState): number {
  const counted = state.wrongMove ? state.plies.length - 1 : state.plies.length;
  return Math.ceil(counted / 2);
}

/**
 * Replay UCI plies onto a starting position.
 *
 * Tolerant on purpose: `fen` and `played` arrive together, but a re-render can
 * pair a new puzzle's position with the previous one's moves for a frame, and
 * throwing there would take the screen down over something that fixes itself.
 */
export function positionAfter(startFen: string, plies: string[]): Chess {
  const chess = startFen ? new Chess(startFen) : new Chess();
  for (const uci of plies) {
    try {
      chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
    } catch {
      break;
    }
  }
  return chess;
}

/** The line in SAN, for showing once the puzzle is over. */
export function lineInSan(startFen: string, solution: string[] | undefined): string[] {
  if (!solution || !startFen) return [];
  const chess = new Chess(startFen);
  const san: string[] = [];
  for (const uci of solution) {
    try {
      san.push(
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined }).san
      );
    } catch {
      break;
    }
  }
  return san;
}

export interface PuzzleSolve {
  /** The position on the board right now — not necessarily the puzzle's. */
  fen: string;
  /** The move to highlight: the last one played, from either side. */
  lastMove: { from: string; to: string } | null;
  status: SolveStatus;
  /** How many of the player's moves are found, out of `puzzle.moves_to_find`. */
  found: number;
  /** Set for a moment after a wrong move, so the board can show it. */
  wrongMove: { from: string; to: string } | null;
  /** Where a piece on `from` may legally go, for the move dots. */
  legalTargets: (from: string) => string[];
  /** Returns false when the move is not legal here; the board should ignore it. */
  play: (from: string, to: string) => boolean;
  /** The line, in SAN, once the puzzle is over. Empty until then. */
  solutionSan: string[];
}

export function usePuzzleSolve(
  puzzle: Puzzle | null,
  submit: (id: number, move: string) => Promise<PuzzleMoveResult>,
  onResult?: (result: PuzzleMoveResult) => void
): PuzzleSolve {
  const [state, setState] = useState<SolveState>(() => initialState(puzzle));

  // Timers have to be cancelled when the puzzle changes under them, or a reply
  // scheduled for yesterday's puzzle lands on today's board.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const puzzleId = puzzle?.id ?? null;
  useEffect(() => {
    clearTimers();
    setState(initialState(puzzle));
    // Keyed on the id, not the object: the screen replaces the puzzle in its
    // list after every move, and a fresh object for the same puzzle would
    // reset the board to the server's state mid-animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleId, clearTimers]);

  useEffect(() => clearTimers, [clearTimers]);

  const board = useMemo(
    () => positionAfter(puzzle?.fen ?? "", state.plies),
    [puzzle?.fen, state.plies]
  );

  const solutionSan = useMemo(
    () => lineInSan(puzzle?.fen ?? "", puzzle?.solution),
    [puzzle?.fen, puzzle?.solution]
  );

  const legalTargets = useCallback(
    (from: string) => {
      if (state.status !== "playing") return [];
      try {
        return board.moves({ square: from as never, verbose: true }).map((m) => m.to);
      } catch {
        return [];
      }
    },
    [board, state.status]
  );

  const play = useCallback(
    (from: string, to: string) => {
      if (!puzzle || state.status !== "playing") return false;

      // Legality is settled here so a misplaced finger is simply refused
      // rather than spent — the server would call an illegal move a wrong one
      // and end the puzzle, which is a harsh price for a slipped drag.
      let uci: string;
      try {
        const move = new Chess(board.fen()).move({ from, to, promotion: "q" });
        if (!move) return false;
        uci = move.from + move.to + (move.promotion ?? "");
      } catch {
        return false;
      }

      setState((prev) => afterPlay(prev, uci));

      submit(puzzle.id, uci)
        .then((result) => {
          onResult?.(result);
          if (result.correct) {
            setState((prev) => afterCorrect(prev, result.reply));
            if (result.reply) {
              later(() => setState((prev) => afterReply(prev, result.reply as string)), REPLY_DELAY_MS);
            }
            return;
          }
          setState((prev) => afterWrong(prev, from, to));
          later(() => setState(afterWrongSettled), WRONG_MOVE_HOLD_MS);
        })
        .catch(() => setState(afterFailedRequest));

      return true;
    },
    [puzzle, state.status, board, submit, onResult, later]
  );

  const last = state.plies.length ? state.plies[state.plies.length - 1] : null;

  return {
    fen: board.fen(),
    lastMove: last ? { from: last.slice(0, 2), to: last.slice(2, 4) } : null,
    status: state.status,
    found: movesFound(state),
    wrongMove: state.wrongMove,
    legalTargets,
    play,
    solutionSan,
  };
}
