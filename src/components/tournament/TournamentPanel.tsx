import { useEffect, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchActiveTournament, createTournament, upsertPairing, closeTournament } from "@/redux/actions/tournament";
import { prepareOpponent } from "@/lib/prepareOpponent";
import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";
import type { Pairing } from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RESULT_LABELS: Record<string, { label: string; color: string }> = {
  win: { label: "Won", color: "#059669" },
  draw: { label: "Draw", color: "#6b7280" },
  loss: { label: "Lost", color: "#dc2626" },
};

function getNextPairing(pairings: Pairing[]): Pairing | null {
  const pending = pairings.filter((p) => !p.result);
  if (pending.length > 0) return pending.reduce((a, b) => (b.round_number > a.round_number ? b : a));
  if (pairings.length > 0) return pairings.reduce((a, b) => (b.round_number > a.round_number ? b : a));
  return null;
}

function CreateTournamentForm() {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { loading, error } = useAppSelector((s) => s.tournament);
  const [url, setUrl] = useState("");
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <Pressable onPress={() => setOpen(true)} style={[st.trigger, { borderColor: t.border }]}>
        <Ionicons name="add" size={15} color={t.textMuted} />
        <Text style={{ fontSize: 12, color: t.textMuted, fontWeight: "500" }}>Playing in a tournament?</Text>
      </Pressable>
    );
  }

  return (
    <View style={[st.createBox, { borderColor: t.brand(200), backgroundColor: t.brand(50) }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>Start tournament tracking</Text>
        <Pressable onPress={() => setOpen(false)}>
          <Ionicons name="close" size={16} color={t.textMuted} />
        </Pressable>
      </View>
      <TextInput
        value={url}
        onChangeText={setUrl}
        placeholder="https://chess-results.com/tnr…"
        placeholderTextColor={t.textFaint}
        autoCapitalize="none"
        style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
      />
      {error && <Text style={{ fontSize: 11, color: t.danger, marginTop: 6 }}>{error}</Text>}
      <Button
        title={loading ? "Fetching tournament…" : "Start tournament"}
        loading={loading}
        disabled={!url.trim()}
        size="sm"
        style={{ marginTop: 10 }}
        onPress={() => url.trim() && dispatch(createTournament({ url: url.trim() }))}
      />
    </View>
  );
}

function PairingForm({ tournamentId, onClose }: { tournamentId: number; onClose: () => void }) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { active } = useAppSelector((s) => s.tournament);
  const nextRound = active?.pairings.length ? Math.max(...active.pairings.map((p) => p.round_number)) + 1 : 1;

  const [round, setRound] = useState(String(nextRound));
  const [opponent, setOpponent] = useState("");
  const [color, setColor] = useState<"white" | "black" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit() {
    if (!opponent.trim() || !round) return;
    setSubmitting(true);
    setErr(null);
    try {
      const result: any = await dispatch(upsertPairing({ tournamentId, pairing: { round_number: Number(round), opponent_name: opponent.trim(), color, result: "" } }));
      if (result?.errors) setErr(String(result.errors));
      else onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to save pairing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[st.pairingForm, { borderColor: t.border, backgroundColor: t.elevated }]}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput value={round} onChangeText={setRound} keyboardType="number-pad" style={[st.roundInput, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]} />
        <TextInput value={opponent} onChangeText={setOpponent} placeholder="Opponent name" placeholderTextColor={t.textFaint} style={[st.input, { flex: 1, borderColor: t.border, color: t.text, backgroundColor: t.surface }]} />
      </View>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        {(["", "white", "black"] as const).map((c) => (
          <Pressable key={c} onPress={() => setColor(c)} style={[st.colorChip, color === c ? { backgroundColor: t.brand(600), borderColor: t.brand(600) } : { borderColor: t.border }]}>
            <Text style={{ fontSize: 11, color: color === c ? "#fff" : t.textMuted }}>{c === "" ? "Unknown" : c === "white" ? "White" : "Black"}</Text>
          </Pressable>
        ))}
      </View>
      {err && <Text style={{ fontSize: 11, color: t.danger, marginTop: 6 }}>{err}</Text>}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 10 }}>
        <Button title={submitting ? "Saving…" : "Save pairing"} size="sm" loading={submitting} disabled={!opponent.trim()} onPress={handleSubmit} />
        <Pressable onPress={onClose}><Text style={{ fontSize: 12, color: t.textMuted }}>Cancel</Text></Pressable>
      </View>
    </View>
  );
}

function ActiveTournamentView() {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { active } = useAppSelector((s) => s.tournament);
  const [showPairingForm, setShowPairingForm] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  if (!active) return null;
  const activeId = active.id;
  const nextPairing = getNextPairing(active.pairings);
  const hasResult = nextPairing?.result;
  const hasChessResultsUrl = active.url.includes("chess-results.com");

  async function handlePrepare() {
    if (!nextPairing) return;
    setPreparing(true);
    setPrepError(null);
    try {
      const slug = await prepareOpponent({ name: nextPairing.opponent_name, fide_id: null, federation: null });
      navigation.navigate("PlayerImport", { slug, source: "chess_results" });
    } catch (e) {
      setPrepError(e instanceof Error ? e.message : "Failed to open prep");
    } finally {
      setPreparing(false);
    }
  }

  function handleClose() {
    if (!confirmClose) { setConfirmClose(true); return; }
    dispatch(closeTournament(activeId));
    setConfirmClose(false);
  }

  return (
    <View style={[st.activeBox, { borderColor: t.brand(200), backgroundColor: t.brand(50) }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: t.brand(600), textTransform: "uppercase" }}>Active Tournament</Text>
          <Pressable onPress={() => active.url && Linking.openURL(active.url)}>
            <Text style={{ fontSize: 15, fontWeight: "800", color: t.text, marginTop: 2 }} numberOfLines={1}>{active.name}</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {hasChessResultsUrl && (
            <Pressable onPress={() => navigation.navigate("TournamentPlayers")} style={[st.smallBtn, { borderColor: t.brand(300), backgroundColor: t.brand(100) }]}>
              <Text style={{ fontSize: 11, fontWeight: "600", color: t.brand(700) }}>View Players</Text>
            </Pressable>
          )}
          <Pressable onPress={handleClose} style={[st.smallBtn, confirmClose ? { backgroundColor: t.dangerBg } : null]}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: confirmClose ? t.danger : t.textMuted }}>{confirmClose ? "Confirm end" : "End"}</Text>
          </Pressable>
        </View>
      </View>

      {nextPairing ? (
        <View style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: t.textMuted, textTransform: "uppercase" }}>{hasResult ? "Last round" : "Next opponent"}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: t.text }}>{nextPairing.opponent_name}</Text>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
                <Text style={{ fontSize: 11, color: t.textMuted }}>Round {nextPairing.round_number}</Text>
                {nextPairing.color && <Text style={{ fontSize: 11, color: t.textMuted }}>· {nextPairing.color}</Text>}
                {hasResult && <Text style={{ fontSize: 11, color: RESULT_LABELS[nextPairing.result]?.color }}>· {RESULT_LABELS[nextPairing.result]?.label}</Text>}
              </View>
            </View>
            {!hasResult && <Button title={preparing ? "Opening…" : "Prepare →"} size="sm" loading={preparing} onPress={handlePrepare} />}
          </View>
          {prepError && <Text style={{ fontSize: 11, color: t.danger, marginTop: 4 }}>{prepError}</Text>}
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 10 }}>No pairings yet. Add your first round pairing below.</Text>
      )}

      {showPairingForm ? (
        <PairingForm tournamentId={active.id} onClose={() => setShowPairingForm(false)} />
      ) : (
        <Pressable onPress={() => setShowPairingForm(true)} style={{ marginTop: 10 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: t.brand(600) }}>{active.pairings.length === 0 ? "+ Add pairing" : "↻ Update pairing"}</Text>
        </Pressable>
      )}
    </View>
  );
}

export function TournamentPanel() {
  const dispatch = useAppDispatch();
  const { active, initialized } = useAppSelector((s) => s.tournament);
  const { token } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (token && !initialized) dispatch(fetchActiveTournament());
  }, [dispatch, token, initialized]);

  if (!token || !initialized) return null;

  return <View style={{ marginBottom: 16 }}>{active ? <ActiveTournamentView /> : <CreateTournamentForm />}</View>;
}

const st = StyleSheet.create({
  trigger: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, justifyContent: "center" },
  createBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  activeBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, height: 38, fontSize: 13 },
  smallBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  pairingForm: { marginTop: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  roundInput: { width: 60, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, height: 38, fontSize: 13, textAlign: "center" },
  colorChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
});
