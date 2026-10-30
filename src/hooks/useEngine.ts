import { Chess } from "chess.js";
import { useEffect, useRef, useState } from "react";

import { useEngineHost } from "@/lib/engine/EngineHost";

/**
 * Engine lines for a position, as on the web (src/hooks/useEngine.ts there):
 *
 * ① A position already analysed is answered from memory.
 * ② Lichess's cloud eval: positions Lichess has analysed, usually deep.
 * ③ Otherwise Stockfish on the phone (src/lib/engine/EngineHost.tsx), to
 *    LOCAL_DEPTH with a time cap.
 *
 * Scores are always from White's side. Lichess reports them that way; UCI
 * reports the side to move's, so a local score is flipped when Black is to move.
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
  source: "lichess" | "local" | null;
}

export const MULTI_PV = 3;

const EMPTY: EngineResult = { lines: [], depth: 0, isAnalyzing: false, source: null };
const DEBOUNCE_MS = 150;
// A phone runs the single-threaded web build: deep enough to be useful, and
// capped so a hard position still answers in a few seconds.
const LOCAL_DEPTH = 18;
const LOCAL_CAP_MS = 4000;

/** One "info ... pv ..." line of a search, as a line with White's score. */
function parseInfo(line: string, whiteToMove: boolean): { k: number; depth: number; line: EngineLine } | null {
  if (!line.includes(" pv ")) return null;
  // A bound is a guess the search is about to correct; showing it flickers.
  if (line.includes("lowerbound") || line.includes("upperbound")) return null;
  const cp = /\bscore cp (-?\d+)/.exec(line);
  const mate = /\bscore mate (-?\d+)/.exec(line);
  const sign = whiteToMove ? 1 : -1;
  return {
    k: Number(/\bmultipv (\d+)/.exec(line)?.[1] ?? 1),
    depth: Number(/\bdepth (\d+)/.exec(line)?.[1] ?? 0),
    line: {
      score: cp ? sign * Number(cp[1]) : null,
      mate: mate ? sign * Number(mate[1]) : null,
      pv: line.slice(line.indexOf(" pv ") + 4).trim().split(/\s+/),
    },
  };
}

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
  const host = useEngineHost();
  const hostRef = useRef(host);
  hostRef.current = host;

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
    let cancelLocal: (() => void) | null = null;
    const timer = setTimeout(async () => {
      let cloud: EngineResult | null = null;
      try {
        const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=${MULTI_PV}`;
        const resp = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        const data = resp.ok ? await resp.json() : null;
        const lines: EngineLine[] = (data?.pvs ?? []).map((pv: { cp?: number; mate?: number; moves?: string }) => ({
          score: typeof pv.cp === "number" ? pv.cp : null,
          mate: typeof pv.mate === "number" ? pv.mate : null,
          pv: (pv.moves ?? "").split(" ").filter(Boolean),
        }));
        if (lines.length) cloud = { lines, depth: data.depth ?? 0, isAnalyzing: false, source: "lichess" };
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
      if (controller.signal.aborted) return;
      if (cloud) {
        memory.set(fen, cloud);
        setResult(cloud);
        return;
      }

      // Lichess has not analysed it: the phone's own Stockfish.
      const engine = hostRef.current;
      if (!engine) {
        setResult(EMPTY);
        return;
      }
      const whiteToMove = fen.split(" ")[1] !== "b";
      const found: EngineLine[] = [];
      let depth = 0;
      const run = engine.search(
        ["setoption name UCI_LimitStrength value false", `setoption name MultiPV value ${MULTI_PV}`, `position fen ${fen}`],
        `go depth ${LOCAL_DEPTH} movetime ${LOCAL_CAP_MS}`,
        (info) => {
          const parsed = parseInfo(info, whiteToMove);
          if (!parsed) return;
          found[parsed.k - 1] = parsed.line;
          if (parsed.k === 1) depth = parsed.depth;
          setResult({ lines: found.filter(Boolean), depth, isAnalyzing: true, source: "local" });
        },
      );
      cancelLocal = run.cancel;
      void run.done.then(() => {
        const lines = found.filter(Boolean);
        const done: EngineResult = lines.length ? { lines, depth, isAnalyzing: false, source: "local" } : EMPTY;
        if (lines.length) memory.set(fen, done);
        setResult(done);
      });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
      cancelLocal?.();
    };
  }, [fen, enabled]);

  // The engine could not start (offline on first use): stop saying it is thinking.
  const failed = host?.failed ?? false;
  return failed && result.isAnalyzing && result.lines.length === 0 ? EMPTY : result;
}
