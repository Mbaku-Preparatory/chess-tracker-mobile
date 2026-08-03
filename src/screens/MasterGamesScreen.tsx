import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { MasterGameViewerModal } from "@/components/players/MasterGameViewerModal";
import type { MasterGame, TournamentSummary } from "@/types";

const RESULT_COLOR: Record<string, string> = { "1-0": "#059669", "0-1": "#ef4444", "1/2-1/2": "#d97706" };
const RESULT_LABEL: Record<string, string> = { "1-0": "1-0", "0-1": "0-1", "1/2-1/2": "½-½" };

function TournamentCard({ t: tour, onPress }: { t: TournamentSummary; onPress: () => void }) {
  const t = useTheme();
  const yearLabel = tour.year_min === tour.year_max ? String(tour.year_max ?? "") : `${tour.year_min}–${tour.year_max}`;
  return (
    <Pressable onPress={onPress}>
      <Card style={{ padding: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: t.text }} numberOfLines={1}>{tour.event}</Text>
          <View style={[st.twicPill, { borderColor: "rgba(14,165,233,0.4)", backgroundColor: "rgba(14,165,233,0.08)" }]}>
            <Text style={{ fontSize: 9, fontWeight: "700", color: "#0369a1" }}>TWIC</Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 }}>
          <Text style={{ fontSize: 11, color: t.textMuted }}>{yearLabel}</Text>
          <View style={[st.countPill, { backgroundColor: t.elevated }]}>
            <Text style={{ fontSize: 10, fontWeight: "600", color: t.textMuted }}>{tour.game_count}g</Text>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

function GameRow({ game, onPress }: { game: MasterGame; onPress: () => void }) {
  const t = useTheme();
  const hasMoves = Boolean(game.moves?.trim());
  return (
    <Pressable onPress={onPress} disabled={!hasMoves} style={{ opacity: hasMoves ? 1 : 0.6 }}>
      <Card style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Text style={{ width: 30, fontFamily: "monospace", fontWeight: "800", fontSize: 12, color: RESULT_COLOR[game.result] ?? t.textMuted }}>
          {RESULT_LABEL[game.result] ?? game.result}
        </Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }} numberOfLines={1}>
            {game.white}{game.white_elo ? ` (${game.white_elo})` : ""} vs {game.black}{game.black_elo ? ` (${game.black_elo})` : ""}
          </Text>
          {game.opening_name && <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }} numberOfLines={1}>{game.eco} · {game.opening_name}</Text>}
        </View>
        {game.year && <Text style={{ fontSize: 11, color: t.textFaint }}>{game.year}</Text>}
        {hasMoves && <Ionicons name="chevron-forward" size={14} color={t.textFaint} />}
      </Card>
    </Pressable>
  );
}

export function MasterGamesScreen() {
  const t = useTheme();
  const PAGE_SIZE = 20;

  const [search, setSearch] = useState("");
  const [tournaments, setTournaments] = useState<TournamentSummary[]>([]);
  const [tourLoading, setTourLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<TournamentSummary | null>(null);
  const [games, setGames] = useState<MasterGame[]>([]);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [viewingGame, setViewingGame] = useState<MasterGame | null>(null);

  useEffect(() => {
    setTourLoading(true);
    api.getTournamentList(search || undefined, 80).then(setTournaments).catch(() => setTournaments([])).finally(() => setTourLoading(false));
  }, [search]);

  useEffect(() => {
    if (!selected) { setGames([]); return; }
    setGamesLoading(true);
    api.getMasterGames({ event: selected.event, limit: 100 }).then(setGames).catch(() => setGames([])).finally(() => setGamesLoading(false));
  }, [selected]);

  const totalGames = tournaments.reduce((s, tr) => s + tr.game_count, 0);

  return (
    <Screen>
      {viewingGame && <MasterGameViewerModal game={viewingGame} onClose={() => setViewingGame(null)} />}

      {!selected ? (
        <View>
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: t.brand(600), textTransform: "uppercase", letterSpacing: 1 }}>GM Library</Text>
            <Text style={{ fontSize: 24, fontWeight: "800", color: t.text, marginTop: 2 }}>Tournaments</Text>
            <Text style={{ fontSize: 13, color: t.textMuted, marginTop: 4 }}>Browse major chess tournaments and play through GM games</Text>
          </View>

          <View style={[st.infoBox, { borderColor: "rgba(14,165,233,0.3)", backgroundColor: "rgba(14,165,233,0.06)" }]}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#075985" }}>What is TWIC?</Text>
            <Text style={{ fontSize: 11, color: "#0369a1", marginTop: 4, lineHeight: 16 }}>
              The Week in Chess is a free weekly publication covering major chess tournaments worldwide since 1994. This library contains {totalGames.toLocaleString()} GM classical games from the 2024–2026 archives.
            </Text>
          </View>

          <SearchInput placeholder="Search — Tata Steel, Candidates, Bundesliga…" onSearch={(q) => { setSearch(q); setSelected(null); setVisible(PAGE_SIZE); }} defaultValue={search} style={{ marginBottom: 6 }} />
          <Text style={{ fontSize: 11, color: t.textFaint, marginBottom: 14 }}>{tournaments.length} tournaments · updated weekly</Text>

          {tourLoading ? (
            <ActivityIndicator color={t.brand(600)} />
          ) : tournaments.length === 0 ? (
            <EmptyState title="No tournaments found" />
          ) : (
            <View style={{ gap: 8 }}>
              {tournaments.slice(0, visible).map((tour) => (
                <TournamentCard key={tour.event} t={tour} onPress={() => setSelected(tour)} />
              ))}
              {visible < tournaments.length && (
                <Button title={`Show ${Math.min(20, tournaments.length - visible)} more`} variant="secondary" size="sm" onPress={() => setVisible((v) => v + 20)} style={{ alignSelf: "center", marginTop: 6 }} />
              )}
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => setSelected(null)} style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 12 }}>
            <Ionicons name="chevron-back" size={16} color={t.brand(600)} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.brand(600) }}>All tournaments</Text>
          </Pressable>
          <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }} numberOfLines={2}>{selected.event}</Text>
          <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2, marginBottom: 14 }}>
            {selected.year_min === selected.year_max ? selected.year_max : `${selected.year_min}–${selected.year_max}`} · {selected.game_count} games
          </Text>

          {gamesLoading ? (
            <ActivityIndicator color={t.brand(600)} />
          ) : games.length === 0 ? (
            <EmptyState title="No games found for this tournament." />
          ) : (
            <View style={{ gap: 8, flex: 1 }}>
              {games.map((g) => (
                <GameRow key={g.id} game={g} onPress={() => g.moves?.trim() && setViewingGame(g)} />
              ))}
              {games.length >= 100 && <Text style={{ textAlign: "center", fontSize: 11, color: t.textFaint, paddingTop: 6 }}>Showing top 100 by rating.</Text>}
            </View>
          )}
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  twicPill: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 6, paddingVertical: 2 },
  countPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  infoBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 14 },
});
