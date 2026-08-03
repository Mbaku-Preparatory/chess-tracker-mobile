import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

export function SectionContainer({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={st.section}>
      <View style={st.header}>
        <View style={{ flex: 1 }}>
          <Text style={[st.title, { color: t.text }]}>{title}</Text>
          {subtitle && <Text style={[st.subtitle, { color: t.textMuted }]}>{subtitle}</Text>}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={[st.pageTitle, { color: t.text }]}>{title}</Text>
      {subtitle && <Text style={[st.pageSubtitle, { color: t.textMuted }]}>{subtitle}</Text>}
      {actions && <View style={{ marginTop: 12, flexDirection: "row", gap: 10, flexWrap: "wrap" }}>{actions}</View>}
    </View>
  );
}

const st = StyleSheet.create({
  section: { marginBottom: 28 },
  header: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12, gap: 8 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { marginTop: 2, fontSize: 13 },
  pageTitle: { fontSize: 24, fontWeight: "800" },
  pageSubtitle: { marginTop: 4, fontSize: 14 },
});
