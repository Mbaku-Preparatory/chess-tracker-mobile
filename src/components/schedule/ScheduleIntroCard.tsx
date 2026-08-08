import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";

const POINTS = [
  { icon: "calendar-outline" as const, text: "Plan what to study and when — openings to drill, opponents to scout." },
  { icon: "notifications-outline" as const, text: "Get a reminder before each session so prep actually happens." },
  { icon: "flame-outline" as const, text: "Complete sessions on consecutive days to build a streak." },
];

/** One-time explainer for the Schedule tab. Dismissal is persisted by the caller. */
export function ScheduleIntroCard({ onDismiss }: { onDismiss: () => void }) {
  const t = useTheme();

  return (
    <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={st.header}>
        <Text style={[st.title, { color: t.text }]}>What this page is for</Text>
        <TouchableOpacity onPress={onDismiss} hitSlop={10} accessibilityLabel="Dismiss">
          <Ionicons name="close" size={18} color={t.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[st.lead, { color: t.textMuted }]}>
        Schedule is your prep agenda — a running list of what you plan to work on, not a calendar.
      </Text>

      {POINTS.map((point) => (
        <View key={point.icon} style={st.point}>
          <Ionicons name={point.icon} size={15} color={t.brand(600)} style={{ marginTop: 1 }} />
          <Text style={[st.pointText, { color: t.textMuted }]}>{point.text}</Text>
        </View>
      ))}

      <TouchableOpacity onPress={onDismiss} style={[st.gotIt, { borderColor: t.border }]}>
        <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "700" }}>Got it</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 15, fontWeight: "700" },
  lead: { fontSize: 13, lineHeight: 18 },
  point: { flexDirection: "row", gap: 9, alignItems: "flex-start" },
  pointText: { flex: 1, fontSize: 13, lineHeight: 18 },
  gotIt: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, marginTop: 2 },
});
