import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

// @react-native-community/datetimepicker has no web implementation - a static
// top-level import crashes the whole web bundle at module-load time (it tries
// to register a native view even before render). Guard behind a runtime
// require() so it's only evaluated on native platforms.
const DateTimePicker =
  Platform.OS === "web"
    ? null
    : (require("@react-native-community/datetimepicker").default as typeof import("@react-native-community/datetimepicker").default);

import { api } from "@/lib/api";
import { useAppDispatch } from "@/redux/hooks";
import { addPrepSession } from "@/redux/actions/prepSessions";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SessionNew">;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toTimeString(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function SessionNewScreen({ navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasTime, setHasTime] = useState(false);
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const duration = durationMinutes.trim() ? Number(durationMinutes.trim()) : null;
      const session = await api.createPrepSession({
        title: title.trim(),
        notes: notes.trim(),
        scheduled_for: toDateString(date),
        scheduled_time: hasTime ? toTimeString(time) : null,
        duration_minutes: duration && !Number.isNaN(duration) ? duration : null,
      });
      dispatch(addPrepSession(session));
      navigation.goBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create session. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={[st.h1, { color: t.text }]}>New session</Text>
      <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Add a prep task to your Schedule agenda.
      </Text>

      <Card style={{ padding: 16, gap: 18 }}>
        {error && (
          <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
            <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <TextField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Review Sicilian lines" />

        <TextField
          label="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything to remember for this session"
          multiline
          style={{ height: 80, paddingTop: 10, textAlignVertical: "top" }}
        />

        <View>
          <Text style={{ fontSize: 13, fontWeight: "500", color: t.textMuted, marginBottom: 6 }}>Date</Text>
          <Pressable
            onPress={() => DateTimePicker && setShowDatePicker(true)}
            disabled={!DateTimePicker}
            style={[st.pickerBtn, { borderColor: t.border, backgroundColor: t.surface, opacity: DateTimePicker ? 1 : 0.6 }]}
          >
            <Text style={{ color: t.text, fontSize: 14 }}>
              {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </Text>
          </Pressable>
          {!DateTimePicker && (
            <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 4 }}>
              Date picker isn't available in the web preview — defaults to today.
            </Text>
          )}
          {DateTimePicker && showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === "ios" ? "inline" : "default"}
              onChange={(_, selected) => {
                setShowDatePicker(false);
                if (selected) setDate(selected);
              }}
            />
          )}
        </View>

        {DateTimePicker && (
          <View>
            <Pressable onPress={() => (hasTime ? setHasTime(false) : setShowTimePicker(true))}>
              <Text style={{ fontSize: 13, fontWeight: "500", color: t.brand(600) }}>
                {hasTime ? "Remove time" : "+ Set a time"}
              </Text>
            </Pressable>
            {hasTime && (
              <Pressable
                onPress={() => setShowTimePicker(true)}
                style={[st.pickerBtn, { borderColor: t.border, backgroundColor: t.surface, marginTop: 8 }]}
              >
                <Text style={{ color: t.text, fontSize: 14 }}>
                  {time.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </Text>
              </Pressable>
            )}
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, selected) => {
                  setShowTimePicker(false);
                  if (selected) {
                    setTime(selected);
                    setHasTime(true);
                  }
                }}
              />
            )}
          </View>
        )}

        <TextField
          label="Duration in minutes (optional)"
          value={durationMinutes}
          onChangeText={setDurationMinutes}
          placeholder="e.g. 45"
          keyboardType="number-pad"
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button title={loading ? "Saving…" : "Save session"} onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
          <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800" },
  pickerBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: "center" },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
