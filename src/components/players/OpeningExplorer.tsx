import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { PgnViewerModal } from "./PgnViewerModal";
import { MasterGameViewerModal } from "./MasterGameViewerModal";
import type { ColorChoice, ExplorerDbGame, Game, GameSource, MasterGame } from "@/types";

function WDBBar({ white, draw, black, playerColor }: { white: number; draw: number; black: number; playerColor: ColorChoice }) {
  return (
    <View>
      <View style={{ flexDirection: "row", height: 26, borderRadius: 8, overflow: "hidden" }}>
        {white > 0 && <View style={{ width: `${white}%`, backgroundColor: "#d1d5db" }} />}
        {draw > 0 && <View style={{ width: `${draw}%`, backgroundColor: "#9ca3af" }} />}
        {black > 0 && <View style={{ width: `${black}%`, backgroundColor: "#374151" }} />}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: playerColor === "white" ? "700" : "400" }}>{white}% White</Text>
        <Text style={{ fontSize: 11, color: "#6b7280" }}>{draw}% Draw</Text>
        <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: playerColor === "black" ? "700" : "400" }}>{black}% Black</Text>
      </View>
    </View>
  );
}

function toGameObject(g: ExplorerDbGame): Game {
  return {
    id: g.id, public_id: g.public_id, event: g.event, site: "", round: g.round, date_played: g.date_played,
    opponent_name: g.opponent_name, opponent_rating: g.opponent_rating ?? null,
    color_played: g.color_played, result: g.result, eco_code: null,
    opening_name: g.opening_name || null, opening_family: null, num_moves: null,
    time_control: null, moves_preview: "", source: "chess_results" as GameSource,
    source_url: null, notes: null,
  };
}

export function OpeningExplorer({
  slug,
  ecoCode,
  openingName,
  playerColor,
}: {
  slug: string;
  ecoCode: string;
  openingName: string;
  playerColor: ColorChoice;
}) {
  const t = useTheme();
  const [data, setData] = useState<Awaited<ReturnType<typeof api.getOpeningExplorer>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllMoves, setShowAllMoves] = useState(false);
  const [viewingGame, setViewingGame] = useState<Game | null>(null);
  const [masterGames, setMasterGames] = useState<MasterGame[]>([]);
  const [masterLoading, setMasterLoading] = useState(true);
  const [viewingMasterGame, setViewingMasterGame] = useState<MasterGame | null>(null);
  const [gamesTab, setGamesTab] = useState<"gm" | "recent">("gm");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.getOpeningExplorer(slug, ecoCode, openingName)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message ?? "Failed to load explorer."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, ecoCode, openingName]);

  useEffect(() => {
    let cancelled = false;
    setMasterLoading(true);
    api.getMasterGames({ eco: ecoCode, limit: 10 })
      .then((games) => { if (!cancelled) setMasterGames(games); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setMasterLoading(false); });
    return () => { cancelled = true; };
  }, [ecoCode]);

  if (loading) return <ActivityIndicator color={t.brand(600)} style={{ paddingVertical: 20 }} />;
  if (error) return <Text style={{ color: t.danger, fontSize: 12, padding: 14 }}>{error}</Text>;
  if (!data) return null;

  const { db_stats, engine_moves, top_games, lichess_opening_url } = data;
  const hasStats = db_stats.total > 0;
  const visibleMoves = showAllMoves ? engine_moves : engine_moves.slice(0, 3);

  return (
    <View style={{ padding: 14, gap: 18 }}>
      {viewingGame && <PgnViewerModal game={viewingGame} onClose={() => setViewingGame(null)} />}
      {viewingMasterGame && <MasterGameViewerModal game={viewingMasterGame} onClose={() => setViewingMasterGame(null)} />}

      <View>
        <Text style={[st.sectionLabel, { color: t.textFaint }]}>
          In this tracker · {hasStats ? `${db_stats.total} games` : "no games yet"}
        </Text>
        {hasStats ? (
          <WDBBar white={db_stats.white_pct} draw={db_stats.draw_pct} black={db_stats.black_pct} playerColor={playerColor} />
        ) : (
          <Text style={{ fontSize: 12, color: t.textFaint }}>No games with this opening imported yet.</Text>
        )}
      </View>

      {engine_moves.length > 0 && (
        <View>
          <Text style={[st.sectionLabel, { color: t.textFaint }]}>Theory — best moves</Text>
          <View style={{ gap: 4 }}>
            {visibleMoves.map((mv, i) => {
              const winrate = mv.winrate ? parseFloat(mv.winrate) : null;
              const cp = mv.score !== null ? ((mv.score / 100 >= 0 ? "+" : "") + (mv.score / 100).toFixed(2)) : "";
              return (
                <View key={mv.uci || mv.san} style={[st.moveRow, i === 0 ? { backgroundColor: t.brand(50) } : { backgroundColor: t.surface }]}>
                  <Text style={{ width: 40, fontWeight: "800", fontSize: 13, color: i === 0 ? t.brand(700) : t.text }}>{mv.san}</Text>
                  {winrate !== null && (
                    <View style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: t.elevated, overflow: "hidden" }}>
                      <View style={{ width: `${Math.min(100, winrate)}%`, height: "100%", backgroundColor: "#34d399" }} />
                    </View>
                  )}
                  {winrate !== null && <Text style={{ width: 32, textAlign: "right", fontSize: 11, color: t.textMuted }}>{winrate.toFixed(0)}%</Text>}
                  {cp && <Text style={{ fontSize: 11, color: (mv.score ?? 0) > 0 ? t.success : (mv.score ?? 0) < 0 ? t.danger : t.textFaint }}>{cp}</Text>}
                  {i === 0 && (
                    <View style={{ backgroundColor: t.brand(100), borderRadius: 999, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: "700", color: t.brand(700) }}>Best</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          {engine_moves.length > 3 && (
            <Pressable onPress={() => setShowAllMoves((v) => !v)}>
              <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 6 }}>
                {showAllMoves ? "Show fewer moves" : `+${engine_moves.length - 3} more moves`}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      <View>
        <View style={[st.tabBar, { backgroundColor: t.elevated }]}>
          <Pressable onPress={() => setGamesTab("gm")} style={[st.tabBtn, gamesTab === "gm" ? { backgroundColor: t.surface } : null]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: gamesTab === "gm" ? t.text : t.textMuted }}>
              GM Games {!masterLoading ? `(${masterGames.length})` : ""}
            </Text>
          </Pressable>
          <Pressable onPress={() => setGamesTab("recent")} style={[st.tabBtn, gamesTab === "recent" ? { backgroundColor: t.surface } : null]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: gamesTab === "recent" ? t.text : t.textMuted }}>
              Recent Games ({top_games.length})
            </Text>
          </Pressable>
        </View>

        {gamesTab === "gm" && (
          masterLoading ? (
            <ActivityIndicator color={t.brand(600)} style={{ marginTop: 10 }} />
          ) : masterGames.length > 0 ? (
            <View style={[st.gameList, { backgroundColor: t.elevated }]}>
              {masterGames.map((g) => (
                <Pressable key={g.id} onPress={() => g.moves?.trim() && setViewingMasterGame(g)} style={st.gameRow}>
                  <Text style={{ fontSize: 11, color: t.textMuted, flex: 1 }} numberOfLines={1}>
                    {g.white} vs {g.black} {g.year ? `· ${g.year}` : ""}
                  </Text>
                  <Ionicons name="chevron-forward" size={13} color={t.textFaint} />
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: t.textFaint, paddingVertical: 12, textAlign: "center" }}>No GM games for this opening yet.</Text>
          )
        )}

        {gamesTab === "recent" && (
          top_games.length > 0 ? (
            <View style={[st.gameList, { backgroundColor: t.elevated }]}>
              {top_games.map((g) => (
                <Pressable key={g.id} onPress={() => g.pgn_available && setViewingGame(toGameObject(g))} style={st.gameRow}>
                  <Text style={{ fontSize: 11, color: t.textMuted, flex: 1 }} numberOfLines={1}>
                    {g.player_name} vs {g.opponent_name} {g.date_played ? `· ${g.date_played.slice(0, 4)}` : ""}
                  </Text>
                  {g.pgn_available && <Ionicons name="chevron-forward" size={13} color={t.textFaint} />}
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: t.textFaint, paddingVertical: 12, textAlign: "center" }}>No games in this line yet.</Text>
          )
        )}
      </View>

      <Pressable onPress={() => Linking.openURL(lichess_opening_url)} style={[st.lichessBtn, { borderColor: "#b05000" }]}>
        <Ionicons name="open-outline" size={13} color="#b05000" />
        <Text style={{ fontSize: 11, fontWeight: "600", color: "#b05000" }}>Open on Lichess</Text>
      </Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  sectionLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  moveRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  tabBar: { flexDirection: "row", borderRadius: 8, padding: 3, gap: 3, marginBottom: 8 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 6 },
  gameList: { borderRadius: 8, overflow: "hidden" },
  gameRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  lichessBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingVertical: 8 },
});
