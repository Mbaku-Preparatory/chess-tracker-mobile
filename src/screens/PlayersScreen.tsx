import { useEffect } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import {
  fetchPlayers,
  setSearchQuery,
  setOrdering,
  setCurrentPage,
  type PlayerOrdering,
} from "@/redux/actions/players";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/ui/SectionContainer";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ListSkeleton } from "@/components/ui/LoadingSkeleton";
import { PlayerCard } from "@/components/players/PlayerCard";
import type { RootStackParamList } from "@/navigation/types";
import type { Player } from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAGE_SIZE = 25;

const SORT_OPTIONS: { value: PlayerOrdering; label: string }[] = [
  { value: "-created_at", label: "Recently added" },
  { value: "created_at", label: "Oldest first" },
  { value: "full_name", label: "Name A–Z" },
  { value: "-standard_rating", label: "Highest rated" },
];

export function PlayersScreen() {
  const t = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { items, total, loading, error, searchQuery, ordering, currentPage } = useAppSelector((s) => s.players);

  useEffect(() => {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
  }, [dispatch, searchQuery, currentPage, ordering]);

  function handleDeleted(_player: Player) {
    dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }));
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={loading ? [] : items}
        keyExtractor={(p) => String(p.id)}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        onRefresh={() => dispatch(fetchPlayers({ search: searchQuery || undefined, page: currentPage, ordering }))}
        refreshing={false}
        ListHeaderComponent={
          <View>
            <PageHeader
              title="My Opponents"
              subtitle={total ? `${total} opponent${total === 1 ? "" : "s"} tracked` : undefined}
              actions={<Button title="+ Add Opponent" size="sm" onPress={() => navigation.navigate("PlayerNew")} />}
            />

            <SearchInput
              placeholder="Search by name or federation…"
              onSearch={(q) => dispatch(setSearchQuery(q))}
              defaultValue={searchQuery}
              style={{ marginBottom: 12 }}
            />

            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {SORT_OPTIONS.map((opt) => {
                const active = ordering === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    onPress={() => dispatch(setOrdering(opt.value))}
                    style={[
                      st.chip,
                      { backgroundColor: active ? t.brand(600) : t.elevated },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : t.textMuted }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {error && (
              <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
                <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
              </View>
            )}

            {loading && <ListSkeleton rows={5} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ marginBottom: 12 }}>
            <PlayerCard player={item} showDelete onDeleted={handleDeleted} />
          </View>
        )}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title={searchQuery ? "No opponents found" : "No opponents yet"}
              description={searchQuery ? "Try adjusting your search." : "Add your first opponent to get started."}
            />
          )
        }
        ListFooterComponent={
          !loading && totalPages > 1 ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 12 }}>
              <Button
                title="Previous"
                variant="secondary"
                size="sm"
                disabled={currentPage <= 1}
                onPress={() => dispatch(setCurrentPage(currentPage - 1))}
              />
              <Text style={{ color: t.textMuted, fontSize: 13 }}>
                Page {currentPage} of {totalPages}
              </Text>
              <Button
                title="Next"
                variant="secondary"
                size="sm"
                disabled={currentPage >= totalPages}
                onPress={() => dispatch(setCurrentPage(currentPage + 1))}
              />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const st = StyleSheet.create({
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12, marginBottom: 12 },
});
