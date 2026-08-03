import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Chess } from "chess.js";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ColorBadge, ResultBadge } from "@/components/ui/Badge";
import { ChessBoard } from "@/components/chess/ChessBoard";
import { PgnViewerModal } from "./PgnViewerModal";
import type { Game, PrepSummary, PrepTree, PrepTreeNode } from "@/types";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function computePosition(path: string[]): string {
  const chess = new Chess();
  for (const san of path) {
    try {
      const r = chess.move(san);
      if (!r) break;
    } catch {
      break;
    }
  }
  return chess.fen();
}

function findChildren(tree: PrepTree, path: string[]): PrepTreeNode[] {
  let children = tree.children;
  for (const move of path) {
    const node = children.find((c) => c.move === move);
    if (!node) return [];
    children = node.children;
  }
  return children;
}

function moveLabel(index: number): string {
  const num = Math.floor(index / 2) + 1;
  return index % 2 === 0 ? `${num}.` : `${num}…`;
}

const SOURCE_META: Record<string, { label: string; dot: string }> = {
  chess_results: { label: "OTB", dot: "#f59e0b" },
  chess_com: { label: "Chess.com", dot: "#10b981" },
  lichess: { label: "Lichess", dot: "#8b5cf6" },
  pgn_import: { label: "PGN", dot: "#60a5fa" },
  manual: { label: "Manual", dot: "#9ca3af" },
};

function GameRow({ game, onOpen }: { game: Game; onOpen: (g: Game) => void }) {
  const t = useTheme();
  const meta = SOURCE_META[game.source] ?? { label: game.source, dot: "#9ca3af" };
  const isOnline = game.source === "chess_com" || game.source === "lichess";
  const dateStr = game.date_played ? new Date(game.date_played).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <Pressable
      onPress={() => (isOnline && game.source_url ? Linking.openURL(game.source_url) : onOpen(game))}
      style={[st.gameRow, { borderColor: t.border, backgroundColor: t.surface }]}
    >
      <View style={[st.dot, { backgroundColor: meta.dot }]} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }} numberOfLines={1}>
          vs {game.opponent_name}{game.opponent_rating ? ` (${game.opponent_rating})` : ""}
        </Text>
        <Text style={{ fontSize: 10, color: t.textFaint }} numberOfLines={1}>
          {meta.label}{dateStr ? ` · ${dateStr}` : ""}{game.opening_name ? ` · ${game.opening_name}` : ""}
        </Text>
      </View>
      <ColorBadge color={game.color_played} />
      <ResultBadge result={game.result} />
      <Ionicons name={isOnline ? "open-outline" : "chevron-forward"} size={13} color={t.textFaint} />
    </Pressable>
  );
}

function InteractivePrepTree({
  tree,
  orientation,
  totalGames,
  slug,
  color,
  source,
}: {
  tree: PrepTree;
  orientation: "white" | "black";
  totalGames: number;
  slug: string;
  color: "white" | "black";
  source?: string;
}) {
  const t = useTheme();
  const [path, setPath] = useState<string[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [gamesTotal, setGamesTotal] = useState(0);
  const [gamesPage, setGamesPage] = useState(1);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [viewerGame, setViewerGame] = useState<Game | null>(null);
  const [downloading, setDownloading] = useState(false);
  const fetchRef = useRef(0);

  const fen = computePosition(path);
  const nextMoves = findChildren(tree, path);
  const maxPct = nextMoves.length > 0 ? nextMoves[0].pct : 0;

  useEffect(() => {
    const id = ++fetchRef.current;
    setGamesLoading(true);
    api.getPrepGames(slug, path, color, 1, source).then((res) => {
      if (fetchRef.current !== id) return;
      setGames(res.results);
      setGamesTotal(res.count);
      setGamesPage(1);
    }).catch(() => {}).finally(() => { if (fetchRef.current === id) setGamesLoading(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  function loadMore() {
    const nextPage = gamesPage + 1;
    setGamesLoading(true);
    api.getPrepGames(slug, path, color, nextPage, source).then((res) => {
      setGames((prev) => [...prev, ...res.results]);
      setGamesPage(nextPage);
    }).catch(() => {}).finally(() => setGamesLoading(false));
  }

  async function handleDownload() {
    setDownloading(true);
    try { await api.downloadPrepGamesPgn(slug, path, color, source); } catch { /* ignore */ } finally { setDownloading(false); }
  }

  return (
    <View>
      {viewerGame && <PgnViewerModal game={viewerGame} onClose={() => setViewerGame(null)} />}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: "center", gap: 4, marginBottom: 10 }}>
        <Pressable onPress={() => setPath([])}>
          <Ionicons name="home-outline" size={14} color={t.textFaint} />
        </Pressable>
        {path.length === 0 ? (
          <Text style={{ fontSize: 11, color: t.textFaint }}>Starting position</Text>
        ) : (
          path.map((san, i) => (
            <Pressable key={i} onPress={() => setPath((p) => p.slice(0, i + 1))}>
              <Text style={{ fontSize: 12, color: t.text, fontFamily: "monospace" }}>
                <Text style={{ color: t.textFaint }}>{moveLabel(i)}</Text> {san}
              </Text>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={{ alignItems: "center", marginBottom: 16 }}>
        <ChessBoard fen={fen} orientation={orientation} size={260} />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ fontSize: 10, fontWeight: "700", color: t.textFaint, textTransform: "uppercase" }}>
          {nextMoves.length > 0 ? `${nextMoves.length} moves from here` : path.length === 0 ? "No data" : "End of tree"}
        </Text>
        {path.length > 0 && (
          <Pressable onPress={() => setPath((p) => p.slice(0, -1))} style={[st.backBtn, { borderColor: t.border }]}>
            <Ionicons name="arrow-back" size={12} color={t.textMuted} />
            <Text style={{ fontSize: 11, color: t.textMuted }}>Back</Text>
          </Pressable>
        )}
      </View>

      {nextMoves.length > 0 ? (
        <View style={{ gap: 8 }}>
          {nextMoves.map((node) => {
            const barWidth = maxPct > 0 ? (node.pct / maxPct) * 100 : 0;
            return (
              <Pressable key={node.move} onPress={() => setPath((p) => [...p, node.move])} style={[st.moveCard, { borderColor: t.border, backgroundColor: t.surface }]}>
                <Text style={{ width: 52, fontFamily: "monospace", fontSize: 15, fontWeight: "800", color: t.text }}>{node.move}</Text>
                <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: t.elevated, overflow: "hidden" }}>
                  <View style={{ width: `${barWidth}%`, height: "100%", backgroundColor: t.brand(500) }} />
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>{node.pct}%</Text>
                  <Text style={{ fontSize: 10, color: t.textFaint }}>{node.count}g</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={[st.emptyBox, { borderColor: t.border }]}>
          <Text style={{ fontSize: 12, color: t.textFaint }}>{path.length === 0 ? "No move data available." : "No further moves recorded at this depth."}</Text>
        </View>
      )}

      {totalGames > 0 && <Text style={{ textAlign: "right", fontSize: 10, color: t.textFaint, marginTop: 8 }}>{totalGames} total games</Text>}

      <View style={[st.gamesSection, { borderColor: t.border }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>
            {gamesLoading && games.length === 0 ? "Loading games…" : `${gamesTotal} game${gamesTotal !== 1 ? "s" : ""} in this line`}
          </Text>
          {gamesTotal > 0 && (
            <Pressable onPress={handleDownload} disabled={downloading} style={[st.downloadBtn, { borderColor: t.border }]}>
              <Ionicons name="download-outline" size={12} color={t.textMuted} />
              <Text style={{ fontSize: 10, color: t.textMuted }}>{downloading ? "Downloading…" : "Download PGN"}</Text>
            </Pressable>
          )}
        </View>

        {games.length > 0 ? (
          <View style={{ gap: 6 }}>
            {games.map((g) => <GameRow key={g.id} game={g} onOpen={setViewerGame} />)}
            {games.length < gamesTotal && (
              <Button title={gamesLoading ? "Loading…" : `Show more (${gamesTotal - games.length})`} variant="ghost" size="sm" onPress={loadMore} disabled={gamesLoading} style={{ alignSelf: "center", marginTop: 4 }} />
            )}
          </View>
        ) : !gamesLoading ? (
          <Text style={{ fontSize: 12, color: t.textFaint }}>No games recorded for this line.</Text>
        ) : (
          <ActivityIndicator color={t.brand(600)} />
        )}
      </View>
    </View>
  );
}

function TrendCard({ trend }: { trend: PrepSummary["trends"][number] }) {
  const t = useTheme();
  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>{trend.description}</Text>
          <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>{trend.color === "white" ? "White" : "Black"} · {trend.label}{trend.move}</Text>
        </View>
        <View style={{ backgroundColor: trend.confidence === "high" ? "#fef3c7" : "#f3f4f6", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: trend.confidence === "high" ? "#92400e" : "#4b5563" }}>{trend.confidence === "high" ? "Strong signal" : "Emerging"}</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: t.textFaint, textTransform: "uppercase" }}>Overall</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.elevated, marginTop: 3, overflow: "hidden" }}>
            <View style={{ width: `${trend.overall_pct}%`, height: "100%", backgroundColor: "#9ca3af" }} />
          </View>
          <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{trend.overall_pct}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 9, color: t.textFaint, textTransform: "uppercase" }}>Recent</Text>
          <View style={{ height: 6, borderRadius: 3, backgroundColor: t.elevated, marginTop: 3, overflow: "hidden" }}>
            <View style={{ width: `${trend.recent_pct}%`, height: "100%", backgroundColor: t.brand(500) }} />
          </View>
          <Text style={{ fontSize: 11, fontWeight: "600", color: t.text, marginTop: 2 }}>{trend.recent_pct}%</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 9, color: t.textFaint, textTransform: "uppercase" }}>Shift</Text>
          <Text style={{ fontSize: 13, fontWeight: "800", color: "#d97706", marginTop: 3 }}>+{trend.delta}pp</Text>
        </View>
      </View>
    </Card>
  );
}

type SourceFilter = "all" | "otb";

export function PrepSummaryPanel({ slug }: { slug: string }) {
  const t = useTheme();
  const [data, setData] = useState<PrepSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [colorTab, setColorTab] = useState<"white" | "black">("white");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const source = sourceFilter === "otb" ? "chess_results" : undefined;
    api.getPrepSummary(slug, source).then(setData).catch((err) => setError(err.message ?? "Failed to load.")).finally(() => setLoading(false));
  }, [slug, sourceFilter]);

  if (loading) return <ActivityIndicator color={t.brand(600)} style={{ paddingVertical: 30 }} />;
  if (error) return <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>;
  if (!data) return null;

  const { meta, as_white, as_black, trends } = data;

  return (
    <View style={{ gap: 18 }}>
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14, alignItems: "center" }}>
          <View>
            <Text style={{ fontSize: 10, color: t.textFaint, textTransform: "uppercase" }}>Games analyzed</Text>
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>{meta.total_games}</Text>
          </View>
          <View style={[st.sourceToggle, { borderColor: t.border, backgroundColor: t.elevated }]}>
            {(["all", "otb"] as SourceFilter[]).map((opt) => (
              <Pressable key={opt} onPress={() => setSourceFilter(opt)} style={[st.sourceToggleBtn, sourceFilter === opt ? { backgroundColor: t.surface } : null]}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: sourceFilter === opt ? t.text : t.textMuted }}>{opt === "all" ? "All games" : "OTB only"}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Card>

      {meta.total_games === 0 ? (
        <Text style={{ textAlign: "center", color: t.textFaint, fontSize: 13, paddingVertical: 40 }}>
          {sourceFilter === "otb" ? "No OTB games with move data. Try All games." : "No move data yet. Import games with move text first."}
        </Text>
      ) : (
        <>
          <View style={[st.colorTabs, { borderColor: t.border, backgroundColor: t.elevated }]}>
            {(["white", "black"] as const).map((color) => {
              const count = color === "white" ? as_white.total : as_black.total;
              return (
                <Pressable key={color} onPress={() => setColorTab(color)} style={[st.colorTab, colorTab === color ? { backgroundColor: t.surface } : null]}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colorTab === color ? t.text : t.textMuted }}>As {color === "white" ? "White" : "Black"} ({count})</Text>
                </Pressable>
              );
            })}
          </View>

          <Card style={{ padding: 16 }}>
            {colorTab === "white" ? (
              as_white.total === 0 ? <Text style={{ textAlign: "center", color: t.textFaint, paddingVertical: 20 }}>No games as White.</Text> :
              <InteractivePrepTree key={`w-${sourceFilter}`} tree={as_white.opening_tree} orientation="white" totalGames={as_white.total} slug={slug} color="white" source={sourceFilter === "otb" ? "chess_results" : undefined} />
            ) : (
              as_black.total === 0 ? <Text style={{ textAlign: "center", color: t.textFaint, paddingVertical: 20 }}>No games as Black.</Text> :
              <InteractivePrepTree key={`b-${sourceFilter}`} tree={as_black.opening_tree} orientation="black" totalGames={as_black.total} slug={slug} color="black" source={sourceFilter === "otb" ? "chess_results" : undefined} />
            )}
          </Card>

          {trends.length > 0 && (
            <View>
              <Text style={{ fontSize: 15, fontWeight: "700", color: t.text, marginBottom: 2 }}>Recent trends</Text>
              <Text style={{ fontSize: 11, color: t.textFaint, marginBottom: 10 }}>Comparing the most recent 15 games against the full dataset.</Text>
              <View style={{ gap: 10 }}>
                {trends.map((tr, i) => <TrendCard key={i} trend={tr} />)}
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  gameRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  dot: { height: 7, width: 7, borderRadius: 4 },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  moveCard: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  emptyBox: { borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderRadius: 10, paddingVertical: 30, alignItems: "center" },
  gamesSection: { borderTopWidth: StyleSheet.hairlineWidth, marginTop: 20, paddingTop: 16 },
  downloadBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  sourceToggle: { flexDirection: "row", borderRadius: 8, padding: 3, gap: 3, borderWidth: StyleSheet.hairlineWidth },
  sourceToggleBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  colorTabs: { flexDirection: "row", alignSelf: "flex-start", borderRadius: 10, padding: 4, gap: 4, borderWidth: StyleSheet.hairlineWidth },
  colorTab: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
});
