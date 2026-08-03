import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { EcoBadge } from "@/components/ui/Badge";
import type { OpeningStat } from "@/types";

export function OpeningBreakdownCard({
  title,
  openings,
  colorLabel,
}: {
  title: string;
  openings: OpeningStat[];
  colorLabel: "White" | "Black";
}) {
  const t = useTheme();
  if (!openings.length) return null;

  return (
    <Card style={{ overflow: "hidden", flex: 1 }}>
      <View style={[st.header, { borderColor: t.border }]}>
        <View
          style={[
            st.dot,
            colorLabel === "White"
              ? { backgroundColor: "#fff", borderWidth: 1, borderColor: t.border }
              : { backgroundColor: "#1f2937" },
          ]}
        />
        <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>{title}</Text>
      </View>
      {openings.map((o, i) => (
        <View key={o.id} style={[st.row, i < openings.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border } : null]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            <EcoBadge code={o.eco_code} />
            <Text style={{ fontSize: 13, color: t.textMuted, flexShrink: 1 }} numberOfLines={1}>{o.opening_name}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text style={{ fontSize: 11, color: t.textFaint }}>{o.games_count}g</Text>
            {o.score_percent !== null && (
              <Text style={{ fontSize: 13, fontWeight: "700", color: o.score_percent >= 60 ? t.success : o.score_percent >= 40 ? t.warning : t.danger }}>
                {o.score_percent}%
              </Text>
            )}
          </View>
        </View>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { height: 10, width: 10, borderRadius: 5 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
});
