import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { api } from "@/lib/api";
import { loginRefusal, type AppError } from "@/lib/apiError";
import {
  authorizeWith,
  enabledProviders,
  googleAvailable,
  googleIdToken,
  providerName,
  type Provider,
} from "@/lib/socialAuth";
import { setAuth } from "@/redux/actions/auth";
import { useAppDispatch } from "@/redux/hooks";
import { useTheme } from "@/theme/ThemeContext";

type Way = "google" | Provider;

/**
 * The ways in that skip the form, for the Login and Signup screens: Google,
 * Lichess, and Chess.com once its client ID is set, then the line above the
 * email form. One component, so the two screens never offer different choices
 * (the website's components/SocialSignIn.tsx is the same list).
 */
export function SocialSignIn({ context, onError }: { context: "signin" | "signup"; onError: (message: string | null) => void }) {
  const dispatch = useAppDispatch();
  const t = useTheme();
  const [busy, setBusy] = useState<Way | null>(null);

  async function go(way: Way) {
    setBusy(way);
    onError(null);
    try {
      let data;
      if (way === "google") {
        const token = await googleIdToken();
        if (!token) return;
        data = await api.googleSignIn(token);
      } else {
        const code = await authorizeWith(way);
        if (!code) return;
        data = await api.linkedSignIn(way, code);
      }
      dispatch(setAuth({ token: data.access, refreshToken: data.refresh, email: data.email }));
    } catch (err) {
      const { status, body } = err as AppError;
      if (status === undefined && err instanceof Error) {
        onError(err.message); // from the picker or the browser, already readable
      } else if (status === 409 && (body as { code?: string } | undefined)?.code === "email_has_account") {
        // The message says "connect it in Settings"; on the phone that page is
        // the website's, so say where.
        onError(`${loginRefusal(err).message} Settings is on chesspreparatory.com.`);
      } else {
        onError(loginRefusal(err).message);
      }
    } finally {
      setBusy(null);
    }
  }

  const ways: Way[] = [...(googleAvailable() ? (["google"] as Way[]) : []), ...enabledProviders()];
  if (ways.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      {ways.map((way) => {
        const name = way === "google" ? "Google" : providerName(way);
        return (
          <Pressable
            key={way}
            onPress={() => go(way)}
            disabled={busy !== null}
            accessibilityRole="button"
            style={({ pressed }) => [
              st.button,
              {
                backgroundColor: t.mode === "dark" ? "#202124" : "#ffffff",
                borderColor: t.mode === "dark" ? "#202124" : "#dadce0",
                opacity: busy !== null && busy !== way ? 0.5 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {busy === way ? (
              <ActivityIndicator size="small" color={t.mode === "dark" ? "#e8eaed" : "#3c4043"} />
            ) : (
              <WayLogo way={way} color={t.mode === "dark" ? "#e8eaed" : "#1f1f1f"} />
            )}
            <Text style={[st.label, { color: t.mode === "dark" ? "#e8eaed" : "#3c4043" }]}>
              {context === "signup" ? `Sign up with ${name}` : `Continue with ${name}`}
            </Text>
          </Pressable>
        );
      })}
      <View style={st.dividerRow}>
        <View style={[st.rule, { backgroundColor: t.border }]} />
        <Text style={[st.divider, { color: t.textMuted }]}>OR WITH EMAIL</Text>
        <View style={[st.rule, { backgroundColor: t.border }]} />
      </View>
    </View>
  );
}

/**
 * Google's "G" (from Google's sign-in branding guidelines, which provide it
 * for exactly this) and Lichess's knight (lila public/logo/lichess.svg, "only
 * use to refer to lichess.org"). Chess.com: no logo until it says how.
 */
function WayLogo({ way, color }: { way: Way; color: string }) {
  if (way === "google") {
    return (
      <Svg width={18} height={18} viewBox="0 0 48 48">
        <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
        <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
        <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
        <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      </Svg>
    );
  }
  if (way === "lichess") {
    return (
      <Svg width={20} height={20} viewBox="0 0 50 50">
        <Path
          fill={color}
          stroke={color}
          strokeLinejoin="round"
          d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084S-.506 27.392 4.683 17.567C9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z"
        />
      </Svg>
    );
  }
  return null;
}

const st = StyleSheet.create({
  button: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 14,
  },
  label: { fontSize: 14, fontWeight: "500", letterSpacing: 0.25 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  divider: { fontSize: 11, letterSpacing: 0.6 },
});
