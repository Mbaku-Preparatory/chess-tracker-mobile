import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useAppSelector } from "@/redux/hooks";
import { getPreparedPlayerImportHref, prepareOpponent } from "@/lib/prepareOpponent";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";
import type { TournamentPlayer } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "TournamentPlayers">;
type SortOption = "rating_desc" | "rating_asc" | "rank_asc" | "name_asc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "rating_desc", label: "Rating ↓" },
  { value: "rating_asc", label: "Rating ↑" },
  { value: "rank_asc", label: "Rank" },
  { value: "name_asc", label: "Name" },
];

function cmp(a: number | null, b: number | null, dir: "asc" | "desc") {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return dir === "asc" ? a - b : b - a;
}

function sortPlayers(players: TournamentPlayer[], sortBy: SortOption): TournamentPlayer[] {
  return [...players].sort((a, b) => {
    if (sortBy === "rating_desc") return cmp(a.rating, b.rating, "desc") || cmp(a.rank, b.rank, "asc") || a.name.localeCompare(b.name);
    if (sortBy === "rating_asc") return cmp(a.rating, b.rating, "asc") || cmp(a.rank, b.rank, "asc") || a.name.localeCompare(b.name);
    if (sortBy === "rank_asc") return cmp(a.rank, b.rank, "asc") || cmp(a.rating, b.rating, "desc") || a.name.localeCompare(b.name);
    return a.name.localeCompare(b.name);
  });
}

export function TournamentPlayersScreen({ navigation }: Props) {
  const t = useTheme();
  const { active } = useAppSelector((s) => s.tournament);

  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("rating_desc");
  const [preparingSnr, setPreparingSnr] = useState<string | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);

  const isChessResults = (active?.url ?? "").includes("chess-results.com");

  useEffect(() => {
    setPlayers(active?.players_data ?? []);
  }, [active?.players_data]);

  async function refresh() {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.refreshTournamentPlayers(active.id);
      setPlayers(updated.players_data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to refresh players");
    } finally {
      setLoading(false);
    }
  }

  async function handlePrepare(player: TournamentPlayer) {
    setPreparingSnr(player.snr);
    setPrepError(null);
    try {
      const slug = await prepareOpponent(player);
      const href = getPreparedPlayerImportHref(slug);
      const source = href.includes("source=") ? (href.split("source=")[1] as any) : undefined;
      navigation.navigate("PlayerImport", { slug, source });
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : "Failed to open prep");
      setPreparingSnr(null);
    }
  }

  const visiblePlayers = sortPlayers(
    search.trim()
      ? players.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()) || (p.federation ?? "").toLowerCase().includes(search.toLowerCase()))
      : players,
    sortBy
  );

  return (
    <Screen>
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 11, fontWeight: "700", color: t.brand(600), textTransform: "uppercase" }}>Tournament Mode</Text>
        <Text style={{ fontSize: 22, fontWeight: "800", color: t.text, marginTop: 2 }}>{active?.name ?? "Tournament Players"}</Text>
        {active?.url && (
          <Pressable onPress={() => Linking.openURL(active.url)}>
            <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }} numberOfLines={1}>{active.url}</Text>
          </Pressable>
        )}
        <Button title={loading ? "Refreshing…" : "Refresh"} variant="secondary" size="sm" loading={loading} onPress={refresh} style={{ marginTop: 10, alignSelf: "flex-start" }} />
      </View>

      {!isChessResults && (
        <View style={[st.warnBox, { borderColor: "rgba(217,119,6,0.4)", backgroundColor: t.warningBg }]}>
          <Text style={{ fontSize: 12, color: t.warning }}>This tournament does not have a chess-results.com URL. Add one to enable player fetching.</Text>
        </View>
      )}

      {error && <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}><Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text></View>}
      {prepError && <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}><Text style={{ color: t.danger, fontSize: 12 }}>{prepError}</Text></View>}

      {loading && <ActivityIndicator color={t.brand(600)} style={{ marginTop: 20 }} />}

      {!loading && players.length > 0 && (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or federation…"
              placeholderTextColor={t.textFaint}
              style={[st.search, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
            />
            <Text style={{ fontSize: 12, color: t.textMuted }}>{visiblePlayers.length} players</Text>
          </View>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
            {SORT_OPTIONS.map((o) => (
              <Pressable key={o.value} onPress={() => setSortBy(o.value)} style={[st.sortChip, { backgroundColor: sortBy === o.value ? t.brand(600) : t.elevated }]}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: sortBy === o.value ? "#fff" : t.textMuted }}>{o.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={{ gap: 8 }}>
            {visiblePlayers.map((player) => (
              <Card key={player.snr} style={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
                {player.rank != null && <Text style={{ width: 24, textAlign: "right", fontSize: 12, color: t.textFaint }}>{player.rank}</Text>}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>{player.name}</Text>
                    {player.rating != null && (
                      <View style={{ backgroundColor: t.elevated, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 10, color: t.textMuted }}>{player.rating}</Text>
                      </View>
                    )}
                    {player.federation && <Text style={{ fontSize: 11, color: t.textFaint }}>{player.federation}</Text>}
                  </View>
                  {player.score != null && <Text style={{ fontSize: 10, color: t.textFaint, marginTop: 2 }}>{player.score} pts</Text>}
                </View>
                <Button
                  title={preparingSnr === player.snr ? "Opening…" : "Prepare →"}
                  size="sm"
                  loading={preparingSnr === player.snr}
                  disabled={!!preparingSnr}
                  onPress={() => handlePrepare(player)}
                />
              </Card>
            ))}
          </View>

          {visiblePlayers.length === 0 && <Text style={{ textAlign: "center", fontSize: 12, color: t.textFaint, marginTop: 20 }}>No players match your search.</Text>}
        </>
      )}

      {!loading && !error && isChessResults && players.length === 0 && (
        <View style={{ alignItems: "center", marginTop: 30, gap: 10 }}>
          <Text style={{ fontSize: 12, color: t.textMuted, textAlign: "center" }}>No players found. Try refreshing — the standings may not have been available when the tournament was created.</Text>
          <Button title="Refresh now" variant="secondary" size="sm" onPress={refresh} />
        </View>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  warnBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 14 },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, marginBottom: 10 },
  search: { flex: 1, minWidth: 180, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 40, fontSize: 13 },
  sortChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
