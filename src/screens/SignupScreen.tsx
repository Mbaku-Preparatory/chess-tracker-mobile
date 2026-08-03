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

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.register(email.trim().toLowerCase(), password);
      dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[st.container, { backgroundColor: t.bg }]}>
      <View style={{ width: "100%", maxWidth: 360 }}>
        <View style={st.header}>
          <View style={[st.logo, { backgroundColor: t.brand(600) }]}>
            <Text style={st.logoText}>MP</Text>
          </View>
          <Text style={[st.title, { color: t.text }]}>Create your account</Text>
          <Text style={[st.subtitle, { color: t.textMuted }]}>
            Build your repertoire and start scouting opponents.
          </Text>
        </View>

        <Card style={{ padding: 20, gap: 14 }}>
          {error && (
            <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
              <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}

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
          <TextField
            label="Password (min 6 chars)"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            isPassword
            textContentType="newPassword"
          />

          <Button
            title={loading ? "Creating account…" : "Create account"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!email || !password}
            fullWidth
          />
        </Card>

        <View style={st.footer}>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>Already have an account? </Text>
          <Pressable onPress={() => navigation.navigate("Login")}>
            <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "600" }}>Sign in</Text>
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
