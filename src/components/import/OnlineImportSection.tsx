import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { GAME_SOURCES, tint } from "@/lib/games";
import { useTheme } from "@/theme/ThemeContext";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportJobProgress } from "./ImportJobProgress";
import { useImportJob } from "./useImportJob";
import type { PlayerAccount } from "@/types";

// 300 is the server's ceiling for both (ChessComImportSerializer.limit and
// LichessImportSerializer.limit), so "fetch more" runs out here. Re-importing
// is safe: ingest_pgn upserts, so a wider fetch re-reads games we already have
// rather than duplicating them.
const LIMITS = [25, 50, 100, 200, 300];
const MAX_LIMIT = LIMITS[LIMITS.length - 1];

type Platform = "chesscom" | "lichess";

/** What differs between the two sites; everything else is the same panel. */
const SITES: Record<
  Platform,
  {
    name: string;
    color: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    placeholder: string;
    runningLabel: string;
    start: (slug: string, body: { username: string; limit: number }) => ReturnType<typeof api.importFromChessCom>;
  }
> = {
  chesscom: {
    name: "Chess.com",
    color: GAME_SOURCES.chess_com.color,
    icon: "logo-buffer",
    placeholder: "e.g. hikaru",
    runningLabel: "Fetching archives from Chess.com…",
    start: (slug, body) => api.importFromChessCom(slug, body),
  },
  lichess: {
    name: "Lichess",
    color: GAME_SOURCES.lichess.color,
    icon: "game-controller-outline",
    placeholder: "e.g. DrNykterstein",
    runningLabel: "Fetching games from Lichess…",
    start: (slug, body) => api.importFromLichess(slug, body),
  },
};

/** Import a player's recent games from Chess.com or Lichess: one panel for both. */
export function OnlineImportSection({
  platform,
  slug,
  accounts = [],
  onUpdated,
}: {
  platform: Platform;
  slug: string;
  accounts?: PlayerAccount[];
  onUpdated?: () => void | Promise<void>;
}) {
  const t = useTheme();
  const site = SITES[platform];
  const COLOR = site.color;
  const siteAccounts = accounts.filter((a) => a.platform === platform);
  const [username, setUsername] = useState(siteAccounts[0]?.username || "");
  const [limit, setLimit] = useState(50);
  // The import runs in the worker service now, so this holds a job id and
  // polls. `matches` keeps this panel showing this site's work only — a player
  // can have a chess-results import running at the same time.
  const { job, starting, error: errorMsg, start, cancel, reset, isRunning } = useImportJob({
    slug,
    matches: (j) => j.results?.[0]?.name?.startsWith(site.name) ?? false,
    onSettled: async () => { await onUpdated?.(); },
  });

  const canSubmit = username.trim().length > 0 && !starting && !isRunning;

  // Takes the count as an argument rather than reading `limit`: "fetch more"
  // raises it and re-runs in one go, and the state setter has not landed yet.
  async function handleImport(fetchLimit: number) {
    if (!canSubmit) return;
    await start(
      () => site.start(slug, { username: username.trim(), limit: fetchLimit }),
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
      <View style={[st.card, { borderColor: tint(COLOR, 0.35), backgroundColor: tint(COLOR, 0.06) }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
          <View style={[st.iconBox, { backgroundColor: COLOR }]}>
            <Ionicons name={site.icon} size={18} color="#fff" />
          </View>
          <View>
            <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>Import from {site.name}</Text>
            <Text style={{ fontSize: 11, color: t.textMuted }}>Fetch the opponent's recent public games</Text>
          </View>
        </View>

        {siteAccounts.length > 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {siteAccounts.map((a) => (
              <Pressable
                key={a.id}
                onPress={() => { setUsername(a.username); reset(); }}
                style={[st.accountChip, username === a.username ? { backgroundColor: COLOR, borderColor: COLOR } : { borderColor: t.border }]}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: username === a.username ? "#fff" : t.textMuted }}>{a.username}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginBottom: 6 }}>{site.name} username</Text>
        <TextInput
          value={username}
          onChangeText={(v) => { setUsername(v); reset(); }}
          placeholder={site.placeholder}
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
        />

        <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginTop: 12, marginBottom: 6 }}>Games to fetch</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {LIMITS.map((l) => (
            <Pressable key={l} onPress={() => setLimit(l)} style={[st.limitChip, limit === l ? { backgroundColor: COLOR, borderColor: COLOR } : { borderColor: t.border }]}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: limit === l ? "#fff" : t.textMuted }}>{l}</Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 }}>
          <Pressable onPress={() => handleImport(limit)} disabled={!canSubmit} style={[st.submitBtn, { backgroundColor: COLOR, opacity: !canSubmit ? 0.5 : 1 }]}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              {starting ? "Queueing…" : isRunning ? "Import running…" : `Import from ${site.name}`}
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
          accent={COLOR}
          runningLabel={site.runningLabel}
        />

        {job?.status === "succeeded" && (
          nextLimit ? (
            <Pressable onPress={handleFetchMore} style={[st.fetchMoreBtn, { borderColor: COLOR }]}>
              <Ionicons name="reload-outline" size={14} color={COLOR} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: COLOR }}>Fetch more — go back {nextLimit} games</Text>
            </Pressable>
          ) : (
            <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 10 }}>
              {MAX_LIMIT} games is as far back as {site.name} imports go.
            </Text>
          )
        )}
      </View>
      <ConnectedAccountManager slug={slug} platform={platform} accounts={accounts} onUpdated={onUpdated} />
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
