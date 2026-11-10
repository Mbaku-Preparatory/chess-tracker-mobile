import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import graphqlClient from "@/api/graphqlClient";
import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { requestNotificationPermissions } from "@/lib/notifications";
import { useTheme } from "@/theme/ThemeContext";
import { Button } from "@/components/ui/Button";
import { ImportProgressBar } from "@/components/import/ImportProgressBar";
import { useNotifyMe } from "@/components/ui/NotifyMeSwitch";
import { ImportElsewhereNote } from "./ImportElsewhereNote";
import { isTerminal, useImportJob } from "./useImportJob";
import type { RootStackParamList } from "@/navigation/types";
import type { ImportJob } from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const CR_COLOR = "#1a3a6b";

type Candidate = { fideId: string; fullName: string; federation: string; standardRating: number | null };

/**
 * Players on FIDE's rating list matching a name. Answered from our own copy of
 * the list, so it costs no request to FIDE or chess-results.
 */
async function searchRatingList(name: string): Promise<Candidate[]> {
  // JSON string escaping is valid GraphQL string syntax.
  const { data } = await graphqlClient({
    data: {
      query: `query { searchPublicPlayers(query: ${JSON.stringify(name)}, limit: 8) {
        fideId fullName federation standardRating
      } }`,
    },
  });
  return data?.data?.searchPublicPlayers ?? [];
}

/**
 * Imports every game chess-results has for one FIDE ID.
 *
 * chess-results' game search returns a whole career in one export, so there
 * is nothing to choose: the player's FIDE ID is the whole input. A player
 * without one on file can be looked up by name on FIDE's rating list.
 */
export function ChessResultsImportSection({
  slug,
  playerRef,
  fideId,
}: {
  slug: string;
  playerRef: string;
  fideId?: string | null;
}) {
  const t = useTheme();
  const navigation = useNavigation<Nav>();

  // The profile already knows who this is — don't offer to import someone else.
  const knownFideId = fideId?.trim() || "";

  const [fideInput, setFideInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null); // the name search's
  const [notifyEmail, setNotifyEmail] = useNotifyMe();

  // Reconnecting after the app was backgrounded (the OS can suspend it any
  // time, and component state doesn't survive that; the job row does),
  // polling, starting and cancelling: the same hook as the online panels.
  const { job, starting, error: jobError, start, cancel, reset, elsewhere } = useImportJob({
    slug,
    source: "chess_results",
  });

  function startImport(id: string) {
    if (!id) return;
    setError(null);
    start(() => api.createCareerImportJob(slug, id, notifyEmail), "Could not start the import.");
  }

  async function findByName() {
    if (!nameInput.trim()) return;
    setError(null);
    setSearching(true);
    try {
      const found = await searchRatingList(nameInput.trim());
      setCandidates(found);
      if (found.length === 0) setError("No rated players found with that name.");
    } catch (err) {
      setError(userMessage(err, "Search failed. Try again."));
    } finally {
      setSearching(false);
    }
  }

  const notifyRow = (
    <Pressable
      onPress={async () => {
        const next = !notifyEmail;
        setNotifyEmail(next);
        // Ask for the notification permission at the moment they ask to be
        // told — not out of nowhere later when the import happens to finish.
        // Declining still leaves the email, so the box remains ticked.
        if (next) await requestNotificationPermissions();
      }}
      style={[st.notifyRow, { borderColor: t.border, backgroundColor: t.surface }]}
    >
      <Ionicons
        name={notifyEmail ? "checkbox" : "square-outline"}
        size={18}
        color={notifyEmail ? CR_COLOR : t.textFaint}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>
          Tell me when this is done
        </Text>
        <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          A notification on this phone, and an email with a link to the player.
        </Text>
      </View>
    </Pressable>
  );

  const inputStyle = [st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }];
  const chosenId = knownFideId || fideInput.trim();

  return (
    <View style={[st.card, { borderColor: "rgba(26,58,107,0.35)", backgroundColor: "rgba(26,58,107,0.05)" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <View style={[st.iconBox, { backgroundColor: CR_COLOR }]}>
          <Ionicons name="trophy-outline" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>
            Import OTB Games from Chess-Results
          </Text>
          <Text style={{ fontSize: 11, color: t.textMuted }}>
            Every over-the-board game chess-results has for this player
          </Text>
        </View>
      </View>

      {job ? (
        <JobProgress
          job={job}
          error={jobError}
          onCancel={cancel}
          onReset={reset}
          onViewProfile={() => navigation.navigate("PlayerDetail", { slug: playerRef })}
        />
      ) : (
        <View style={{ gap: 10 }}>
          {knownFideId ? (
            // The ID is the identity. An editable field here only invites
            // importing another player's games onto this profile.
            <View style={[st.knownIdRow, { borderColor: t.border, backgroundColor: t.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: t.textMuted }}>FIDE ID</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: t.text }}>{knownFideId}</Text>
              </View>
              <View style={st.fromProfileBadge}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#047857" }}>From profile</Text>
              </View>
            </View>
          ) : (
            <>
              <TextInput
                value={fideInput}
                onChangeText={setFideInput}
                keyboardType="number-pad"
                placeholder="FIDE ID, e.g. 1503014"
                placeholderTextColor={t.textFaint}
                style={inputStyle}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TextInput
                  value={nameInput}
                  onChangeText={setNameInput}
                  onSubmitEditing={findByName}
                  placeholder="Or find them by name"
                  placeholderTextColor={t.textFaint}
                  style={[...inputStyle, { flex: 1 }]}
                />
                <Pressable
                  onPress={findByName}
                  disabled={searching || !nameInput.trim()}
                  style={[st.submitBtn, { backgroundColor: CR_COLOR, paddingHorizontal: 14 }]}
                >
                  {searching ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Find</Text>
                  )}
                </Pressable>
              </View>
              {candidates?.map((c) => (
                <Pressable
                  key={c.fideId}
                  onPress={() => {
                    setFideInput(c.fideId);
                    setCandidates(null);
                  }}
                  style={[st.knownIdRow, { borderColor: t.border, backgroundColor: t.surface }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: t.text }}>{c.fullName}</Text>
                    <Text style={{ fontSize: 11, color: t.textMuted }}>
                      {[c.federation, `FIDE ${c.fideId}`, c.standardRating && `Elo ${c.standardRating}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: CR_COLOR }}>Use →</Text>
                </Pressable>
              ))}
            </>
          )}

          {notifyRow}

          {elsewhere && <ImportElsewhereNote job={elsewhere} />}

          {(error || jobError) && <Text style={{ color: t.danger, fontSize: 12 }}>{error || jobError}</Text>}

          <Pressable
            onPress={() => startImport(chosenId)}
            disabled={starting || !chosenId}
            style={[st.submitBtn, { backgroundColor: CR_COLOR, opacity: starting || !chosenId ? 0.6 : 1 }]}
          >
            {starting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>{elsewhere ? "Add to queue" : "Import all games"}</Text>
            )}
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Job progress ─────────────────────────────────────────────────────────────

function JobProgress({
  job,
  error,
  onCancel,
  onReset,
  onViewProfile,
}: {
  job: ImportJob;
  error: string | null;
  onCancel: () => void;
  onReset: () => void;
  onViewProfile: () => void;
}) {
  const t = useTheme();
  const finished = isTerminal(job);
  // Pending *and* nothing done yet. A long import returns to pending between
  // slices to let other people's imports through, and showing "Starting your
  // import…" over 40 finished tournaments would be a lie.
  const queued = job.status === "pending" && job.completed === 0;
  const ahead = job.queue_ahead ?? 0;
  const errorCount = job.results.filter((r) => r.status === "error").length;

  // A job sits pending until a worker claims it, normally a second or two. Much
  // longer means no worker is running, and a spinner forever is
  // indistinguishable from a broken app.
  const [stalled, setStalled] = useState(false);
  useEffect(() => {
    if (!queued) {
      setStalled(false);
      return;
    }
    const timer = setTimeout(() => setStalled(true), 30_000);
    return () => clearTimeout(timer);
  }, [queued]);

  return (
    <View style={{ gap: 10 }}>
      {!finished && (
        <>
          {queued ? (
            <View style={[st.queuedRow, { borderColor: t.border, backgroundColor: t.surface }]}>
              <ActivityIndicator size="small" color={CR_COLOR} />
              <Text style={{ fontSize: 13, color: t.textMuted, flex: 1 }}>
                {stalled
                  ? "This is taking longer than usual to start."
                  : ahead > 0
                    ? `Waiting on ${ahead} other import${ahead === 1 ? "" : "s"} to finish first…`
                    : "Starting your import…"}
              </Text>
            </View>
          ) : (
            <ImportProgressBar done={job.completed} total={job.total} games={job.games_imported} />
          )}

          {stalled && (
            <Text style={{ fontSize: 11, color: t.warning }}>
              Your games are still queued and nothing has been lost. If this doesn&apos;t move
              shortly, please contact support.
            </Text>
          )}

          <Text style={{ fontSize: 11, color: t.textFaint }}>
            You can close the app — the import keeps going.
            {job.notify_email ? " We'll email you when it's done." : ""}
          </Text>
        </>
      )}

      {job.status === "succeeded" && (
        <View style={[st.doneBanner, { backgroundColor: t.successBg }]}>
          <Text style={{ color: t.success, fontSize: 13, fontWeight: "700" }}>
            {job.games_imported} game{job.games_imported !== 1 ? "s" : ""} imported
            {job.total > 1 ? ` across ${job.total} tournaments` : ""}
          </Text>
        </View>
      )}

      {job.status === "failed" && (
        <View style={[st.doneBanner, { backgroundColor: t.dangerBg }]}>
          <Text style={{ color: t.danger, fontSize: 13, fontWeight: "700" }}>
            This import didn&apos;t complete.
          </Text>
          <Text style={{ color: t.danger, fontSize: 11, marginTop: 2 }}>
            You can try again — anything already imported was kept.
          </Text>
        </View>
      )}

      {job.status === "cancelled" && (
        <View style={[st.doneBanner, { backgroundColor: t.elevated }]}>
          <Text style={{ color: t.text, fontSize: 13, fontWeight: "700" }}>Import cancelled</Text>
          <Text style={{ color: t.textMuted, fontSize: 11, marginTop: 2 }}>
            {job.completed} of {job.total} tournaments finished before stopping, and those were kept.
          </Text>
        </View>
      )}

      {job.cancel_requested && !finished && (
        <Text style={{ fontSize: 11, color: t.textFaint }}>Stopping…</Text>
      )}

      {error && <Text style={{ fontSize: 11, color: t.danger }}>{error}</Text>}

      {/* Only tournaments that have actually settled. Placeholder rows for the
          rest said nothing and buried the results that mattered. */}
      {job.results.map((r, i) => (
        <View
          key={`${r.name}-${i}`}
          style={[st.progressRow, { borderColor: t.border, backgroundColor: t.surface }]}
        >
          <Ionicons
            name={r.status === "done" ? "checkmark-circle" : "close-circle"}
            size={16}
            color={r.status === "done" ? t.success : t.danger}
          />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }} numberOfLines={1}>
              {r.name}
            </Text>
            {r.status === "done" && r.skipped_reason === "no_moves" ? (
              <Text style={{ fontSize: 11, color: t.warning, marginTop: 2 }}>
                No moves available — skipped
              </Text>
            ) : r.status === "done" ? (
              <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
                {r.games_imported ?? 0} imported
              </Text>
            ) : (
              <Text style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>{r.message}</Text>
            )}
          </View>
        </View>
      ))}

      {!finished && (
        <Pressable onPress={onCancel} disabled={job.cancel_requested}>
          <Text
            style={{
              fontSize: 12,
              color: t.textMuted,
              textAlign: "right",
              opacity: job.cancel_requested ? 0.5 : 1,
            }}
          >
            {job.cancel_requested ? "Cancelling…" : "Cancel import"}
          </Text>
        </Pressable>
      )}

      {finished && (
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable onPress={onReset}>
            <Text style={{ fontSize: 12, color: t.textMuted }}>← Import more</Text>
          </Pressable>
          {errorCount > 0 && (
            <Text style={{ fontSize: 11, color: t.danger }}>{errorCount} failed</Text>
          )}
          <Button title="View Profile" size="sm" variant="secondary" onPress={onViewProfile} />
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, padding: 16 },
  iconBox: { height: 36, width: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14 },
  submitBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  doneBanner: { borderRadius: 10, padding: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  knownIdRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  fromProfileBadge: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  notifyRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  queuedRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
