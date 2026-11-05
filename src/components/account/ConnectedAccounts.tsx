import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AccountSection, Note, type NoteValue } from "@/components/account/AccountSection";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { authorizeWith, enabledProviders, providerName, type Provider } from "@/lib/socialAuth";
import { useTheme } from "@/theme/ThemeContext";
import type { Linked } from "@/types";

/**
 * Lichess (and Chess.com once switched on): who is connected, and a button to
 * connect or disconnect. Connecting is the same in-app sign-in as on the
 * Login screen, sent with `connect`, so the backend links it to this account
 * instead of signing in. Disconnect waits for a password, so nobody loses
 * their only way in.
 */
export function ConnectedAccounts({ linked, hasPassword, onLinked }: { linked: Linked | undefined; hasPassword: boolean; onLinked: (linked: Linked) => void }) {
  const t = useTheme();
  const [busy, setBusy] = useState<Provider | null>(null);
  const [note, setNote] = useState<NoteValue>(null);

  async function toggle(provider: Provider) {
    const name = providerName(provider);
    setBusy(provider);
    setNote(null);
    try {
      if (linked?.[provider]) {
        onLinked((await api.disconnectLinked(provider)).linked);
        setNote({ kind: "ok", text: `${name} disconnected.` });
      } else {
        const code = await authorizeWith(provider);
        if (!code) return; // closed the browser
        onLinked((await api.linkedConnect(provider, code)).linked);
        setNote({ kind: "ok", text: `${name} connected. You can now sign in with it.` });
      }
    } catch (err) {
      setNote({ kind: "error", text: userMessage(err, `Couldn't change ${name}. Please try again.`) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <AccountSection label="CONNECTED ACCOUNTS">
      {enabledProviders().map((provider) => {
        const username = linked?.[provider]?.username;
        return (
          <View key={provider} style={[st.row, { borderColor: t.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontSize: 14, fontWeight: "500" }}>{providerName(provider)}</Text>
              <Text style={{ color: t.textMuted, fontSize: 12, marginTop: 2 }}>{username ? `Connected as ${username}` : "Not connected"}</Text>
            </View>
            <Button
              title={username ? "Disconnect" : "Connect"}
              variant="secondary"
              onPress={() => toggle(provider)}
              loading={busy === provider}
              disabled={busy !== null || (Boolean(username) && !hasPassword)}
            />
          </View>
        );
      })}
      {!hasPassword && Object.values(linked ?? {}).some(Boolean) && (
        <Text style={[st.footnote, { color: t.textFaint }]}>Set a password below before disconnecting, so you can still sign in.</Text>
      )}
      {note && (
        <View style={st.noteBox}>
          <Note note={note} />
        </View>
      )}
    </AccountSection>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  footnote: { fontSize: 12, lineHeight: 16, paddingHorizontal: 14, paddingVertical: 10 },
  noteBox: { paddingHorizontal: 14, paddingVertical: 10 },
});
