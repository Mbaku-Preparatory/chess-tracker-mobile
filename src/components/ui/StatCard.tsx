import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "./Card";

type Variant = "default" | "success" | "warning" | "danger";

export function StatCard({
  label,
  value,
  sublabel,
  variant = "default",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  variant?: Variant;
}) {
  const t = useTheme();
  const bg: Record<Variant, string> = {
    default: t.card,
    success: t.successBg,
    warning: t.warningBg,
    danger: t.dangerBg,
  };
  const fg: Record<Variant, string> = {
    default: t.text,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
  };

  return (
    <Card style={{ backgroundColor: bg[variant], padding: 16, flex: 1 }}>
      <Text style={{ fontSize: 13, fontWeight: "500", color: t.textMuted }}>{label}</Text>
      <Text style={[st.value, { color: fg[variant] }]}>{value}</Text>
      {sublabel && <Text style={{ marginTop: 2, fontSize: 11, color: t.textFaint }}>{sublabel}</Text>}
    </Card>
  );
}

const st = StyleSheet.create({
  value: { marginTop: 4, fontSize: 24, fontWeight: "800" },
});

// A single card listing several stats side by side, separated by thin
// dividers - used where a row of individual StatCards would wrap onto
// multiple lines and look cluttered (e.g. 5 stats on a phone-width screen).
export function StatStrip({
  items,
}: {
  items: { label: string; value: string | number; variant?: Variant }[];
}) {
  const t = useTheme();
  const fg: Record<Variant, string> = {
    default: t.text,
    success: t.success,
    warning: t.warning,
    danger: t.danger,
  };

  return (
    <Card style={st2.strip}>
      {items.map((item, i) => (
        <View key={item.label} style={[st2.item, i > 0 ? { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: t.border } : null]}>
          <Text style={[st2.itemValue, { color: fg[item.variant ?? "default"] }]}>{item.value}</Text>
          <Text style={{ marginTop: 2, fontSize: 11, color: t.textMuted }}>{item.label}</Text>
        </View>
      ))}
    </Card>
  );
}

const st2 = StyleSheet.create({
  strip: { flexDirection: "row", paddingVertical: 14 },
  item: { flex: 1, alignItems: "center" },
  itemValue: { fontSize: 18, fontWeight: "800" },
});
