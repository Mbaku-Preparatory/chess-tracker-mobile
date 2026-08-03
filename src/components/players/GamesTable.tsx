import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { ColorBadge, EcoBadge, ResultBadge, SourceBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { PgnViewerModal } from "./PgnViewerModal";
import type { Game } from "@/types";

export function GamesTable({
  games,
  loading,
  onDeleted,
}: {
  games: Game[];
  loading?: boolean;
  onDeleted?: (gameId: number) => void;
}) {
  const t = useTheme();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  function handleDelete(game: Game) {
    Alert.alert("Delete game?", `Delete this game vs ${game.opponent_name}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(game.id);
          try {
            await api.deleteGame(game.id);
            onDeleted?.(game.id);
          } catch {
            // silently reset — user can retry
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  }

  if (!loading && !games.length) {
    return <EmptyState title="No games found" description="Try adjusting your filters." />;
  }

  return (
    <>
      <View style={{ gap: 8 }}>
        {games.map((game) => (
          <Pressable key={game.id} onPress={() => setSelectedGame(game)}>
            <Card style={{ padding: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }} numberOfLines={1}>
                      {game.opponent_name}
                    </Text>
                    {game.opponent_rating && (
                      <Text style={{ fontSize: 11, color: t.textFaint }}>({game.opponent_rating})</Text>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }} numberOfLines={1}>
                    {game.event}{game.round ? ` · R${game.round}` : ""}
                    {game.date_played ? ` · ${new Date(game.date_played).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}` : ""}
                  </Text>
                  {game.opening_name && (
                    <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }} numberOfLines={1}>{game.opening_name}</Text>
                  )}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    <ColorBadge color={game.color_played} />
                    <ResultBadge result={game.result} />
                    {game.eco_code && <EcoBadge code={game.eco_code} />}
                    <SourceBadge source={game.source} />
                  </View>
                </View>
                {onDeleted && (
                  <Pressable onPress={() => handleDelete(game)} disabled={deletingId === game.id} style={{ padding: 6 }}>
                    <Ionicons name="trash-outline" size={16} color={t.textFaint} />
                  </Pressable>
                )}
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      {selectedGame && <PgnViewerModal game={selectedGame} onClose={() => setSelectedGame(null)} />}
    </>
  );
}
