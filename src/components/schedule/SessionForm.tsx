import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

// @react-native-community/datetimepicker has no web implementation - a static
// top-level import crashes the whole web bundle at module-load time (it tries
// to register a native view even before render). Guard behind a runtime
// require() so it's only evaluated on native platforms.
const DateTimePicker =
  Platform.OS === "web"
    ? null
    : (require("@react-native-community/datetimepicker").default as typeof import("@react-native-community/datetimepicker").default);

import RingtonePicker from "ringtone-picker";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { toDateString, toTimeString } from "@/utils/schedule";
import { userMessage } from "@/lib/apiError";

export interface SessionFormPayload {
  title: string;
  notes: string;
  scheduled_for: string;
  scheduled_time: string | null;
  duration_minutes: number | null;
  reminder_sound_uri: string;
  reminder_sound_name: string;
}

export interface SessionFormInitialValues {
  title?: string;
  notes?: string;
  date?: Date;
  hasTime?: boolean;
  time?: Date;
  durationMinutes?: string;
  reminderSoundUri?: string;
  reminderSoundName?: string;
}

export function SessionForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
  extraActions,
}: {
  initial?: SessionFormInitialValues;
  submitLabel: string;
  onSubmit: (payload: SessionFormPayload) => Promise<void>;
  onCancel: () => void;
  extraActions?: React.ReactNode;
}) {
  const t = useTheme();

  const [title, setTitle] = useState(initial?.title ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [date, setDate] = useState(initial?.date ?? new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasTime, setHasTime] = useState(initial?.hasTime ?? false);
  const [time, setTime] = useState(initial?.time ?? new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(initial?.durationMinutes ?? "");
  const [reminderSoundUri, setReminderSoundUri] = useState(initial?.reminderSoundUri ?? "");
  const [reminderSoundName, setReminderSoundName] = useState(initial?.reminderSoundName ?? "");
  const [pickingSound, setPickingSound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0;

  async function handleChooseSound() {
    if (!RingtonePicker) return;
    setPickingSound(true);
    try {
      const picked = await RingtonePicker.pickRingtone();
      if (picked) {
        setReminderSoundUri(picked.uri);
        setReminderSoundName(picked.title);
      }
    } catch {
      // User cancelled or the picker failed - leave the current selection as-is.
    } finally {
      setPickingSound(false);
    }
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const duration = durationMinutes.trim() ? Number(durationMinutes.trim()) : null;
      await onSubmit({
        title: title.trim(),
        notes: notes.trim(),
        scheduled_for: toDateString(date),
        scheduled_time: hasTime ? toTimeString(time) : null,
        duration_minutes: duration && !Number.isNaN(duration) ? duration : null,
        reminder_sound_uri: reminderSoundUri,
        reminder_sound_name: reminderSoundName,
      });
    } catch (err) {
      setError(userMessage(err, "Could not save session. Try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
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

      {hasTime && RingtonePicker && (
        <View>
          <Text style={{ fontSize: 13, fontWeight: "500", color: t.textMuted, marginBottom: 6 }}>
            Reminder sound <Text style={{ fontSize: 11, color: t.textFaint }}>optional — plays 30 min before and at start</Text>
          </Text>
          <Pressable
            onPress={handleChooseSound}
            disabled={pickingSound}
            style={[st.pickerBtn, { borderColor: t.border, backgroundColor: t.surface }]}
          >
            <Text style={{ color: t.text, fontSize: 14 }}>
              {pickingSound ? "Choosing…" : reminderSoundName || "Default notification sound"}
            </Text>
          </Pressable>
          {reminderSoundUri ? (
            <Pressable
              onPress={() => {
                setReminderSoundUri("");
                setReminderSoundName("");
              }}
            >
              <Text style={{ fontSize: 12, color: t.brand(600), marginTop: 6 }}>Reset to default</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      {hasTime && !RingtonePicker && (
        <Text style={{ fontSize: 11, color: t.textFaint }}>
          Custom reminder sounds aren't available on this platform yet — the default notification sound will be used.
        </Text>
      )}

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Button title={loading ? "Saving…" : submitLabel} onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
        <Button title="Cancel" variant="secondary" onPress={onCancel} disabled={loading} />
        {extraActions}
      </View>
    </Card>
  );
}

const st = StyleSheet.create({
  pickerBtn: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: "center" },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
