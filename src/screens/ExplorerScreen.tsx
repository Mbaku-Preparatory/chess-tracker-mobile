import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Chess } from "chess.js";

import Chessboard, { type ChessboardRef } from "react-native-chessboard";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/ui/SectionContainer";
import { useTheme } from "@/theme/ThemeContext";
import type { ExplorerSource, PositionExplorer } from "@/types";

/**
 * The position explorer: play any line and see what strong players chose
 * next, and how those games ended. The web's /explorer page, on the same API.
 *
 * The line is kept as UCI with a cursor into it, so stepping back keeps the
 * moves ahead and stepping forward replays them, as in any game viewer.
 */

const SOURCES: { value: ExplorerSource; label: string }[] = [
  { value: "otb", label: "OTB" },
  { value: "online", label: "Online" },
  { value: "all", label: "Both" },
];

function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** Replays a UCI line, keeping everything up to the first move that is not legal. */
function replayLine(line: string[]): { chess: Chess; line: string[]; sans: string[] } {
  const chess = new Chess();
  const kept: string[] = [];
  const sans: string[] = [];
  for (const uci of line) {
    try {
      const move = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4) || undefined });
      kept.push(uci);
      sans.push(move.san);
    } catch {
      break;
    }
  }
  return { chess, line: kept, sans };
}

/** White · draw · black as one bar, labelled only where the label fits. */
function ResultBar({ white, draws, black, tall = false }: { white: number; draws: number; black: number; tall?: boolean }) {
  const t = useTheme();
  const total = white + draws + black;
  const w = pct(white, total);
  const b = pct(black, total);
  const d = total > 0 ? 100 - w - b : 0;
  const segments = [
    { width: w, bg: "#ffffff", fg: "#1f2937" },
    { width: d, bg: "#9ca3af", fg: "#ffffff" },
    { width: b, bg: "#1f2937", fg: "#ffffff" },
  ];
  return (
    <View style={[st.bar, { height: tall ? 26 : 18, borderColor: t.border }]}>
      {segments.map((seg, i) =>
        seg.width > 0 ? (
          <View key={i} style={{ width: `${seg.width}%`, backgroundColor: seg.bg, alignItems: "center", justifyContent: "center" }}>
            {seg.width >= (tall ? 10 : 16) && (
              <Text style={{ color: seg.fg, fontSize: tall ? 11 : 9, fontWeight: "800" }}>{seg.width}%</Text>
            )}
          </View>
        ) : null
      )}
    </View>
  );
}

export function ExplorerScreen() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 420);

  const [line, setLine] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);
  const [source, setSource] = useState<ExplorerSource>("otb");
  const [flipped, setFlipped] = useState(false);
  const [data, setData] = useState<PositionExplorer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cache = useRef(new Map<string, PositionExplorer>());

  const full = useMemo(() => replayLine(line), [line]);
  const shownLine = useMemo(() => line.slice(0, cursor), [line, cursor]);
  const current = useMemo(() => replayLine(shownLine), [shownLine]);
  const fen = current.chess.fen();

  // The board owns its own position (`fen` below is only where it starts), so
  // it is told whenever ours moves without it — stepping, tapping a move in
  // the list. Not after a drag: the board has already made that move, and
  // resetting would fight the gesture. The ref marks that one case.
  const boardRef = useRef<ChessboardRef>(null);
  const cameFromBoard = useRef(false);
  useEffect(() => {
    if (cameFromBoard.current) {
      cameFromBoard.current = false;
      return;
    }
    boardRef.current?.resetBoard(fen);
  }, [fen]);

  useEffect(() => {
    const key = `${source}|${shownLine.join(",")}`;
    const hit = cache.current.get(key);
    if (hit) {
      setData(hit);
      return;
    }
    let live = true;
    setError(null);
    api
      .getPositionExplorer(fen, source, shownLine)
      .then((body) => {
        cache.current.set(key, body);
        if (live) setData(body);
      })
      .catch((err) => live && setError(userMessage(err, "Couldn't load this position.")));
    return () => {
      live = false;
    };
  }, [fen, source, shownLine]);

  // The last named opening on the way here: most positions past the book have
  // no name of their own, and the header going blank one move after "Najdorf"
  // would be the wrong answer.
  const [opening, setOpening] = useState<{ eco_code: string; name: string } | null>(null);
  useEffect(() => {
    if (cursor === 0) setOpening(null);
    else if (data?.fen === fen && data.opening) setOpening(data.opening);
  }, [data, fen, cursor]);

  const play = useCallback(
    (uci: string) => {
      // The move already next in the line just steps forward, so the rest of
      // the line survives.
      if (line[cursor] === uci) {
        setCursor(cursor + 1);
        return true;
      }
      const next = [...line.slice(0, cursor), uci];
      if (replayLine(next).line.length !== next.length) return false;
      setLine(next);
      setCursor(next.length);
      return true;
    },
    [line, cursor]
  );

  const fresh = data?.fen === fen ? data : null;
  const total = fresh?.games ?? 0;

  const navButtons: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled: boolean }[] = [
    { icon: "play-skip-back", onPress: () => setCursor(0), disabled: cursor === 0 },
    { icon: "chevron-back", onPress: () => setCursor(cursor - 1), disabled: cursor === 0 },
    { icon: "chevron-forward", onPress: () => setCursor(cursor + 1), disabled: cursor >= line.length },
    { icon: "play-skip-forward", onPress: () => setCursor(line.length), disabled: cursor >= line.length },
    { icon: "swap-vertical", onPress: () => setFlipped((f) => !f), disabled: false },
  ];

  return (
    <Screen>
      <PageHeader title="Explorer" subtitle="What strong players chose next, and how it went" />
      <ScrollView contentContainerStyle={{ paddingBottom: 32, gap: 12 }}>
        <View style={{ alignItems: "center" }}>
          {/* Keyed on orientation: the board reads `flipped` once, at mount. */}
          <Chessboard
            key={flipped ? "black" : "white"}
            ref={boardRef}
            fen={fen}
            flipped={flipped}
            boardSize={boardSize}
            withLetters={false}
            withNumbers={false}
            colors={{ black: "#4a7c59", white: "#f0d9b5" }}
            onMove={({ move }) => {
              if (!move) return;
              cameFromBoard.current = true;
              if (!play(`${move.from}${move.to}${move.promotion ?? ""}`)) {
                cameFromBoard.current = false;
                boardRef.current?.resetBoard(fen);
              }
            }}
          />
        </View>

        <View style={st.navRow}>
          {navButtons.map((b) => (
            <Pressable
              key={b.icon}
              onPress={b.onPress}
              disabled={b.disabled}
              style={[st.navBtn, { borderColor: t.border, backgroundColor: t.surface, opacity: b.disabled ? 0.35 : 1 }]}
            >
              <Ionicons name={b.icon} size={18} color={t.text} />
            </Pressable>
          ))}
        </View>

        {/* The line; every move tappable, moves past the cursor dimmed. */}
        <View style={[st.card, { borderColor: t.border, backgroundColor: t.surface }]}>
          {full.sans.length === 0 ? (
            <Text style={{ color: t.textFaint, fontSize: 13 }}>
              Make a move on the board, or pick one from the list.
            </Text>
          ) : (
            <View style={st.lineWrap}>
              {full.sans.map((san, i) => (
                <Pressable
                  key={i}
                  onPress={() => setCursor(i + 1)}
                  style={[st.lineMove, i + 1 === cursor && { backgroundColor: t.brand(600) }]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: i + 1 === cursor ? "#fff" : i < cursor ? t.text : t.textFaint,
                    }}
                  >
                    {i % 2 === 0 ? `${i / 2 + 1}. ` : ""}
                    {san}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={[st.segment, { borderColor: t.border, backgroundColor: t.surface }]}>
          {SOURCES.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setSource(s.value)}
              style={[st.segmentBtn, source === s.value && { backgroundColor: t.brand(600) }]}
            >
              <Text style={{ fontSize: 13, fontWeight: "700", color: source === s.value ? "#fff" : t.textMuted }}>
                {s.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={[st.card, { borderColor: t.border, backgroundColor: t.surface }]}>
          <Text style={[st.eyebrow, { color: t.textFaint }]}>{opening ? opening.eco_code : "POSITION"}</Text>
          <Text style={{ fontSize: 16, fontWeight: "800", color: t.text, marginTop: 2 }}>
            {cursor === 0 ? "Starting position" : opening?.name ?? "Unnamed position"}
          </Text>
          {fresh && total > 0 && (
            <View style={{ marginTop: 10, gap: 6 }}>
              <Text style={{ fontSize: 13, color: t.textMuted }}>
                <Text style={{ fontWeight: "800", color: t.brand(600) }}>{total.toLocaleString()}</Text>{" "}
                {total === 1 ? "game" : "games"} reached this position
              </Text>
              <ResultBar white={fresh.white ?? 0} draws={fresh.draws ?? 0} black={fresh.black ?? 0} tall />
            </View>
          )}
        </View>

        <View style={[st.card, { borderColor: t.border, backgroundColor: t.surface, padding: 0, overflow: "hidden" }]}>
          <View style={[st.row, { borderBottomWidth: 1, borderColor: t.border }]}>
            <Text style={[st.eyebrow, st.colMove, { color: t.textFaint }]}>MOVE</Text>
            <Text style={[st.eyebrow, st.colGames, { color: t.textFaint }]}>GAMES</Text>
            <Text style={[st.eyebrow, { flex: 1, color: t.textFaint }]}>RESULT</Text>
          </View>
          {error ? (
            <Text style={[st.note, { color: t.danger }]}>{error}</Text>
          ) : data && !data.available ? (
            <Text style={[st.note, { color: t.textMuted }]}>The explorer is being built. Check back shortly.</Text>
          ) : !fresh ? (
            <ActivityIndicator color={t.brand(600)} style={{ paddingVertical: 20 }} />
          ) : fresh.moves.length === 0 ? (
            <Text style={[st.note, { color: t.textMuted }]}>
              No games reached this position{source !== "all" ? " — try another source" : ""}.
            </Text>
          ) : (
            fresh.moves.map((m) => (
              <Pressable
                key={m.uci}
                onPress={() => play(m.uci)}
                style={({ pressed }) => [st.row, pressed && { backgroundColor: t.elevated }]}
              >
                <Text style={[st.colMove, { fontSize: 14, fontWeight: "800", color: t.text }]}>{m.san}</Text>
                <Text style={[st.colGames, { fontSize: 13, color: t.textMuted }]}>
                  {compact(m.games)}
                  <Text style={{ fontSize: 10, color: t.textFaint }}> {pct(m.games, total)}%</Text>
                </Text>
                <View style={{ flex: 1 }}>
                  <ResultBar white={m.white} draws={m.draws} black={m.black} />
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const st = StyleSheet.create({
  navRow: { flexDirection: "row", gap: 8 },
  navBtn: { flex: 1, height: 40, borderWidth: 1, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  card: { borderWidth: 1, borderRadius: 12, padding: 14 },
  lineWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  lineMove: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 12, padding: 4, gap: 4 },
  segmentBtn: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 0.8 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 9 },
  colMove: { width: 52 },
  colGames: { width: 76, textAlign: "right" },
  note: { paddingHorizontal: 14, paddingVertical: 18, fontSize: 13 },
  bar: { flexDirection: "row", overflow: "hidden", borderRadius: 6, borderWidth: StyleSheet.hairlineWidth },
});
