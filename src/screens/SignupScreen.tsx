import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { RootStackParamList } from "@/navigation/types";
import Logo from "../components/ui/Logo";
import { userMessage } from "@/lib/apiError";

type Props = NativeStackScreenProps<RootStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const t = useTheme();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fideId, setFideId] = useState("");
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
      const normalizedEmail = email.trim().toLowerCase();
      await api.register(
        normalizedEmail,
        password,
        username.trim(),
        firstName.trim(),
        lastName.trim(),
        fideId.trim()
      );
      navigation.navigate("VerifyEmail", { email: normalizedEmail });
    } catch (err) {
      setError(userMessage(err, "Signup failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[st.container, { backgroundColor: t.bg }]}>
      <View style={{ width: "100%", maxWidth: 360 }}>
        <View style={st.header}>
          <Logo size={48} style={{ marginBottom: 14 }} />
          <Text style={[st.title, { color: t.text }]}>Create your account</Text>
          <Text style={[st.subtitle, { color: t.textMuted }]}>
            Track your own games and start scouting opponents.
          </Text>
        </View>

        <Card style={{ padding: 20, gap: 14 }}>
          {error && (
            <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
              <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <TextField
                label="First name"
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ada"
                autoCapitalize="words"
                textContentType="givenName"
              />
            </View>
            <View style={{ flex: 1 }}>
              <TextField
                label="Last name"
                value={lastName}
                onChangeText={setLastName}
                placeholder="Lovelace"
                autoCapitalize="words"
                textContentType="familyName"
              />
            </View>
          </View>
          <TextField
            label="Username (min 3 chars)"
            value={username}
            onChangeText={setUsername}
            placeholder="ada_lovelace"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="username"
          />
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
            label="FIDE ID (optional)"
            value={fideId}
            onChangeText={setFideId}
            placeholder="1503014"
            keyboardType="number-pad"
            autoCorrect={false}
          />
          <Text style={{ color: t.textMuted, fontSize: 12, marginTop: -8 }}>
            We&apos;ll pull in your rating and recent tournament games, so Mbaku
            can talk about your own play. You can add this later.
          </Text>

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
            disabled={!email || !password || !username || !firstName || !lastName}
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
  title: { fontSize: 22, fontWeight: "800", textAlign: "center" },
  subtitle: { marginTop: 4, fontSize: 13, textAlign: "center" },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 16 },
});
