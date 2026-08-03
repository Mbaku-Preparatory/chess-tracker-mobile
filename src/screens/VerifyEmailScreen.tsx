import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useAppDispatch } from "@/redux/hooks";
import { setAuth } from "@/redux/actions/auth";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "VerifyEmail">;

export function VerifyEmailScreen({ route, navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { email } = route.params;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.verifyEmail(email, code.trim());
      dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    setResent(false);
    try {
      await api.resendVerification(email);
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't resend the code.");
    }
  }

  return (
    <View style={[st.container, { backgroundColor: t.bg }]}>
      <View style={{ width: "100%", maxWidth: 360 }}>
        <View style={st.header}>
          <View style={[st.logo, { backgroundColor: t.brand(600) }]}>
            <Text style={st.logoText}>MP</Text>
          </View>
          <Text style={[st.title, { color: t.text }]}>Verify your email</Text>
          <Text style={[st.subtitle, { color: t.textMuted }]}>Enter the code we sent to {email}.</Text>
        </View>

        <Card style={{ padding: 20, gap: 14 }}>
          {error && (
            <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
              <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}
          {resent && !error && (
            <View style={[st.errorBox, { backgroundColor: t.successBg, borderColor: t.success }]}>
              <Text style={{ color: t.success, fontSize: 13 }}>A new code is on its way.</Text>
            </View>
          )}

          <TextField
            label="Verification code"
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            textAlign="center"
          />

          <Button
            title={loading ? "Verifying…" : "Verify"}
            onPress={handleSubmit}
            loading={loading}
            disabled={code.trim().length !== 6}
            fullWidth
          />
        </Card>

        <View style={st.footer}>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>Didn&apos;t get a code? </Text>
          <Pressable onPress={handleResend}>
            <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "600" }}>Resend</Text>
          </Pressable>
        </View>
        <View style={[st.footer, { marginTop: 6 }]}>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "600" }}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 28 },
  logo: { height: 48, width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  logoText: { color: "#fff", fontWeight: "800", fontSize: 18 },
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 4, fontSize: 13, textAlign: "center" },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
});
