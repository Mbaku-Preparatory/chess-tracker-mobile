import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

/** A heading over a card: every section of the Account screen. `padded` for
 * forms; rows bring their own padding. */
export function AccountSection({ label, padded = false, children }: { label: string; padded?: boolean; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 24 }}>
      <Text style={[st.label, { color: t.textMuted }]}>{label}</Text>
      <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }, padded && { padding: 14, gap: 12 }]}>
        {children}
      </View>
    </View>
  );
}

export type NoteValue = { kind: "ok" | "error"; text: string } | null;

/** A one-line result under a form: green when it worked, red when not. */
export function Note({ note }: { note: NoteValue }) {
  const t = useTheme();
  if (!note) return null;
  return <Text style={{ color: note.kind === "ok" ? t.brand(600) : t.danger, fontSize: 13 }}>{note.text}</Text>;
}

const st = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
});
