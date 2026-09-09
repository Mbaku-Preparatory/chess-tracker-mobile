import { useCallback, useMemo, useState } from "react";
import { Chess } from "chess.js";

/**
 * Entering one attempt at a puzzle.
 *
 * The player plays the moves on the board rather than typing them, because
 * this is chess and the board is right there — and because typed SAN would
 * make the game partly a spelling test, which is not what it is about.
 *
 * The board runs ahead as they go, so each move is chosen from the position it
 * would actually be played in. That also means every move is legal by
 * construction, and the server never has to reject an attempt for being
 * impossible.
 */
export interface PuzzleEntry {
  /** SAN moves entered so far, at most `length`. */
  moves: string[];
  /** The position after the moves entered so far. */
  fen: string;
  complete: boolean;
  legalTargets: (from: string) => string[];
  /** False when the move is not legal from here. */
  play: (from: string, to: string) => boolean;
  undo: () => void;
  clear: () => void;
}

export function usePuzzleEntry(startFen: string, length: number): PuzzleEntry {
  const [moves, setMoves] = useState<string[]>([]);

  // Replayed from the start each time rather than kept as a running board:
  // the list is at most five moves, and a single source of truth cannot drift
  // out of step with what the player sees.
  const fen = useMemo(() => {
    if (!startFen) return "";
    const chess = new Chess(startFen);
    for (const san of moves) {
      try {
        chess.move(san);
      } catch {
        break;
      }
    }
    return chess.fen();
  }, [startFen, moves]);

  const legalTargets = useCallback(
    (from: string) => {
      if (!fen || moves.length >= length) return [];
      try {
        return new Chess(fen).moves({ square: from as never, verbose: true }).map((m) => m.to);
      } catch {
        return [];
      }
    },
    [fen, moves.length, length]
  );

  const play = useCallback(
    (from: string, to: string) => {
      if (moves.length >= length) return false;
      let san: string;
      try {
        // Always a queen, as the analysis board does. A promotion picker in
        // the middle of a five-move guess costs more than under-promotion is
        // worth here.
        const played = new Chess(fen).move({ from, to, promotion: "q" });
        if (!played) return false;
        san = played.san;
      } catch {
        return false;
      }
      setMoves((prev) => [...prev, san]);
      return true;
    },
    [fen, moves.length, length]
  );

  return {
    moves,
    fen,
    complete: moves.length === length,
    legalTargets,
    play,
    undo: useCallback(() => setMoves((prev) => prev.slice(0, -1)), []),
    clear: useCallback(() => setMoves([]), []),
  };
}
