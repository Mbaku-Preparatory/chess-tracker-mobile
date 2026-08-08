import { Alert, Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { deletePrepSession, replacePrepSession } from "@/redux/actions/prepSessions";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SessionForm } from "@/components/schedule/SessionForm";
import { parseLocalDate, parseLocalTimeAsDate } from "@/utils/schedule";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SessionDetail">;

export function SessionDetailScreen({ route, navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const session = useAppSelector((s) => s.prepSessions.items.find((item) => item.id === route.params.id));

  if (!session) {
    return (
      <Screen>
        <EmptyState title="Session not found" description="It may have already been deleted." />
      </Screen>
    );
  }

  function confirmDelete() {
    if (!session) return;
    Alert.alert("Delete session?", `Delete "${session.title}"? This can't be undone.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          dispatch(deletePrepSession(session.id));
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>Edit session</Text>
      <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Update this prep task.
      </Text>

      <SessionForm
        submitLabel="Save changes"
        onCancel={() => navigation.goBack()}
        initial={{
          title: session.title,
          notes: session.notes,
          date: parseLocalDate(session.scheduled_for),
          hasTime: !!session.scheduled_time,
          time: session.scheduled_time ? parseLocalTimeAsDate(session.scheduled_time) : undefined,
          durationMinutes: session.duration_minutes ? String(session.duration_minutes) : "",
          reminderSoundUri: session.reminder_sound_uri,
          reminderSoundName: session.reminder_sound_name,
        }}
        onSubmit={async (payload) => {
          const updated = await api.updatePrepSession(session.id, payload);
          dispatch(replacePrepSession(updated));
          navigation.goBack();
        }}
        extraActions={<Button title="Delete" variant="danger" onPress={confirmDelete} />}
      />
    </Screen>
  );
}
