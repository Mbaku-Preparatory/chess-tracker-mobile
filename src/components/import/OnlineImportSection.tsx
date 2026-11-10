import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api } from "@/lib/api";
import { GAME_SOURCES, tint } from "@/lib/games";
import { useTheme } from "@/theme/ThemeContext";
import { NotifyMeSwitch, useNotifyMe } from "@/components/ui/NotifyMeSwitch";
import { ConnectedAccountManager } from "./ConnectedAccountManager";
import { ImportElsewhereNote } from "./ImportElsewhereNote";
import { ImportJobProgress } from "./ImportJobProgress";
import { useImportJob } from "./useImportJob";
import type { OnlineImportRequest, PlayerAccount, TimeClass } from "@/types";

// The most one import can fetch: the server's ceiling (ONLINE_MAX_GAMES in the
// backend's import_entries.py). It fetches in pages of 1,000. Same options as
// the web form.
const ALL_GAMES = 10000;

/** "Games to fetch": a number of the newest games, or every game in a period. */
const FETCH_OPTIONS: { label: string; limit: number; sinceDays?: number }[] = [
  ...[25, 50, 100, 200, 500, 1000].map((n) => ({ label: String(n), limit: n })),
  { label: "Last 3 months", limit: ALL_GAMES, sinceDays: 90 },
  { label: "Last 12 months", limit: ALL_GAMES, sinceDays: 365 },
  { label: "All", limit: ALL_GAMES },
];
type FetchOption = (typeof FETCH_OPTIONS)[number];

const TIME_CLASSES: { id: TimeClass; label: string }[] = [
  { id: "bullet", label: "Bullet" },
  { id: "blitz", label: "Blitz" },
  { id: "rapid", label: "Rapid" },
  { id: "classical", label: "Classical" },
  { id: "daily", label: "Daily" },
];

/**
 * "Fetch more" after an import: the next bigger count, up to All. Not after a
 * period, which already took every game in it. Re-importing is safe:
 * ingest_pgn upserts, so a wider fetch re-reads games we already have.
 */
const fetchMoreAfter = (o: FetchOption) =>
  o.sinceDays ? undefined : FETCH_OPTIONS.find((n) => !n.sinceDays && n.limit > o.limit);

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
    start: (slug: string, body: OnlineImportRequest) => ReturnType<typeof api.importFromChessCom>;
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
  const [choice, setChoice] = useState<FetchOption>(FETCH_OPTIONS[1]); // 50
  const [timeClasses, setTimeClasses] = useState<TimeClass[]>(TIME_CLASSES.map((c) => c.id));
  const [notifyEmail, setNotifyEmail] = useNotifyMe();

  function choose(option: FetchOption) {
    setChoice(option);
    // "All" and the periods can take minutes: offer the email (they can switch it off).
    if (option.limit === ALL_GAMES) setNotifyEmail(true);
  }

  function toggleTimeClass(id: TimeClass) {
    const on = timeClasses.includes(id);
    if (on && timeClasses.length === 1) return; // keep at least one
    setTimeClasses(TIME_CLASSES.map((c) => c.id).filter((c) => (c === id ? !on : timeClasses.includes(c))));
  }
  // The import runs in the worker service, so this holds a job id and polls.
  // `source` keeps this panel showing this site's work only; `elsewhere` is
  // another import for this player.
  const { job, starting, error: errorMsg, start, cancel, reset, isRunning, elsewhere } = useImportJob({
    slug,
    source: platform,
    onSettled: async () => { await onUpdated?.(); },
  });

  const canSubmit = username.trim().length > 0 && !starting && !isRunning;

  // Takes the option and the email choice as arguments rather than reading
  // state: "fetch more" changes both and re-runs in one go, and the state
  // setters have not landed yet.
  async function handleImport(option: FetchOption, notify: boolean) {
    if (!canSubmit) return;
    await start(
      () => site.start(slug, {
        username: username.trim(),
        limit: option.limit,
        since_days: option.sinceDays ?? null,
        time_classes: timeClasses,
        notify_email: notify,
      }),
      "Import failed. Check the username and try again.",
    );
  }

  const next = fetchMoreAfter(choice);

  function handleFetchMore() {
    if (!next) return;
    choose(next);
    handleImport(next, notifyEmail || next.limit === ALL_GAMES);
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
              <Chip key={a.id} label={a.username} on={username === a.username} color={COLOR} onPress={() => { setUsername(a.username); reset(); }} />
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
        <View style={st.chipRow}>
          {FETCH_OPTIONS.map((o) => (
            <Chip key={o.label} label={o.label} on={choice.label === o.label} color={COLOR} onPress={() => choose(o)} />
          ))}
        </View>

        <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginTop: 12, marginBottom: 6 }}>Time controls</Text>
        <View style={st.chipRow}>
          {TIME_CLASSES.map((c) => (
            <Chip key={c.id} label={c.label} on={timeClasses.includes(c.id)} color={COLOR} onPress={() => toggleTimeClass(c.id)} />
          ))}
        </View>

        {choice.limit > 200 && (
          <Text style={{ fontSize: 12, color: t.textFaint, marginTop: 10 }}>
            {choice.sinceDays
              ? `Every game from the ${choice.label.toLowerCase()}, up to ${ALL_GAMES}. This can take a few minutes.`
              : choice.limit === ALL_GAMES
                ? `Up to their newest ${ALL_GAMES} games. This can take ten minutes or so.`
                : `${choice.label} games take a minute or two.`}{" "}
            You can leave this screen; the import keeps going.
          </Text>
        )}

        <View style={{ marginTop: 12 }}>
          <NotifyMeSwitch value={notifyEmail} onValueChange={setNotifyEmail} label="Email me when this is done" />
        </View>

        {elsewhere && !isRunning && (
          <View style={{ marginTop: 12 }}>
            <ImportElsewhereNote job={elsewhere} />
          </View>
        )}

        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 16 }}>
          <Pressable onPress={() => handleImport(choice, notifyEmail)} disabled={!canSubmit} style={[st.submitBtn, { backgroundColor: COLOR, opacity: !canSubmit ? 0.5 : 1 }]}>
            <Text style={{ color: "#fff", fontSize: 13, fontWeight: "700" }}>
              {starting ? "Queueing…" : isRunning ? "Import running…" : elsewhere ? "Add to queue" : `Import from ${site.name}`}
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

        {job?.status === "succeeded" && next && (
          <Pressable onPress={handleFetchMore} style={[st.fetchMoreBtn, { borderColor: COLOR }]}>
            <Ionicons name="reload-outline" size={14} color={COLOR} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: COLOR }}>
              {next.limit === ALL_GAMES ? "Fetch all their games" : `Fetch more — go back ${next.label} games`}
            </Text>
          </Pressable>
        )}
      </View>
      <ConnectedAccountManager slug={slug} platform={platform} accounts={accounts} onUpdated={onUpdated} />
    </View>
  );
}

/** An on/off chip in the site's colour: saved accounts, games to fetch, time controls. */
function Chip({ label, on, color, onPress }: { label: string; on: boolean; color: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityState={{ selected: on }}
      style={[st.chip, on ? { backgroundColor: color, borderColor: color } : { borderColor: t.border }]}
    >
      <Text style={{ fontSize: 12, fontWeight: "600", color: on ? "#fff" : t.textMuted }}>{label}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16 },
  iconBox: { height: 36, width: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fetchMoreBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingVertical: 10 },
  submitBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  errorBox: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  metaPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
