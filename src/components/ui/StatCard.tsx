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
