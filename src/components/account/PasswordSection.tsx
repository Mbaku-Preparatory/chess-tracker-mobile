import { useState } from "react";
import { Text } from "react-native";

import { AccountSection, Note, type NoteValue } from "@/components/account/AccountSection";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { setAuth } from "@/redux/actions/auth";
import { useAppDispatch } from "@/redux/hooks";
import { useTheme } from "@/theme/ThemeContext";

/**
 * Change the password, or set the first one for an account made with Google,
 * Lichess or Chess.com (no current password to ask for). Either way every
 * other session is signed out, and the tokens that come back keep this one.
 */
export function PasswordSection({ hasPassword, onSet }: { hasPassword: boolean; onSet: () => void }) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<NoteValue>(null);

  async function save() {
    if (next !== again) return setNote({ kind: "error", text: "The new passwords don't match." });
    setSaving(true);
    setNote(null);
    try {
      const tokens = await api.changePassword(hasPassword ? current : "", next);
      dispatch(setAuth({ token: tokens.access, refreshToken: tokens.refresh, email: tokens.email }));
      setCurrent("");
      setNext("");
      setAgain("");
      setNote({ kind: "ok", text: hasPassword ? "Password changed. Your other devices are signed out." : "Password set. You can sign in with your email too." });
      onSet();
    } catch (err) {
      setNote({ kind: "error", text: userMessage(err, "Couldn't save your password.") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <AccountSection label="PASSWORD" padded>
      {!hasPassword && (
        <Text style={{ color: t.textMuted, fontSize: 13 }}>
          You sign in with Google, Lichess or Chess.com. Set a password to sign in with your email too.
        </Text>
      )}
      {hasPassword && <TextField label="Current password" value={current} onChangeText={setCurrent} isPassword textContentType="password" />}
      <TextField label="New password" value={next} onChangeText={setNext} isPassword textContentType="newPassword" />
      <TextField label="New password again" value={again} onChangeText={setAgain} isPassword textContentType="newPassword" />
      <Button
        title={hasPassword ? "Change password" : "Set password"}
        onPress={save}
        loading={saving}
        disabled={(hasPassword && !current) || !next || !again}
      />
      <Note note={note} />
    </AccountSection>
  );
}
