import { useCallback, useEffect, useRef } from "react";

import { useEngineHost, type EngineSearch } from "@/lib/engine/EngineHost";

/**
 * Stockfish playing at a chosen strength, for the bot once it is out of the
 * player's games: the phone's engine (EngineHost), as the web's useBotEngine
 * uses the browser's. Strength is UCI_LimitStrength + UCI_Elo, whose scale
 * stops at ELO_MIN.
 */
export const ELO_MIN = 1320;
export const ELO_MAX = 3190;

const THINK_MS = 800;

export function useBotEngine() {
  const engine = useEngineHost();
  const running = useRef<EngineSearch | null>(null);

  /** Drop the search in progress; its promise never settles. */
  const cancel = useCallback(() => {
    running.current?.cancel();
    running.current = null;
  }, []);

  /** The engine's move at `elo` as UCI ("e2e4"), or null if it has none. */
  const bestMove = useCallback(
    (fen: string, elo: number): Promise<string | null> => {
      cancel();
      if (!engine) return Promise.resolve(null);
      const clamped = Math.min(ELO_MAX, Math.max(ELO_MIN, Math.round(elo)));
      const search = engine.search(
        ["setoption name MultiPV value 1", "setoption name UCI_LimitStrength value true", `setoption name UCI_Elo value ${clamped}`, `position fen ${fen}`],
        `go movetime ${THINK_MS}`,
      );
      running.current = search;
      return search.done;
    },
    [engine, cancel],
  );

  useEffect(() => cancel, [cancel]);

  return { bestMove, cancel, failed: engine?.failed ?? false };
}
