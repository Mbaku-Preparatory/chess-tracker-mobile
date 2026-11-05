import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/TextField";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import type { RootStackParamList } from "@/navigation/types";
import { useTheme } from "@/theme/ThemeContext";
import Logo from "../components/ui/Logo";

type Props = NativeStackScreenProps<RootStackParamList, "ForgotPassword">;

/**
 * Forgot password, as on the website (app/(app)/forgot-password): an email,
 * then the six-digit code it receives and a new password. The first step says
 * the same thing whether or not the email has an account, so it can't be used
 * to find out who does.
 */
export function ForgotPasswordScreen({ navigation }: Props) {
  const t = useTheme();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function sendCode() {
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(email.trim().toLowerCase());
      if (step === "code") setResent(true);
      setStep("code");
    } catch (err) {
      setError(userMessage(err, "Couldn't send a code. Try again."));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setError(null);
    if (password !== again) return setError("The passwords don't match.");
    setBusy(true);
    try {
      await api.resetPassword(email.trim().toLowerCase(), code.trim(), password);
      Alert.alert("Password changed", "Sign in with your new password.");
      navigation.navigate("Login");
    } catch (err) {
      setError(userMessage(err, "Couldn't reset your password."));
      setBusy(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={st.container} keyboardShouldPersistTaps="handled">
      <View style={{ width: "100%", maxWidth: 360 }}>
        <View style={st.header}>
          <Logo size={48} style={{ marginBottom: 14 }} />
          <Text style={[st.title, { color: t.text }]}>Forgot your password?</Text>
          <Text style={[st.subtitle, { color: t.textMuted }]}>
            {step === "email" ? "We'll email you a code." : `If ${email.trim()} has an account, a code is on its way.`}
          </Text>
        </View>

        <Card style={{ padding: 20, gap: 14 }}>
          {error && (
            <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
              <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}

          {step === "email" ? (
            <>
              <TextField
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <Button title={busy ? "Sending…" : "Send code"} onPress={sendCode} loading={busy} disabled={!email.trim()} fullWidth />
            </>
          ) : (
            <>
              <TextField
                label="Code"
                value={code}
                onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
                placeholder="123456"
                keyboardType="number-pad"
                maxLength={6}
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
              />
              <TextField label="New password" value={password} onChangeText={setPassword} isPassword textContentType="newPassword" />
              <TextField label="New password again" value={again} onChangeText={setAgain} isPassword textContentType="newPassword" />
              <Button
                title={busy ? "Saving…" : "Set new password"}
                onPress={reset}
                loading={busy}
                disabled={code.length !== 6 || !password || !again}
                fullWidth
              />
              <Pressable onPress={sendCode} disabled={busy}>
                <Text style={{ color: t.textMuted, fontSize: 13, textAlign: "center" }}>
                  {resent ? "Sent again. " : "No email? "}
                  <Text style={{ color: t.brand(600), fontWeight: "600" }}>Send another code</Text>
                </Text>
              </Pressable>
            </>
          )}
        </Card>

        <View style={st.footer}>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>Remembered it? </Text>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "600" }}>Sign in</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  container: { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 13, textAlign: "center" },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
});
