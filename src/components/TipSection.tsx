import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { useTheme } from "@/theme/ThemeContext";
import type { Payment } from "@/types";

const CR_COLOR = "#1a3a6b";
const PRESETS = [100, 250, 500, 1000];
const MIN = 50;
const MAX = 10_000;

const POLL_INTERVAL_MS = 3000;
// Safaricom expires an unanswered prompt after about a minute. Two minutes
// covers a slow phone and a slow human; past that a spinner is a lie.
const POLL_CEILING_MS = 120_000;

type Phase =
  | { name: "form" }
  | { name: "waiting"; payment: Payment }
  | { name: "settled"; payment: Payment }
  | { name: "gave-up" };

/**
 * "Buy the developer a coffee", at the bottom of the account screen.
 *
 * The waiting state is the design problem: between submitting and the prompt
 * resolving, the interesting thing is happening on the user's own lock screen,
 * not in this app. So the copy points at the phone, and polling is bounded.
 */
export function TipSection() {
  const t = useTheme();

  const [amount, setAmount] = useState(250);
  const [custom, setCustom] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState<Phase>({ name: "form" });

  const startedAt = useRef(0);
  const pollingId = phase.name === "waiting" ? phase.payment.id : null;

  const effectiveAmount = custom.trim() ? Number(custom) : amount;
  const amountValid =
    Number.isInteger(effectiveAmount) && effectiveAmount >= MIN && effectiveAmount <= MAX;

  useEffect(() => {
    if (!pollingId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const payment = await api.getPayment(pollingId);
        if (cancelled) return;
        if (payment.status !== "pending") {
          setPhase({ name: "settled", payment });
          return;
        }
        if (Date.now() - startedAt.current > POLL_CEILING_MS) {
          setPhase({ name: "gave-up" });
          return;
        }
      } catch {
        // A dropped poll says nothing about the payment — Safaricom is
        // deciding either way. Keep asking until the ceiling.
        if (Date.now() - startedAt.current > POLL_CEILING_MS) return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pollingId]);

  async function submit() {
    if (!amountValid || !phone.trim() || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const payment = await api.createTip(phone.trim(), effectiveAmount);
      startedAt.current = Date.now();
      setPhase({ name: "waiting", payment });
    } catch (err) {
      setError(userMessage(err, "Couldn't start the payment. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setPhase({ name: "form" });
    setError(null);
    setCustom("");
  }

  const card = [st.card, { borderColor: t.border, backgroundColor: t.surface }];

  // ── Waiting ────────────────────────────────────────────────────────────────
  if (phase.name === "waiting") {
    return (
      <View style={card}>
        <View style={{ alignItems: "center", padding: 20, gap: 10 }}>
          <ActivityIndicator size="large" color={CR_COLOR} />
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.text }}>Check your phone</Text>
          <Text style={{ fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 19 }}>
            We&apos;ve sent an M-Pesa request for KES {phase.payment.amount} to{" "}
            {phase.payment.phone_number}. Enter your PIN to confirm.
          </Text>
          {phase.payment.reused_existing && (
            <Text style={{ fontSize: 11, color: t.textFaint, textAlign: "center" }}>
              You already had a request in progress, so we didn&apos;t send another.
            </Text>
          )}
        </View>
      </View>
    );
  }

  // ── Settled ────────────────────────────────────────────────────────────────
  if (phase.name === "settled") {
    const ok = phase.payment.status === "completed";
    return (
      <View style={[st.card, { borderColor: t.border, backgroundColor: ok ? t.successBg : t.surface }]}>
        <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
          <Text style={{ fontSize: 26 }}>{ok ? "♞" : "♟"}</Text>
          <Text style={{ fontSize: 15, fontWeight: "700", color: ok ? t.success : t.text }}>
            {ok ? "Thank you — genuinely." : "That didn't go through"}
          </Text>
          <Text style={{ fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 19 }}>
            {ok
              ? `KES ${phase.payment.amount} received. Receipt ${phase.payment.mpesa_receipt}.`
              : phase.payment.failure_reason}
          </Text>
          <Pressable onPress={reset} style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: CR_COLOR }}>
              {ok ? "Send another" : "Try again"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Gave up ────────────────────────────────────────────────────────────────
  if (phase.name === "gave-up") {
    return (
      <View style={card}>
        <View style={{ alignItems: "center", padding: 20, gap: 8 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: t.text }}>
            Still waiting on M-Pesa
          </Text>
          <Text style={{ fontSize: 13, color: t.textMuted, textAlign: "center", lineHeight: 19 }}>
            We&apos;ve stopped checking, but nothing is lost — if you completed the prompt it
            is still recorded. If it never arrived, try again.
          </Text>
          <Pressable onPress={reset} style={{ paddingVertical: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: CR_COLOR }}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <View style={card}>
      <View style={{ padding: 14, gap: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name="cafe-outline" size={18} color={CR_COLOR} />
          <Text style={{ fontSize: 13, color: t.textMuted, flex: 1, lineHeight: 18 }}>
            Built and paid for by one person in Nairobi. Nothing is locked behind this.
          </Text>
        </View>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {PRESETS.map((preset) => {
            const active = !custom.trim() && amount === preset;
            return (
              <Pressable
                key={preset}
                onPress={() => {
                  setAmount(preset);
                  setCustom("");
                }}
                style={[
                  st.preset,
                  active
                    ? { borderColor: CR_COLOR, backgroundColor: CR_COLOR }
                    : { borderColor: t.border, backgroundColor: t.elevated },
                ]}
              >
                <Text
                  style={{ fontSize: 13, fontWeight: "700", color: active ? "#fff" : t.text }}
                >
                  {preset}
                </Text>
              </Pressable>
            );
          })}
          <TextInput
            value={custom}
            onChangeText={setCustom}
            placeholder="Other"
            placeholderTextColor={t.textFaint}
            keyboardType="number-pad"
            style={[st.other, { borderColor: t.border, color: t.text, backgroundColor: t.elevated }]}
          />
        </View>

        {custom.trim().length > 0 && !amountValid && (
          <Text style={{ fontSize: 11, color: t.danger }}>
            Enter a whole amount between KES {MIN} and KES {MAX.toLocaleString()}.
          </Text>
        )}

        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="07XX XXX XXX"
          placeholderTextColor={t.textFaint}
          keyboardType="phone-pad"
          autoComplete="tel"
          style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.elevated }]}
        />

        {error && <Text style={{ fontSize: 12, color: t.danger }}>{error}</Text>}

        <Pressable
          onPress={submit}
          disabled={!amountValid || !phone.trim() || submitting}
          style={[
            st.submit,
            { backgroundColor: CR_COLOR, opacity: !amountValid || !phone.trim() || submitting ? 0.5 : 1 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>
              Send KES {amountValid ? effectiveAmount : "—"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  preset: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  other: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 38, width: 82, fontSize: 13 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, height: 44, fontSize: 14 },
  submit: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
});
