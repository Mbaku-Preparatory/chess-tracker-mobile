import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { gameRef } from "@/lib/gameRef";
import { GAMES_PAGE_SIZE } from "@/lib/games";
import { useTheme } from "@/theme/ThemeContext";
import type { Game, PaginatedResponse } from "@/types";

import { GameFilters, NO_FILTERS, hasFilters, ratingParams, type GameFilterValues } from "./GameFilters";
import { GamesTable } from "./GamesTable";

export function AllGamesView({ slug }: { slug: string }) {
  const t = useTheme();
  const [games, setGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<GameFilterValues>(NO_FILTERS);

  function handleGameDeleted(gameId: string) {
    setGames((prev) => prev.filter((g) => gameRef(g) !== gameId));
    setTotal((prev) => prev - 1);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    const { color, result, source, year, rating, search } = filters;
    api
      .getPlayerGames(slug, {
        ...(color ? { color_played: color } : {}),
        ...(result ? { result } : {}),
        ...(source ? { source } : {}),
        ...(year ? { year } : {}),
        ...ratingParams(rating),
        ...(search ? { search } : {}),
        page,
        // Said, not assumed: left out, the server pages by 25, and the page
        // count below (by 20) ran past the last page.
        page_size: GAMES_PAGE_SIZE,
      })
      .then((data: PaginatedResponse<Game>) => {
        setGames(data.results);
        setTotal(data.count);
      })
      .catch(() => setError("Failed to load games."))
      .finally(() => setLoading(false));
  }, [slug, filters, page]);

  const totalPages = Math.ceil(total / GAMES_PAGE_SIZE);

  return (
    <View>
      <GameFilters
        value={filters}
        onChange={(f) => {
          // In the same render as the filter: page 5 of the old list may not exist in the new one.
          setFilters(f);
          setPage(1);
        }}
        showYear
        showRating
        searchPlaceholder="Search opponent, event, opening…"
        count={loading ? undefined : `${total} game${total !== 1 ? "s" : ""}`}
      />

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
          {hasFilters(filters) ? "No games match the current filters." : "No games found."}
        </Text>
      )}
    </View>
  );
}
