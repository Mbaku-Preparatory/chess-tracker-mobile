import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportResultPanel } from "./ImportResultPanel";
import type { LichessImportResult, PGNImportResult, PlayerAccount } from "@/types";
import { userMessage } from "@/lib/apiError";

// 300 is the server's ceiling (LichessImportSerializer.limit), so "fetch more"
// runs out here. Re-importing is safe: ingest_pgn upserts, so a wider fetch
// re-reads games we already have rather than duplicating them.
const LIMITS = [25, 50, 100, 200, 300];
const MAX_LIMIT = LIMITS[LIMITS.length - 1];
const LI_COLOR = "#b05000";

type Status = "idle" | "loading" | "success" | "error";

export function LichessImportSection({
  slug,
  accounts = [],
  onUpdated,
}: {
  slug: string;
  accounts?: PlayerAccount[];
  onUpdated?: () => void | Promise<void>;
}) {
  const t = useTheme();
  const lichessAccounts = accounts.filter((a) => a.platform === "lichess");
  const [username, setUsername] = useState(lichessAccounts[0]?.username || "");
  const [limit, setLimit] = useState(50);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<LichessImportResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canSubmit = username.trim().length > 0 && status !== "loading";

  // Takes the count as an argument rather than reading `limit`: "fetch more"
  // raises it and re-runs in one go, and the state setter has not landed yet.
  async function handleImport(fetchLimit: number) {
    if (!canSubmit) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setResult(null);
    setErrorMsg(null);
    try {
      const data = await api.importFromLichess(slug, { username: username.trim(), limit: fetchLimit }, controller.signal);
      setResult(data);
      setStatus("success");
      await onUpdated?.();
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setErrorMsg(userMessage(err, "Import failed. Check the username and try again."));
      setStatus("error");
    }
  }

  const nextLimit = LIMITS.find((l) => l > limit);

  function handleFetchMore() {
    if (!nextLimit) return;
    setLimit(nextLimit);
    handleImport(nextLimit);
  }

  return (
    <View>
      <View style={[st.card, { borderColor: "rgba(176,80,0,0.35)", backgroundColor: "rgba(176,80,0,0.06)" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <View style={[st.iconBox, { backgroundColor: LI_COLOR }]}>
            <Ionicons name="game-controller-outline" size={18} color="#fff" />
          </View>
          <View>
            <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>Import from Lichess</Text>
            <Text style={{ fontSize: 11, color: t.textMuted }}>Fetch the opponent's recent public games</Text>
          </View>
        </View>

        {lichessAccounts.length > 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {lichessAccounts.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => { setUsername(a.username); setResult(null); setStatus("idle"); }}
                style={[st.accountChip, username === a.username ? { backgroundColor: LI_COLOR, borderColor: LI_COLOR } : { borderColor: t.border }]}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: username === a.username ? "#fff" : t.textMuted }}>{a.username}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginBottom: 6 }}>Lichess username</Text>
        <TextInput
          value={username}
          onChangeText={(v) => { setUsername(v); setResult(null); setErrorMsg(null); setStatus("idle"); }}
          placeholder="e.g. DrNykterstein"
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
        />

        <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginTop: 12, marginBottom: 6 }}>Games to fetch</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {LIMITS.map((l) => (
            <Pressable key={l} onPress={() => setLimit(l)} style={[st.limitChip, limit === l ? { backgroundColor: LI_COLOR, borderColor: LI_COLOR } : { borderColor: t.border }]}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: limit === l ? "#fff" : t.textMuted }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 }}>
          <Pressable onPress={() => handleImport(limit)} disabled={!canSubmit} style={[st.submitBtn, { backgroundColor: LI_COLOR, opacity: !canSubmit ? 0.5 : 1 }]}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              {status === "loading" ? "Fetching games…" : "Import from Lichess"}
            </Text>
          </Pressable>
          {status === "loading" && (
            <Pressable onPress={() => { abortRef.current?.abort(); setStatus("idle"); }}>
              <Text style={{ fontSize: 12, color: t.textMuted }}>Cancel</Text>
            </Pressable>
          )}
        </View>

        {status === "loading" && (
          // The request is synchronous and held by this component: leaving the
          // screen or backgrounding the app aborts it, and nothing resumes it.
          <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 10 }}>
            Keep the app open — fetching {limit} games can take a minute.
          </Text>
        )}

        {status === "error" && errorMsg && (
          <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
            <Text style={{ color: t.danger, fontSize: 12 }}>{errorMsg}</Text>
          </View>
        )}

        {status === "success" && result && (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              <View style={[st.metaPill, { backgroundColor: t.elevated }]}>
                <Text style={{ fontSize: 11, color: t.textMuted }}>{result.fetch_meta.games_fetched} fetched</Text>
              </View>
            </View>
            <ImportResultPanel result={result as unknown as PGNImportResult} />
            {nextLimit ? (
              <Pressable onPress={handleFetchMore} style={[st.fetchMoreBtn, { borderColor: LI_COLOR }]}>
                <Ionicons name="reload-outline" size={14} color={LI_COLOR} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: LI_COLOR }}>Fetch more — go back {nextLimit} games</Text>
              </Pressable>
            ) : (
              <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 10 }}>
                {MAX_LIMIT} games is as far back as Lichess imports go.
              </Text>
            )}
          </View>
        )}
      </View>
      <ConnectedAccountManager slug={slug} platform="lichess" accounts={accounts} onUpdated={onUpdated} />
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16 },
  iconBox: { height: 36, width: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  accountChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14 },
  limitChip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  fetchMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10 },
  submitBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  errorBox: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  metaPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
