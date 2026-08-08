import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { formatSessionDate, formatSessionTime } from "@/utils/schedule";
import type { RootStackParamList } from "@/navigation/types";
import type { PrepSession } from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PrepSessionCard({
  session,
  onToggleComplete,
  onDelete,
}: {
  session: PrepSession;
  onToggleComplete: (session: PrepSession) => void;
  onDelete: (session: PrepSession) => void;
}) {
  const t = useTheme();
  const navigation = useNavigation<Nav>();
  const completed = !!session.completed_at;

  const metaParts = [
    formatSessionDate(session.scheduled_for),
    session.scheduled_time ? formatSessionTime(session.scheduled_time) : null,
    session.duration_minutes ? `${session.duration_minutes} min` : null,
  ].filter(Boolean);

  function confirmDelete() {
    Alert.alert("Delete session?", `Delete "${session.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete(session) },
    ]);
  }

  return (
    <Card style={{ padding: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Pressable
          onPress={() => onToggleComplete(session)}
          style={[
            st.checkbox,
            {
              borderColor: completed ? t.success : t.border,
              backgroundColor: completed ? t.success : "transparent",
            },
          ]}
        >
          {completed && <Ionicons name="checkmark" size={16} color="#ffffff" />}
        </Pressable>

        <Pressable
          style={{ flex: 1, minWidth: 0 }}
          onPress={() => navigation.navigate("SessionDetail", { id: session.id })}
        >
          <Text
            style={[
              st.title,
              { color: completed ? t.textMuted : t.text, textDecorationLine: completed ? "line-through" : "none" },
            ]}
            numberOfLines={1}
          >
            {session.title}
          </Text>
          <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>{metaParts.join(" · ")}</Text>
          {session.notes ? (
            <Text style={{ fontSize: 12, color: t.textFaint, marginTop: 2 }} numberOfLines={2}>
              {session.notes}
            </Text>
          ) : null}
        </Pressable>

        <Pressable onPress={confirmDelete} style={st.deleteBtn}>
          <Ionicons name="trash-outline" size={16} color={t.textFaint} />
        </Pressable>
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  checkbox: {
    height: 26,
    width: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "600" },
  deleteBtn: { height: 30, width: 30, alignItems: "center", justifyContent: "center" },
});
