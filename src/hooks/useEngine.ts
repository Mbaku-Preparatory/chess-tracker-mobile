import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";

/**
 * Engine lines for a position, from Lichess's cloud eval: positions Lichess
 * has analysed, usually very deep. The phone runs no engine of its own (React
 * Native has no WebAssembly worker), so a position Lichess has not analysed
 * shows no evaluation rather than a guess.
 *
 * Scores are from White's side, as Lichess reports them.
 */
export interface EngineLine {
  score: number | null; // centipawns, positive = White better
  mate: number | null;  // moves to mate, positive = White mates
  pv: string[];         // UCI moves
}

export interface EngineResult {
  lines: EngineLine[];
  depth: number;
  isAnalyzing: boolean;
  source: "lichess" | null;
}

export const MULTI_PV = 3;

const EMPTY: EngineResult = { lines: [], depth: 0, isAnalyzing: false, source: null };
const DEBOUNCE_MS = 150;

/** Centipawns to White's winning share (0–100), for the eval bar. */
export function cpToWhitePct(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 97 : 3;
  if (score === null) return 50;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1);
}

/** "+1.30", "-0.50", "M3", "M-7". */
export function formatScore(score: number | null, mate: number | null): string {
  if (mate !== null) return `M${mate}`;
  if (score === null) return "0.00";
  const pawns = score / 100;
  return (pawns >= 0 ? "+" : "") + pawns.toFixed(2);
}

/** A line's first moves as SAN with move numbers: "21… Nf6 22. Bg5 h6". */
export function pvToSan(fen: string, pv: string[], max = 6): string {
  const chess = new Chess(fen);
  const parts: string[] = [];
  for (const uci of pv.slice(0, max)) {
    const white = chess.turn() === "w";
    const number = chess.moveNumber();
    let san: string;
    try {
      san = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san;
    } catch {
      break;
    }
    if (white) parts.push(`${number}. ${san}`);
    else parts.push(parts.length === 0 ? `${number}… ${san}` : san);
  }
  return parts.join(" ");
}

// Shared across screens, so going back to a position is instant.
const memory = new Map<string, EngineResult>();

export function useEngine(fen: string, enabled: boolean): EngineResult {
  const [result, setResult] = useState<EngineResult>(EMPTY);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();
    if (!enabled || !fen) {
      setResult(EMPTY);
      return;
    }
    const hit = memory.get(fen);
    if (hit) {
      setResult(hit);
      return;
    }
    setResult({ ...EMPTY, isAnalyzing: true });

    const controller = new AbortController();
    abortRef.current = controller;
    const timer = setTimeout(async () => {
      try {
        const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${MULTI_PV}`;
        const resp = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        const data = resp.ok ? await resp.json() : null;
        const lines: EngineLine[] = (data?.pvs ?? []).map((pv: { cp?: number; mate?: number; moves?: string }) => ({
          score: typeof pv.cp === "number" ? pv.cp : null,
          mate: typeof pv.mate === "number" ? pv.mate : null,
          pv: (pv.moves ?? "").split(" ").filter(Boolean),
        }));
        const next: EngineResult = lines.length
          ? { lines, depth: data.depth ?? 0, isAnalyzing: false, source: "lichess" }
          : EMPTY;
        if (lines.length) memory.set(fen, next);
        setResult(next);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResult(EMPTY);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fen, enabled]);

  return result;
}
