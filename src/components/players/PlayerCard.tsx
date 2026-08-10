import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { getPrepProductName, getPrimaryRating } from "@/lib/marketplace";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";
import type { Player } from "@/types";
import { userMessage } from "@/lib/apiError";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function GameSourcePills({ player }: { player: Player }) {
  const t = useTheme();
  const sc = player.game_source_counts;
  const otb = sc?.chess_results ?? 0;
  const cc = sc?.chess_com ?? 0;
  const li = sc?.lichess ?? 0;
  const total = (sc ? Object.values(sc).reduce((a, b) => a + (b ?? 0), 0) : player.games_count) ?? 0;

  if (!total) return null;

  if (!otb && !cc && !li) {
    return <Text style={{ fontSize: 12, color: t.textMuted }}>{total} games</Text>;
  }

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {otb > 0 && (
        <View style={st.pill}>
          <View style={[st.dot, { backgroundColor: "#f59e0b" }]} />
          <Text style={{ fontSize: 12, color: t.textMuted }}>{otb} OTB</Text>
        </View>
      )}
      {cc > 0 && (
        <View style={st.pill}>
          <View style={[st.dot, { backgroundColor: "#7fa650" }]} />
          <Text style={{ fontSize: 12, color: t.textMuted }}>{cc} Chess.com</Text>
        </View>
      )}
      {li > 0 && (
        <View style={st.pill}>
          <View style={[st.dot, { backgroundColor: "#b05000" }]} />
          <Text style={{ fontSize: 12, color: t.textMuted }}>{li} Lichess</Text>
        </View>
      )}
    </View>
  );
}

export function PlayerCard({
  player,
  showDelete = false,
  onDeleted,
}: {
  player: Player;
  showDelete?: boolean;
  onDeleted?: (player: Player) => void;
}) {
  const t = useTheme();
  const navigation = useNavigation<Nav>();
  const playerRef = player.public_id || player.slug;
  const initials = player.full_name.split(" ").map((n) => n[0]).join("");
  const rating = getPrimaryRating(player);
  const productName = getPrepProductName(player);
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(
      "Delete player profile?",
      `Delete "${player.full_name}"? This will permanently remove the player, linked accounts, imported games, and derived stats.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deletePlayer(playerRef);
              onDeleted?.(player);
            } catch (err) {
              Alert.alert("Error", userMessage(err, "Failed to delete player."));
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Card style={{ padding: 16 }}>
      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={[st.avatar, { backgroundColor: t.brand(100) }]}>
          <Text style={{ color: t.brand(700), fontWeight: "800", fontSize: 16 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={[st.name, { color: t.text }]} numberOfLines={1}>{player.full_name}</Text>
            {player.title && (
              <View style={st.titleBadge}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#92400e" }}>{player.title}</Text>
              </View>
            )}
          </View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: t.brand(700), marginTop: 2 }}>{productName}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
            {player.federation && <Text style={{ fontSize: 12, color: t.textMuted }}>{player.federation}</Text>}
            {rating && <Text style={{ fontSize: 12, color: t.textMuted }}>Rating {rating}</Text>}
          </View>
          <View style={{ marginTop: 4 }}>
            <GameSourcePills player={player} />
          </View>
        </View>
        {showDelete && (
          <Pressable onPress={confirmDelete} disabled={deleting} style={[st.deleteBtn, { borderColor: t.dangerBorder, backgroundColor: t.dangerBg }]}>
            <Ionicons name="trash-outline" size={16} color={t.danger} />
          </Pressable>
        )}
      </View>

      <Button
        title="View Profile"
        onPress={() => navigation.navigate("PlayerDetail", { slug: playerRef })}
        size="sm"
        style={{ marginTop: 14 }}
        fullWidth
      />
    </Card>
  );
}

const st = StyleSheet.create({
  avatar: { height: 48, width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 16, fontWeight: "700", flexShrink: 1 },
  titleBadge: { backgroundColor: "#fef3c7", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { height: 7, width: 7, borderRadius: 4 },
  deleteBtn: { height: 34, width: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", borderWidth: StyleSheet.hairlineWidth },
});
