import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { federationFor, federationsFor } from "@/lib/federations";
import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader } from "@/components/ui/SectionContainer";
import { PickerSheet, type PickerOption } from "@/components/ui/PickerSheet";
import { MasterGameViewerModal } from "@/components/players/MasterGameViewerModal";
import { useTheme } from "@/theme/ThemeContext";
import type { MasterGame, OlympiadFilters, OlympiadGame } from "@/types";

/**
 * The Chess Olympiad archive.
 *
 * Filtered by country and round, which is how a team event is read — "how did
 * Kenya do in round 3". Country and round are pickers because their ranges are
 * long and known (209 federations, 21 rounds); year is typed, because its range
 * is a century and a reader almost always has one in mind.
 */

const RESULT_LABEL: Record<string, string> = {
  "1-0": "1–0",
  "0-1": "0–1",
  "1/2-1/2": "½–½",
};

function GameRow({ game, onPress, busy }: { game: OlympiadGame; onPress: () => void; busy: boolean }) {
  const t = useTheme();
  // The flag alone. The code beside it was noise — a flag already says which
  // country — and survives only where emoji has no flag: nations that no
  // longer exist, and FIDE's non-national associations. A dash, never a guess,
  // where the source recorded no federation at all.
  const badge = (code: string) => {
    if (!code) return "—";
    const f = federationFor(code);
    return f.flag || f.code;
  };
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        st.row,
        { borderColor: t.border, backgroundColor: pressed ? t.elevated : t.surface },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text numberOfLines={1} style={[st.players, { color: t.text }]}>
          {game.white} <Text style={{ color: t.textFaint }}>{badge(game.white_federation)}</Text>
        </Text>
        <Text numberOfLines={1} style={[st.players, { color: t.text }]}>
          {game.black} <Text style={{ color: t.textFaint }}>{badge(game.black_federation)}</Text>
        </Text>
        <Text numberOfLines={1} style={[st.meta, { color: t.textMuted }]}>
          {[
            game.year,
            game.round_number ? `Round ${game.round_number}` : null,
            game.eco,
            game.opening_name,
          ]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={t.brand(600)} />
      ) : (
        <Text style={[st.result, { color: t.textMuted }]}>
          {RESULT_LABEL[game.result] ?? game.result}
        </Text>
      )}
    </Pressable>
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

  const [section, setSection] = useState("");
  const [federation, setFederation] = useState("");
  const [round, setRound] = useState("");
  const [yearInput, setYearInput] = useState("");
  const [year, setYear] = useState("");

  // Guards against two loads racing. This must be a ref, not the loadingMore
  // state: React batches state updates, so two onEndReached calls in the same
  // tick both read `false`, both request the same page, and the same fifty
  // games are appended twice — which is what produced duplicate list keys.
  const inFlight = useRef(false);

  const [openGame, setOpenGame] = useState<MasterGame | null>(null);
  const [openingId, setOpeningId] = useState<number | null>(null);

  useEffect(() => {
    api
      .getOlympiadFilters()
      .then(setFilters)
      .catch((err) => setError(userMessage(err, "Couldn't load the Olympiad archive.")));
  }, []);

  // Typing a year debounces: firing per keystroke makes "1978" four requests,
  // three of them for years that do not exist.
  useEffect(() => {
    const timer = setTimeout(() => setYear(yearInput.trim()), 400);
    return () => clearTimeout(timer);
  }, [yearInput]);

  const load = useCallback(
    async (nextPage: number) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (nextPage === 1) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const body = await api.getOlympiadGames({
          section: section || null,
          year: /^\d{4}$/.test(year) ? Number(year) : null,
          federation: federation || null,
          round: round || null,
          page: nextPage,
        });
        setGames((prev) => {
          if (nextPage === 1) return body.results;
          // Belt and braces. The ref above should make a repeat impossible,
          // but a duplicate id here means React silently omits rows rather
          // than merely warning, so it is worth being certain.
          const seen = new Set(prev.map((g) => g.id));
          return [...prev, ...body.results.filter((g) => !seen.has(g.id))];
        });
        setCount(body.count);
        setHasMore(body.has_more);
        setPage(body.page);
      } catch (err) {
        setError(userMessage(err, "Couldn't load those games."));
      } finally {
        inFlight.current = false;
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [section, year, federation, round]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const countryOptions: PickerOption[] = useMemo(
    () =>
      federationsFor(filters?.federations ?? []).map((f) => ({
        value: f.code,
        label: f.name,
        prefix: f.flag,
      })),
    [filters]
  );

  const roundOptions: PickerOption[] = useMemo(
    () => (filters?.rounds ?? []).map((r) => ({ value: String(r), label: `Round ${r}` })),
    [filters]
  );

  async function openGameViewer(game: OlympiadGame) {
    setOpeningId(game.id);
    try {
      const full = await api.getOlympiadGameMoves(game.id);
      setOpenGame({ ...full, result: full.result as MasterGame["result"] });
    } catch (err) {
      setError(userMessage(err, "Couldn't open that game."));
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <Screen>
      <PageHeader
        title="Olympiad"
        subtitle={
          filters
            ? `${filters.total_games.toLocaleString()} games · 1924–2024`
            : "Chess Olympiad archive"
        }
      />

      <View style={[st.segment, { borderColor: t.border, backgroundColor: t.elevated }]}>
        {[
          { value: "", label: "All" },
          ...(filters?.sections ?? []).map((s) => ({ value: s.value, label: s.label })),
        ].map((opt) => {
          const active = section === opt.value;
          return (
            <Pressable
              key={opt.value || "all"}
              onPress={() => setSection(opt.value)}
              style={[
                st.segmentItem,
                active && { backgroundColor: t.surface },
              ]}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: active ? t.brand(600) : t.textMuted,
                }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 8 }}>
        <PickerSheet
          label="COUNTRY"
          value={federation}
          options={countryOptions}
          placeholder="All countries"
          onChange={setFederation}
          searchable
        />
        <PickerSheet
          label="ROUND"
          value={round}
          options={roundOptions}
          placeholder="All rounds"
          onChange={setRound}
        />
        <View style={{ width: 78 }}>
          <Text style={[st.label, { color: t.textFaint }]}>YEAR</Text>
          <TextInput
            value={yearInput}
            onChangeText={(v) => setYearInput(v.replace(/\D/g, "").slice(0, 4))}
            placeholder="Any"
            placeholderTextColor={t.textFaint}
            keyboardType="number-pad"
            style={[st.yearField, { borderColor: t.border, backgroundColor: t.surface, color: t.text }]}
          />
        </View>
      </View>

      {error && <Text style={{ color: t.danger, marginBottom: 10 }}>{error}</Text>}

      {loading ? (
        <ListSkeleton />
      ) : games.length === 0 ? (
        <EmptyState title="No games match" description="Try a different country, round or year." />
      ) : (
        <FlatList
          data={games}
          keyExtractor={(g) => String(g.id)}
          renderItem={({ item }) => (
            <GameRow
              game={item}
              busy={openingId === item.id}
              onPress={() => openGameViewer(item)}
            />
          )}
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
            loadingMore ? (
              <ActivityIndicator style={{ marginVertical: 16 }} color={t.brand(600)} />
            ) : null
          }
        />
      )}

      {openGame && <MasterGameViewerModal game={openGame} onClose={() => setOpenGame(null)} />}
    </Screen>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 4 },
  segment: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 7, borderRadius: 8 },
  yearField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
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
