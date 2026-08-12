import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { sendTestNotification } from "@/lib/notifications";
import { APP_VERSION, BUILD_NUMBER } from "@/lib/appVersion";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import type { RootStackParamList } from "@/navigation/types";
import type { UserProfile } from "@/types";
import { userMessage } from "@/lib/apiError";

type Props = NativeStackScreenProps<RootStackParamList, "Account">;

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[st.row, { borderColor: t.border }]}>
      <Text style={{ color: t.textMuted, fontSize: 13 }}>{label}</Text>
      <Text style={{ color: t.text, fontSize: 14, fontWeight: "500" }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function AccountScreen({ navigation }: Props) {
  const t = useTheme();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const data = await api.me();
          if (cancelled) return;
          setProfile(data);
          setFirstName(data.first_name);
          setLastName(data.last_name);
        } catch (err) {
          if (!cancelled) setError(userMessage(err, "Couldn't load your profile."));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const dirty =
    profile !== null && (firstName !== profile.first_name || lastName !== profile.last_name);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const updated = await api.updateMe(firstName.trim(), lastName.trim());
      setProfile(updated);
      setFirstName(updated.first_name);
      setLastName(updated.last_name);
      Alert.alert("Saved", "Your name has been updated.");
    } catch (err) {
      setError(userMessage(err, "Couldn't save your changes."));
    } finally {
      setSaving(false);
    }
  }

  async function handleTestNotification() {
    const ok = await sendTestNotification();
    Alert.alert(
      ok ? "Test sent" : "Notifications are off",
      ok
        ? "A test reminder will arrive in about 5 seconds."
        : "Notifications are blocked for this app. Enable them in Settings › Apps › Mbaku Preparatory › Notifications."
    );
  }

  if (loading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={t.brand(600)} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>Account</Text>
      <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Your profile and app details.
      </Text>

      {error && (
        <View style={{ borderWidth: 1, borderColor: t.dangerBorder, backgroundColor: t.dangerBg, borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
        </View>
      )}

      {profile && (
        <>
          <Text style={[st.sectionLabel, { color: t.textMuted }]}>SIGN-IN DETAILS</Text>
          <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }]}>
            <ReadOnlyRow label="Username" value={profile.username} />
            <ReadOnlyRow label="Email" value={profile.email} />
          </View>
          <Text style={[st.hint, { color: t.textFaint }]}>
            Username and email can&apos;t be changed here — your email is what verified this account.
          </Text>

          <Text style={[st.sectionLabel, { color: t.textMuted, marginTop: 24 }]}>YOUR NAME</Text>
          <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border, padding: 14 }]}>
            <TextField
              label="First name"
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              maxLength={150}
              placeholder="First name"
            />
            <View style={{ height: 12 }} />
            <TextField
              label="Last name"
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              maxLength={150}
              placeholder="Last name"
            />
            <View style={{ height: 14 }} />
            <Button
              title="Save changes"
              onPress={handleSave}
              loading={saving}
              disabled={!dirty}
            />
          </View>
        </>
      )}

      <Text style={[st.sectionLabel, { color: t.textMuted, marginTop: 24 }]}>NOTIFICATIONS</Text>
      <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border, padding: 14 }]}>
        <Text style={{ color: t.textMuted, fontSize: 13, marginBottom: 12 }}>
          Check that prep session reminders can reach you on this device.
        </Text>
        <Button title="Send a test reminder" variant="secondary" onPress={handleTestNotification} />
      </View>

      <Text style={[st.sectionLabel, { color: t.textMuted, marginTop: 24 }]}>ABOUT</Text>
      <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <ReadOnlyRow
          label="App version"
          value={BUILD_NUMBER ? `${APP_VERSION} (build ${BUILD_NUMBER})` : APP_VERSION}
        />
      </View>

      {/* A SUPPORT section lived here, below everything else — asking for money
          should be what you find at the bottom, not what greets you. Worth
          restoring in that same position when Paystack tipping ships. */}

      <View style={{ height: 24 }} />
      <Button title="Back" variant="ghost" onPress={() => navigation.goBack()} />
      <View style={{ height: 40 }} />
    </Screen>
  );
}

const st = StyleSheet.create({
  sectionLabel: { fontSize: 12, fontWeight: "700", letterSpacing: 0.5, marginBottom: 8 },
  card: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hint: { fontSize: 12, marginTop: 8, lineHeight: 16 },
});
