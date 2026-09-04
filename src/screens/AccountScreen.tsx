import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { sendTestNotification } from "@/lib/notifications";
import { APP_VERSION, BUILD_NUMBER } from "@/lib/appVersion";
import { PRIVACY_POLICY_URL, SUPPORT_EMAIL, accountDeletionMailto } from "@/lib/links";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { TipSection } from "@/components/TipSection";
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

function LinkRow({
  label,
  hint,
  onPress,
  danger = false,
}: {
  label: string;
  hint?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        st.row,
        { borderColor: t.border, opacity: pressed ? 0.6 : 1, alignItems: "flex-start" },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: danger ? t.danger : t.brand(600), fontSize: 14, fontWeight: "500" }}>
          {label}
        </Text>
        {hint && (
          <Text style={{ color: t.textFaint, fontSize: 12, marginTop: 3, lineHeight: 16 }}>
            {hint}
          </Text>
        )}
      </View>
      <Text style={{ color: t.textFaint, fontSize: 16 }}>›</Text>
    </Pressable>
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
        : "Notifications are blocked for this app. Enable them in Settings › Apps › Chess Preparatory › Notifications."
    );
  }

  async function handleOpenPrivacy() {
    try {
      await Linking.openURL(PRIVACY_POLICY_URL);
    } catch {
      // No browser, or the intent was refused. The URL itself is the useful
      // thing here, so show it rather than a dead end — this link is the one
      // the Play listing promises is reachable inside the app.
      Alert.alert("Privacy policy", PRIVACY_POLICY_URL);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      "Delete your account?",
      "This removes your account and every game, opponent and prep session on it. " +
        "It cannot be undone.\n\n" +
        "Deletion is handled by email so we can confirm the request comes from you. " +
        "We action it and confirm within 30 days.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Email the request",
          style: "destructive",
          onPress: async () => {
            const url = accountDeletionMailto(profile?.username ?? "");
            try {
              await Linking.openURL(url);
            } catch {
              // A device with no mail client must not be a device with no way
              // out — fall back to showing the address to write to by hand.
              Alert.alert(
                "No email app found",
                `Send your deletion request to ${SUPPORT_EMAIL} from the address registered to your account.`
              );
            }
          },
        },
      ]
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

      <Text style={[st.sectionLabel, { color: t.textMuted, marginTop: 24 }]}>MY CHESS</Text>
      <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        {/* The account holder as a player, not as a login. Everything above
            this point edits who you are to us; this is who you are over a
            board. */}
        <LinkRow
          label="My profile"
          hint="Your FIDE rating, your games, and Mbaku on your own play."
          onPress={() => navigation.navigate("MyProfile")}
        />
      </View>

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
        {/* Play's User Data policy wants the policy reachable from inside the
            app, not only from the store listing — and a reviewer looks for it
            here. It covers crash reporting and what Mbaku sends to Anthropic. */}
        <LinkRow
          label="Privacy policy"
          hint="What we collect, who processes it, and how to get it deleted."
          onPress={handleOpenPrivacy}
        />
      </View>

      <Text style={[st.sectionLabel, { color: t.textMuted, marginTop: 24 }]}>DANGER ZONE</Text>
      <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        {/* Play requires an in-app route to request deletion for any app that
            lets you create an account. Email is the honest mechanism today —
            a real DELETE endpoint would be better and is worth building. */}
        <LinkRow
          label="Delete my account"
          hint="Removes your account and all of its data. This cannot be undone."
          onPress={handleDeleteAccount}
          danger
        />
      </View>

      {/* Support — web only, and deliberately so.
          
          Google Play requires its own billing system for in-app purchases,
          with carve-outs whose edges (donation vs. tip for a digital service)
          are exactly where listings get rejected — or worse, suspended after
          approval, which is unrecoverable for an application id Google binds
          to the listing forever.
          
          The web flow is unaffected and still takes tips. This only hides the
          entry point in the packaged app. Gated on `!== "web"` rather than on
          Android specifically, because Apple's rules on the same question are
          stricter still and this app has an ios target configured.
          
          Removing this gate means answering Google's Payments policy first,
          not just deciding the button looks fine. */}
      {Platform.OS === "web" && (
        <>
          <Text style={[st.sectionLabel, { color: t.textMuted, marginTop: 24 }]}>SUPPORT</Text>
          <TipSection />
        </>
      )}

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
