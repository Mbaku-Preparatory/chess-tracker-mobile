import { useCallback, useMemo, useState } from "react";

import {
  INITIAL,
  type Branch,
  type LineState,
  branchStartsAt,
  clearBranch as clearBranchOf,
  fenAt,
  legalTargets as legalTargetsFrom,
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
  moves: ParsedMove[];
  index: number;
  fen: string;
  branch: Branch | null;
  branchStartsAt: number | null;
  inBranch: boolean;
  legalTargets: (from: string) => string[];
  /** False when the move was not legal from here. */
  play: (from: string, to: string) => boolean;
  goTo: (index: number) => void;
  clearBranch: () => void;
  /** Back to the starting position with no branch, for when the game changes. */
  reset: () => void;
}

export function useAnalysisLine(mainMoves: ParsedMove[]): AnalysisLine {
  const [state, setState] = useState<LineState>(INITIAL);

  const moves = useMemo(() => movesOf(mainMoves, state.branch), [mainMoves, state.branch]);
  const fen = fenAt(moves, state.index);
  const startsAt = branchStartsAt(state.branch);

  const play = useCallback(
    (from: string, to: string) => {
      const next = playMove(state, mainMoves, from, to);
      if (!next) return false;
      setState(next);
      return true;
    },
    [state, mainMoves]
  );

  const goTo = useCallback(
    (next: number) =>
      setState((prev) => ({
        ...prev,
        index: Math.max(-1, Math.min(next, movesOf(mainMoves, prev.branch).length - 1)),
      })),
    [mainMoves]
  );

  return {
    moves,
    index: state.index,
    fen,
    branch: state.branch,
    branchStartsAt: startsAt,
    inBranch: startsAt !== null && state.index >= startsAt,
    legalTargets: useCallback((from: string) => legalTargetsFrom(fen, from), [fen]),
    play,
    goTo,
    clearBranch: useCallback(() => setState(clearBranchOf), []),
    reset: useCallback(() => setState(INITIAL), []),
  };
}
