import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Button } from "@/components/ui/Button";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportJobProgress } from "./ImportJobProgress";
import { useImportJob } from "./useImportJob";
import type { PlayerAccount } from "@/types";

// 300 is the server's ceiling (LichessImportSerializer.limit), so "fetch more"
// runs out here. Re-importing is safe: ingest_pgn upserts, so a wider fetch
// re-reads games we already have rather than duplicating them.
const LIMITS = [25, 50, 100, 200, 300];
const MAX_LIMIT = LIMITS[LIMITS.length - 1];
const LI_COLOR = "#b05000";

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
  // The import runs in the worker service now, so this holds a job id and
  // polls. `matches` keeps this panel showing Chess.com work only — a player
  // can have a chess-results import running at the same time.
  const { job, starting, error: errorMsg, start, cancel, reset, isRunning } = useImportJob({
    slug,
    matches: (j) => j.results?.[0]?.name?.startsWith("Lichess") ?? false,
    onSettled: async () => { await onUpdated?.(); },
  });

  const canSubmit = username.trim().length > 0 && !starting && !isRunning;

  // Takes the count as an argument rather than reading `limit`: "fetch more"
  // raises it and re-runs in one go, and the state setter has not landed yet.
  async function handleImport(fetchLimit: number) {
    if (!canSubmit) return;
    await start(
      () => api.importFromLichess(slug, { username: username.trim(), limit: fetchLimit }),
      "Import failed. Check the username and try again.",
    );
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
                onPress={() => { setUsername(a.username); reset(); }}
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
          onChangeText={(v) => { setUsername(v); reset(); }}
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
              {starting ? "Queueing…" : isRunning ? "Import running…" : "Import from Lichess"}
            </Text>
          </Pressable>
        </View>

        {errorMsg && (
          <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
            <Text style={{ color: t.danger, fontSize: 12 }}>{errorMsg}</Text>
          </View>
        )}

        <ImportJobProgress
          job={job}
          onCancel={cancel}
          accent={LI_COLOR}
          runningLabel="Fetching games from Lichess…"
        />

        {job?.status === "succeeded" && (
          nextLimit ? (
            <Pressable onPress={handleFetchMore} style={[st.fetchMoreBtn, { borderColor: LI_COLOR }]}>
              <Ionicons name="reload-outline" size={14} color={LI_COLOR} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: LI_COLOR }}>Fetch more — go back {nextLimit} games</Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 10 }}>
              {MAX_LIMIT} games is as far back as Lichess imports go.
            </Text>
          )
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
