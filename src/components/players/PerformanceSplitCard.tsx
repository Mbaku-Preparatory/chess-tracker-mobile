import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";

export function PerformanceSplitCard({
  label,
  games,
  score,
  colorIndicator,
}: {
  label: string;
  games: number;
  score: number;
  colorIndicator: "white" | "black";
}) {
  const t = useTheme();
  const scoreColor = score >= 60 ? t.success : score >= 40 ? t.warning : t.danger;

  return (
    <Card style={{ padding: 16, flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <View
          style={[
            st.dot,
            colorIndicator === "white"
              ? { backgroundColor: "#fff", borderWidth: 1, borderColor: t.border }
              : { backgroundColor: "#1f2937" },
          ]}
        />
        <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>{label}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
        <Text style={{ fontSize: 26, fontWeight: "800", color: scoreColor }}>{score}%</Text>
        <Text style={{ fontSize: 12, color: t.textFaint }}>score</Text>
      </View>
      <Text style={{ marginTop: 2, fontSize: 12, color: t.textMuted }}>{games} game{games !== 1 ? "s" : ""}</Text>
      <View style={[st.track, { backgroundColor: t.elevated }]}>
        <View style={[st.fill, { width: `${score}%`, backgroundColor: scoreColor }]} />
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  dot: { height: 12, width: 12, borderRadius: 6 },
  track: { marginTop: 12, height: 8, borderRadius: 4, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});
