import { StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from "react-native";

import { GAME_SOURCES } from "@/lib/games";
import { useTheme } from "@/theme/ThemeContext";
import type { GameSource, Player } from "@/types";

/**
 * "86 OTB · 10,000 Chess.com · 586 Lichess": a player's games by source, in
 * GAME_SOURCES order. The one row for the player card and the player screen.
 * The row wraps between sources, never inside one.
 */
export function GameSourceCounts({
  counts,
  style,
  textStyle,
}: {
  counts: Player["game_source_counts"];
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  const sources = (Object.keys(GAME_SOURCES) as GameSource[]).filter((s) => (counts?.[s] ?? 0) > 0);
  if (!sources.length) return null;

  return (
    <View style={[st.row, style]}>
      {sources.map((s) => (
        <View key={s} style={st.pill}>
          <View style={[st.dot, { backgroundColor: GAME_SOURCES[s].color }]} />
          <Text style={[{ fontSize: 12, color: t.textMuted }, textStyle]}>
            {counts![s]!.toLocaleString("en")} {GAME_SOURCES[s].short}
          </Text>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  pill: { flexDirection: "row", alignItems: "center", gap: 5 },
  dot: { height: 7, width: 7, borderRadius: 4 },
});
