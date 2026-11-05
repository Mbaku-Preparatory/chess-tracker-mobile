import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AccountSection, Note, type NoteValue } from "@/components/account/AccountSection";
import { usePreferences } from "@/components/PreferencesProvider";
import { userMessage } from "@/lib/apiError";
import { useTheme } from "@/theme/ThemeContext";
import type { Preferences } from "@/types";

// The same three switches, in the same words, as the website's Settings.
const SWITCHES: { key: keyof Preferences; title: string; hint: string }[] = [
  { key: "mbaku_enabled", title: "Mbaku", hint: "The assistant that answers questions about a player from their games, under Ask in their prep." },
  { key: "bot_speech", title: "The bot talks", hint: "While you play a player's bot, it tells you which of their games you are in and when you leave them." },
  { key: "import_emails", title: "Email me when an import finishes", hint: "Ticks “Email me when this is done” for you when you import a player's games." },
];

/** Turn parts of the app on or off. Saved on the account, so they follow the
 * person to the website and back (components/PreferencesProvider). */
export function FeatureSwitches() {
  const t = useTheme();
  const { preferences, loaded, update } = usePreferences();
  const [note, setNote] = useState<NoteValue>(null);

  async function toggle(key: keyof Preferences, on: boolean) {
    setNote(null);
    try {
      await update({ [key]: on });
    } catch (err) {
      setNote({ kind: "error", text: userMessage(err, "Couldn't save that. Try again.") });
    }
  }

  return (
    <AccountSection label="FEATURES">
      {SWITCHES.map(({ key, title, hint }) => (
        <View key={key} style={[st.row, { borderColor: t.border }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 14, fontWeight: "500" }}>{title}</Text>
            <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 }}>{hint}</Text>
          </View>
          <Switch
            value={preferences[key]}
            onValueChange={(on) => void toggle(key, on)}
            disabled={!loaded}
            trackColor={{ true: t.brand(600), false: t.muted }}
            accessibilityLabel={title}
          />
        </View>
      ))}
      {note && (
        <View style={st.note}>
          <Note note={note} />
        </View>
      )}
    </AccountSection>
  );
}

const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  note: { paddingHorizontal: 14, paddingVertical: 10 },
});
