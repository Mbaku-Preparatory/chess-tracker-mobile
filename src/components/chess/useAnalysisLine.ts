import { useCallback, useMemo, useState } from "react";

import {
  INITIAL,
  type Branch,
  type LineState,
  branchStartsAt,
  START_FEN,
  fenAt,
  legalTargets as legalTargetsFrom,
  lineOf,
  movesOf,
  playMove,
} from "./analysisLine";
import type { ParsedMove } from "./GameReplay";

export { START_FEN } from "./analysisLine";

/**
 * React state around `analysisLine`. All the reasoning lives there; this only
 * holds the state and re-exposes it.
 */
export interface AnalysisLine {
  /** The line the board follows: the game, or the game into the branch. */
  moves: ParsedMove[];
  index: number;
  fen: string;
  branch: Branch | null;
  branchStartsAt: number | null;
  /** Following the branch rather than the game. */
  onBranch: boolean;
  /** On the branch, past where it leaves the game. */
  inBranch: boolean;
  legalTargets: (from: string) => string[];
  /** False when the move was not legal from here. */
  play: (from: string, to: string) => boolean;
  /** Step along the line the board is following. */
  goTo: (index: number) => void;
  /** Jump to a move of the game itself; the branch stays in the list. */
  selectMain: (index: number) => void;
  /** Jump to a move of the branch, by its index in `movesOf(main, branch)`. */
  selectBranch: (index: number) => void;
  /** Back to the starting position with no branch, for when the game changes. */
  reset: () => void;
}

/** `start`: where the line begins, when not the opening position (a book
 * exercise starts from its diagram). */
export function useAnalysisLine(mainMoves: ParsedMove[], start: string = START_FEN): AnalysisLine {
  const [state, setState] = useState<LineState>(INITIAL);

  const moves = useMemo(() => lineOf(mainMoves, state), [mainMoves, state]);
  const fen = fenAt(moves, state.index, start);
  const startsAt = branchStartsAt(state.branch);

  const play = useCallback(
    (from: string, to: string) => {
      const next = playMove(state, mainMoves, from, to, start);
      if (!next) return false;
      setState(next);
      return true;
    },
    [state, mainMoves, start]
  );

  const goTo = useCallback(
    (next: number) =>
      setState((prev) => ({
        ...prev,
        index: Math.max(-1, Math.min(next, lineOf(mainMoves, prev).length - 1)),
      })),
    [mainMoves]
  );
  const selectMain = useCallback(
    (next: number) => setState((prev) => ({ ...prev, onBranch: false, index: Math.max(-1, Math.min(next, mainMoves.length - 1)) })),
    [mainMoves]
  );
  const selectBranch = useCallback(
    (next: number) =>
      setState((prev) => (prev.branch ? { ...prev, onBranch: true, index: Math.min(next, movesOf(mainMoves, prev.branch).length - 1) } : prev)),
    [mainMoves]
  );

  const legalTargets = useCallback((from: string) => legalTargetsFrom(fen, from), [fen]);
  const reset = useCallback(() => setState(INITIAL), []);

  // Memoised, and load-bearing. A fresh object every render makes every
  // `useMemo([..., line])` in a consumer recompute and every callback built
  // from it change identity — which silently defeats the board's own memo, and
  // the board is 32 SVG pieces. The parent re-renders several times per move
  // (the move itself, then the eval arriving), so that is the difference
  // between repainting the pieces once and repainting them four times.
  return useMemo(
    () => ({
      moves,
      index: state.index,
      fen,
      branch: state.branch,
      branchStartsAt: startsAt,
      onBranch: state.onBranch,
      inBranch: state.onBranch && startsAt !== null && state.index >= startsAt,
      legalTargets,
      play,
      goTo,
      selectMain,
      selectBranch,
      reset,
    }),
    [moves, state.index, state.branch, state.onBranch, fen, startsAt, legalTargets, play, goTo, selectMain, selectBranch, reset]
  );
}
