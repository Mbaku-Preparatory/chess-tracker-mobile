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
import Logo from "../components/ui/Logo";
import { userMessage } from "@/lib/apiError";

type Props = NativeStackScreenProps<RootStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      const data = await api.login(email.trim().toLowerCase(), password);
      dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
    } catch (err) {
      setError(userMessage(err, "Login failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[st.container, { backgroundColor: t.bg }]}>
      <View style={{ width: "100%", maxWidth: 360 }}>
        <View style={st.header}>
          <Logo size={48} style={{ marginBottom: 14 }} />
          <Text style={[st.title, { color: t.text }]}>Welcome back</Text>
          <Text style={[st.subtitle, { color: t.textMuted }]}>Sign in to your account</Text>
        </View>

        <Card style={{ padding: 20, gap: 14 }}>
          {error && (
            <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
              <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <TextField
            label="Email or username"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com or username"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
          <TextField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            isPassword
            textContentType="password"
          />

          <Button
            title={loading ? "Signing in…" : "Sign in"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!email || !password}
            fullWidth
          />
        </Card>

        <View style={st.footer}>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>No account? </Text>
          <Pressable onPress={() => navigation.navigate("Signup")}>
            <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "600" }}>Create one</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20 },
  header: { alignItems: "center", marginBottom: 28 },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { marginTop: 4, fontSize: 13 },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
});
