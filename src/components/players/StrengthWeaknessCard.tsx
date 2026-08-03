import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import type { Strength, Weakness } from "@/types";

export function StrengthWeaknessCard({
  items,
  type,
}: {
  items: (Strength | Weakness)[];
  type: "strength" | "weakness";
}) {
  const t = useTheme();
  const isStrength = type === "strength";
  const accent = isStrength ? t.success : t.danger;
  const accentBg = isStrength ? t.successBg : t.dangerBg;

  return (
    <Card style={{ overflow: "hidden", flex: 1 }}>
      <View style={[st.header, { backgroundColor: accentBg, borderColor: t.border }]}>
        <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>
          {isStrength ? "Strengths" : "Weaknesses"}
        </Text>
      </View>
      {items.map((item, i) => (
        <View key={item.id} style={[st.row, i < items.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.border } : null]}>
          <View style={[st.icon, { backgroundColor: accentBg }]}>
            <Text style={{ color: accent, fontSize: 12, fontWeight: "800" }}>{isStrength ? "+" : "−"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>{item.title}</Text>
            {item.description && <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 3 }}>{item.description}</Text>}
          </View>
        </View>
      ))}
    </Card>
  );
}

const st = StyleSheet.create({
  header: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { height: 20, width: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", marginTop: 1 },
});
