import { useState } from "react";
import { Alert, Text } from "react-native";

import { AccountSection, Note, type NoteValue } from "@/components/account/AccountSection";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { clearAuth } from "@/redux/actions/auth";
import { useAppDispatch } from "@/redux/hooks";
import { useTheme } from "@/theme/ThemeContext";

/**
 * Deletes the account at once, as on the website. Confirmed with the
 * password, or for an account without one (Google, Lichess, Chess.com) by
 * typing its email, then a last "are you sure". Signing out afterwards sends
 * the app back to Login.
 */
export function DeleteAccount({ hasPassword }: { hasPassword: boolean }) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const [proof, setProof] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [note, setNote] = useState<NoteValue>(null);

  async function remove() {
    setDeleting(true);
    setNote(null);
    try {
      await api.deleteAccount(hasPassword ? { password: proof } : { confirm_email: proof });
      dispatch(clearAuth());
    } catch (err) {
      setNote({ kind: "error", text: userMessage(err, "Couldn't delete your account.") });
      setDeleting(false);
    }
  }

  function confirm() {
    Alert.alert(
      "Delete your account?",
      "Your account and everything in it, your opponents and their games, prep and books, are deleted now. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete forever", style: "destructive", onPress: remove },
      ]
    );
  }

  return (
    <AccountSection label="DANGER ZONE" padded>
      <Text style={{ color: t.textMuted, fontSize: 13 }}>Removes your account and all of its data. This cannot be undone.</Text>
      {!open ? (
        <Button title="Delete my account…" variant="danger" onPress={() => setOpen(true)} />
      ) : (
        <>
          <TextField
            label={hasPassword ? "Your password" : "Your email address"}
            value={proof}
            onChangeText={setProof}
            isPassword={hasPassword}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType={hasPassword ? "default" : "email-address"}
          />
          <Button title="Delete my account forever" variant="danger" onPress={confirm} loading={deleting} disabled={!proof} />
          <Button title="Cancel" variant="ghost" onPress={() => { setOpen(false); setProof(""); setNote(null); }} />
          <Note note={note} />
        </>
      )}
    </AccountSection>
  );
}
