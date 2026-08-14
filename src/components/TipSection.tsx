/**
 * "Buy the developer a coffee", at the bottom of the account screen.
 *
 * Shape shared with the web app's TipForm, deliberately — one product, one
 * flow, so a change of mind about amounts or copy is made in two obvious places
 * rather than reasoned about twice.
 *
 * The flow leaves the app. Paystack's checkout opens in the phone's browser,
 * where the payer picks M-Pesa or a card, and control comes back only when they
 * switch back here. So there is no deep link and no custom URL scheme: this
 * app never needs to be *told* what happened, because the backend already knows
 * from Paystack's webhook. It just has to ask, which usePaymentStatus does the
 * moment the app is in the foreground again.
 *
 * Not using an in-app browser (expo-web-browser) is the same decision from the
 * other side: it is another native module in a build that has to clear the Play
 * Store, in exchange for closing a browser tab automatically.
 */

import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useTheme } from "@/theme/ThemeContext";

const PRESETS = [100, 250, 500, 1000];
const MIN = 50;
const MAX = 10_000;

export function TipSection() {
  const t = useTheme();

  const [amount, setAmount] = useState(250);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const { payment, state } = usePaymentStatus(reference);

  const effectiveAmount = custom.trim() ? Number(custom) : amount;
  const amountValid =
    Number.isInteger(effectiveAmount) && effectiveAmount >= MIN && effectiveAmount <= MAX;

  const card = [st.card, { borderColor: t.border, backgroundColor: t.surface }];

  async function submit() {
    if (!amountValid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await api.createTip(effectiveAmount);
      const opened = await Linking.canOpenURL(created.authorization_url);
      if (!opened) {
        // No browser to hand this to. Showing the URL beats a button that
        // silently does nothing — the checkout exists either way, and the
        // payer can finish it anywhere.
        Alert.alert("Open this to pay", created.authorization_url);
      } else {
        await Linking.openURL(created.authorization_url);
      }
      // Set last: polling starts on the next foreground, which is when they
      // come back from the browser.
      setReference(created.reference);
    } catch (err) {
      setError(userMessage(err, "Couldn't start the payment. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setReference(null);
    setError(null);
    setCustom("");
  }

  // ── Waiting for an answer ──────────────────────────────────────────────────

  if (reference && state !== "settled") {
    const gaveUp = state === "gave-up";
    return (
      <View style={card}>
        <View style={{ alignItems: "center", padding: 20, gap: 10 }}>
          {!gaveUp && <ActivityIndicator size="large" color={t.brand(600)} />}
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.text, textAlign: "center" }}>
            {gaveUp ? "Still waiting to hear back" : "Finish paying in your browser"}
          </Text>
          <Text style={{ fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 19 }}>
            {gaveUp
              ? "If you completed the payment it will have gone through — Paystack emails a receipt. Nothing is charged twice by trying again."
              : "Come back here once you're done and we'll confirm it. Paystack handles the payment — M-Pesa or card."}
          </Text>
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.brand(600), marginTop: 4 }}>
              {gaveUp ? "Back" : "Cancel"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Settled ────────────────────────────────────────────────────────────────

  if (reference && state === "settled" && payment) {
    const ok = payment.status === "completed";
    return (
      <View
        style={[
          st.card,
          {
            borderColor: ok ? t.success : t.border,
            backgroundColor: ok ? t.successBg : t.surface,
          },
        ]}
      >
        <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.text, textAlign: "center" }}>
            {ok ? "Thank you." : "That payment didn't go through"}
          </Text>
          <Text style={{ fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 19 }}>
            {ok
              ? `Your ${payment.currency} ${payment.amount} went through. It genuinely helps — this is a one-person project.`
              : // Our sentence, from our own record. Paystack's wording never
                // reaches this line.
                payment.failure_reason ?? "No money was taken."}
          </Text>
          <Pressable onPress={reset} accessibilityRole="button" hitSlop={8}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: t.brand(600), marginTop: 4 }}>
              {ok ? "Send another" : "Try again"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── The form ───────────────────────────────────────────────────────────────

  return (
    <View style={card}>
      <View style={{ padding: 14, gap: 12 }}>
        <Text style={{ fontSize: 13, color: t.textMuted, lineHeight: 19 }}>
          Everything here is free and stays free — tipping buys you nothing extra,
          which is rather the point. It just keeps the servers on.
        </Text>

        <View style={{ flexDirection: "row", gap: 8 }}>
          {PRESETS.map((preset) => {
            const selected = !custom.trim() && amount === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  setAmount(preset);
                  setCustom("");
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  st.preset,
                  {
                    borderColor: selected ? t.brand(600) : t.border,
                    backgroundColor: selected ? t.brand(50) : "transparent",
                    opacity: pressed ? 0.6 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: selected ? t.brand(700) : t.text,
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          value={custom}
          onChangeText={setCustom}
          keyboardType="number-pad"
          placeholder={`Or another amount (KES ${MIN}–${MAX.toLocaleString()})`}
          placeholderTextColor={t.textFaint}
          style={[st.input, { borderColor: t.border, color: t.text }]}
        />

        {error && <Text style={{ fontSize: 13, color: t.danger }}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={!amountValid || submitting}
          accessibilityRole="button"
          style={({ pressed }) => [
            st.pay,
            {
              backgroundColor: t.brand(600),
              opacity: !amountValid || submitting ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          {submitting && <ActivityIndicator size="small" color="#ffffff" />}
          <Text style={{ color: "#ffffff", fontSize: 15, fontWeight: "700" }}>
            {submitting
              ? "Opening Paystack…"
              : `Continue · KES ${amountValid ? effectiveAmount.toLocaleString() : "—"}`}
          </Text>
        </Pressable>

        <Text style={{ fontSize: 11, color: t.textFaint, textAlign: "center", lineHeight: 15 }}>
          Payment happens on Paystack, in your browser. We never see your card or
          PIN.
        </Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  preset: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  pay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
  },
});
