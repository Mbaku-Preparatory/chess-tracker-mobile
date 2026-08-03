import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[st.container, { borderColor: t.border }]}>
      <Ionicons name="sparkles-outline" size={40} color={t.textFaint} />
      <Text style={[st.title, { color: t.text }]}>{title}</Text>
      {description && <Text style={[st.desc, { color: t.textMuted }]}>{description}</Text>}
      {action && <View style={{ marginTop: 16 }}>{action}</View>}
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderStyle: "dashed",
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: { marginTop: 12, fontSize: 16, fontWeight: "700" },
  desc: { marginTop: 4, maxWidth: 320, textAlign: "center", fontSize: 13 },
});
