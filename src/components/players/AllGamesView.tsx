import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { GamesTable } from "./GamesTable";
import { Button } from "@/components/ui/Button";
import type { ColorChoice, Game, GameResult, GameSource, PaginatedResponse } from "@/types";

const SOURCE_OPTIONS: { value: GameSource | ""; label: string }[] = [
  { value: "", label: "All sources" },
  { value: "chess_results", label: "OTB" },
  { value: "chess_com", label: "Chess.com" },
  { value: "lichess", label: "Lichess" },
  { value: "pgn_import", label: "PGN import" },
  { value: "manual", label: "Manual" },
];

const RESULT_OPTIONS: { value: GameResult | ""; label: string }[] = [
  { value: "", label: "All results" },
  { value: "win", label: "Wins" },
  { value: "draw", label: "Draws" },
  { value: "loss", label: "Losses" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [
  { value: "", label: "All years" },
  ...Array.from({ length: CURRENT_YEAR - 2009 }, (_, i) => String(CURRENT_YEAR - i)).map((y) => ({ value: y, label: y })),
];

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={[st.chip, { backgroundColor: active ? t.brand(600) : t.elevated }]}>
      <Text style={{ fontSize: 11, fontWeight: "600", color: active ? "#fff" : t.textMuted }}>{label}</Text>
    </Pressable>
  );
}

export function AllGamesView({ slug }: { slug: string }) {
  const t = useTheme();
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [colorFilter, setColorFilter] = useState<ColorChoice | "">("");
  const [resultFilter, setResultFilter] = useState<GameResult | "">("");
  const [sourceFilter, setSourceFilter] = useState<GameSource | "">("");
  const [yearFilter, setYearFilter] = useState("");
  const [search, setSearch] = useState("");

  function handleGameDeleted(gameId: number) {
    setGames((prev) => prev.filter((g) => g.id !== gameId));
    setTotal((prev) => prev - 1);
  }

  useEffect(() => {
    setPage(1);
  }, [colorFilter, resultFilter, sourceFilter, yearFilter, search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .getPlayerGames(slug, {
        ...(colorFilter ? { color_played: colorFilter } : {}),
        ...(resultFilter ? { result: resultFilter } : {}),
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(yearFilter ? { year: yearFilter } : {}),
        ...(search ? { search } : {}),
        page,
      })
      .then((data: PaginatedResponse<Game>) => {
        setGames(data.results);
        setTotal(data.count);
      })
      .catch(() => setError("Failed to load games."))
      .finally(() => setLoading(false));
  }, [slug, colorFilter, resultFilter, sourceFilter, yearFilter, search, page]);

  const totalPages = Math.ceil(total / 20);
  const hasActiveFilters = Boolean(colorFilter || resultFilter || sourceFilter || yearFilter || search);

  return (
    <View>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search opponent, event, opening…"
        placeholderTextColor={t.textFaint}
        style={[st.search, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 10 }}>
        {(["", "white", "black"] as const).map((c) => (
          <Chip key={c} label={c === "" ? "All colors" : c === "white" ? "As White" : "As Black"} active={colorFilter === c} onPress={() => setColorFilter(c)} />
        ))}
        <View style={[st.sep, { backgroundColor: t.border }]} />
        {RESULT_OPTIONS.map((r) => (
          <Chip key={r.value} label={r.label} active={resultFilter === r.value} onPress={() => setResultFilter(r.value)} />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 10 }}>
        {SOURCE_OPTIONS.map((o) => (
          <Chip key={o.value} label={o.label} active={sourceFilter === o.value} onPress={() => setSourceFilter(o.value)} />
        ))}
        <View style={[st.sep, { backgroundColor: t.border }]} />
        {YEAR_OPTIONS.slice(0, 8).map((o) => (
          <Chip key={o.value} label={o.label} active={yearFilter === o.value} onPress={() => setYearFilter(o.value)} />
        ))}
      </ScrollView>

      {!loading && (
        <Text style={{ fontSize: 11, color: t.textFaint, marginBottom: 10 }}>{total} game{total !== 1 ? "s" : ""}</Text>
      )}

      {error ? (
        <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
      ) : loading ? (
        <ActivityIndicator color={t.brand(600)} style={{ marginTop: 20 }} />
      ) : games.length > 0 ? (
        <>
          <GamesTable games={games} onDeleted={handleGameDeleted} />
          {totalPages > 1 && (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 16 }}>
              <Button title="Prev" size="sm" variant="secondary" disabled={page <= 1} onPress={() => setPage((p) => p - 1)} />
              <Text style={{ fontSize: 12, color: t.textMuted }}>Page {page} of {totalPages}</Text>
              <Button title="Next" size="sm" variant="secondary" disabled={page >= totalPages} onPress={() => setPage((p) => p + 1)} />
            </View>
          )}
        </>
      ) : (
        <Text style={{ textAlign: "center", color: t.textFaint, fontSize: 13, paddingVertical: 40 }}>
          {hasActiveFilters ? "No games match the current filters." : "No games found."}
        </Text>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  chip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 999 },
  sep: { width: StyleSheet.hairlineWidth, height: 20, alignSelf: "center", marginHorizontal: 2 },
});
