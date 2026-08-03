import { useEffect, useRef, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StockfishResult {
  score: number | null;
  mate: number | null;
  bestMove: string | null;
  depth: number;
  isAnalyzing: boolean;
  source: "lichess" | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function cpToWhitePct(score: number | null, mate: number | null): number {
  if (mate !== null) return mate > 0 ? 97 : 3;
  if (score === null) return 50;
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1);
}

export function formatScore(score: number | null, mate: number | null): string {
  if (mate !== null) return `M${mate}`;
  if (score === null) return "0.00";
  const pawn = score / 100;
  return (pawn >= 0 ? "+" : "") + pawn.toFixed(2);
}

export function parseUciMove(uci: string | null): [string, string] | null {
  if (!uci || uci.length < 4 || uci === "(none)") return null;
  return [uci.slice(0, 2), uci.slice(2, 4)];
}

// ── Session-level eval cache ──────────────────────────────────────────────────

interface CachedEval {
  score: number | null;
  mate: number | null;
  bestMove: string | null;
  depth: number;
  source: "lichess";
}

const evalCache = new Map<string, CachedEval>();

// ── Hook ──────────────────────────────────────────────────────────────────────
// RN port: no WebAssembly/Web Worker support, so this only consults Lichess's
// cloud eval database. Positions Lichess hasn't analyzed simply show no eval
// (score/mate stay null) instead of falling back to a local engine.

const DEBOUNCE_MS = 150;

export function useStockfish(fen: string, enabled = true): StockfishResult {
  const [result, setResult] = useState<StockfishResult>({
    score: null, mate: null, bestMove: null, depth: 0,
    isAnalyzing: false, source: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !fen) return;

    const cached = evalCache.get(fen);
    if (cached) {
      setResult({ ...cached, isAnalyzing: false });
      return;
    }

    const timer = setTimeout(async () => {
      setResult((prev) => ({ ...prev, isAnalyzing: true }));
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const url = `https://lichess.org/api/cloud-eval?fen=${encodeURIComponent(fen)}&multiPv=1`;
        const resp = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
        if (resp.ok) {
          const data = await resp.json();
          const pv = data.pvs?.[0];
          if (pv) {
            const bestMove = (pv.moves as string | undefined)?.split(" ")[0] ?? null;
            const entry: CachedEval = {
              score: typeof pv.cp === "number" ? pv.cp : null,
              mate: typeof pv.mate === "number" ? pv.mate : null,
              bestMove,
              depth: data.depth ?? 0,
              source: "lichess",
            };
            evalCache.set(fen, entry);
            setResult({ ...entry, isAnalyzing: false });
            return;
          }
        }
        setResult((prev) => ({ ...prev, isAnalyzing: false }));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setResult((prev) => ({ ...prev, isAnalyzing: false }));
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [fen, enabled]);

  return result;
}
