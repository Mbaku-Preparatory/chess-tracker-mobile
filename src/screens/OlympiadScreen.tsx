import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/SectionContainer";
import { SearchInput } from "@/components/ui/SearchInput";
import { useTheme } from "@/theme/ThemeContext";
import type { OlympiadFilters, OlympiadGame } from "@/types";

/**
 * The Chess Olympiad archive.
 *
 * Filtered by country and round, because that is how a team event is actually
 * navigated — "how did Kenya do in round 3" is the question, not "show me the
 * Najdorf". Openings already have their own place; this does not duplicate it.
 *
 * The filter values come from the server rather than being hardcoded, so the
 * country row only ever offers federations that actually played. A list of two
 * hundred codes where most return nothing is worse than no list.
 */

const RESULT_LABEL: Record<string, string> = {
  "1-0": "1–0",
  "0-1": "0–1",
  "1/2-1/2": "½–½",
};

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        st.chip,
        {
          borderColor: selected ? t.brand(600) : t.border,
          backgroundColor: selected ? t.brand(600) : t.surface,
        },
      ]}
    >
      <Text style={{ fontSize: 13, fontWeight: "600", color: selected ? "#fff" : t.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

function FilterRow({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string | null;
  onSelect: (value: string | null) => void;
}) {
  const t = useTheme();
  if (values.length === 0) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[st.filterLabel, { color: t.textFaint }]}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chipRow}>
        {/* "All" is a chip rather than a clear button so that clearing one
            filter never looks like clearing the lot. */}
        <Chip label="All" selected={selected === null} onPress={() => onSelect(null)} />
        {values.map((v) => (
          <Chip key={v} label={v} selected={selected === v} onPress={() => onSelect(v)} />
        ))}
      </ScrollView>
    </View>
  );
}

function GameRow({ game }: { game: OlympiadGame }) {
  const t = useTheme();
  // A dash, never a guess: TWIC-sourced rows genuinely have no federation.
  const fed = (code: string) => (code ? code : "—");
  return (
    <View style={[st.row, { borderColor: t.border, backgroundColor: t.surface }]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[st.players, { color: t.text }]}>
          {game.white} <Text style={{ color: t.textFaint }}>({fed(game.white_federation)})</Text>
        </Text>
        <Text numberOfLines={1} style={[st.players, { color: t.text }]}>
          {game.black} <Text style={{ color: t.textFaint }}>({fed(game.black_federation)})</Text>
        </Text>
        <Text numberOfLines={1} style={[st.meta, { color: t.textMuted }]}>
          {[game.year, game.round ? `Round ${game.round}` : null, game.eco, game.opening_name]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      <Text style={[st.result, { color: t.textMuted }]}>
        {RESULT_LABEL[game.result] ?? game.result}
      </Text>
    </View>
  );
}

export function OlympiadScreen() {
  const t = useTheme();
  const [filters, setFilters] = useState<OlympiadFilters | null>(null);
  const [games, setGames] = useState<OlympiadGame[]>([]);
  const [count, setCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState<number | null>(null);
  const [federation, setFederation] = useState<string | null>(null);
  const [round, setRound] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api
      .getOlympiadFilters()
      .then(setFilters)
      .catch((err) => setError(userMessage(err, "Couldn't load the Olympiad archive.")));
  }, []);

  const load = useCallback(
    async (nextPage: number) => {
      nextPage === 1 ? setLoading(true) : setLoadingMore(true);
      setError(null);
      try {
        const body = await api.getOlympiadGames({ year, federation, round, search, page: nextPage });
        setGames((prev) => (nextPage === 1 ? body.results : [...prev, ...body.results]));
        setCount(body.count);
        setHasMore(body.has_more);
        setPage(body.page);
      } catch (err) {
        setError(userMessage(err, "Couldn't load those games."));
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [year, federation, round, search]
  );

  // Any filter change resets to the first page. Keeping the page number across
  // a change lands the reader on page 4 of a three-page result and looks empty.
  useEffect(() => {
    load(1);
  }, [load]);

  const years = (filters?.events ?? []).map((e) => String(e.year));
  const uniqueYears = Array.from(new Set(years));

  return (
    <Screen>
      <PageHeader
        title="Olympiad"
        subtitle={
          filters
            ? `${filters.total_games.toLocaleString()} games from ${filters.events.length} events`
            : "Chess Olympiad archive"
        }
      />

      <SearchInput
        placeholder="Search a player…"
        onSearch={setSearch}
        style={{ marginBottom: 14 }}
      />

      <FilterRow
        label="COUNTRY"
        values={filters?.federations ?? []}
        selected={federation}
        onSelect={setFederation}
      />
      <FilterRow label="ROUND" values={filters?.rounds ?? []} selected={round} onSelect={setRound} />
      <FilterRow
        label="YEAR"
        values={uniqueYears}
        selected={year === null ? null : String(year)}
        onSelect={(v) => setYear(v === null ? null : Number(v))}
      />

      {error && <Text style={{ color: t.danger, marginBottom: 12 }}>{error}</Text>}

      {loading ? (
        <ListSkeleton />
      ) : games.length === 0 ? (
        <EmptyState
          title="No games match"
          description="Try a different country or round."
        />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => <GameRow game={item} />}
          ListHeaderComponent={
            <Text style={[st.count, { color: t.textFaint }]}>
              {count.toLocaleString()} game{count === 1 ? "" : "s"}
            </Text>
          }
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (hasMore && !loadingMore) load(page + 1);
          }}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={t.brand(600)} /> : null
          }
        />
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  filterLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 6 },
  chipRow: { gap: 8, paddingRight: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  players: { fontSize: 14, fontWeight: "600" },
  meta: { marginTop: 4, fontSize: 12 },
  result: { fontSize: 15, fontWeight: "700" },
  count: { fontSize: 12, marginBottom: 8 },
});
