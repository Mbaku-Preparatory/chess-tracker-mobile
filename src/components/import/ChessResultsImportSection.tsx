import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { useTheme } from "@/theme/ThemeContext";
import { Button } from "@/components/ui/Button";
import { ImportProgressBar } from "@/components/import/ImportProgressBar";
import type { RootStackParamList } from "@/navigation/types";
import type {
  ChessResultsPlayerCandidate,
  ChessResultsTournamentOption,
  ImportJob,
} from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const CR_COLOR = "#1a3a6b";
const POLL_INTERVAL_MS = 2000;

type Step =
  | { type: "idle" }
  | { type: "searching" }
  | { type: "selecting-player"; candidates: ChessResultsPlayerCandidate[] }
  | { type: "loading-tournaments"; name: string }
  | { type: "choose-mode"; playerName: string; tournaments: ChessResultsTournamentOption[] }
  | { type: "selecting-tournaments"; playerName: string; tournaments: ChessResultsTournamentOption[] }
  // The import is a row in the database being worked on by the worker service,
  // not something this component is doing. All we hold is its id.
  | { type: "job"; job: ImportJob };

function buildImportUrl(t: ChessResultsTournamentOption): string {
  if (t.url) return t.url;
  return `https://chess-results.com/tnr${t.tnr}.aspx?lan=1&art=9&snr=${t.snr}`;
}

function isTerminal(job: ImportJob): boolean {
  return job.status === "succeeded" || job.status === "failed" || job.status === "cancelled";
}

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

  // The profile already knows who this is — don't offer to look up someone else.
  const hasKnownFideId = Boolean(fideId?.trim());

  const [step, setStep] = useState<Step>({ type: "idle" });
  const [searchMode, setSearchMode] = useState<"fide_id" | "name">(
    hasKnownFideId ? "fide_id" : "name"
  );
  const [fideInput, setFideInput] = useState(fideId ?? "");
  const [nameInput, setNameInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [jobError, setJobError] = useState<string | null>(null);

  const activeJobId = step.type === "job" && !isTerminal(step.job) ? step.job.id : null;

  // ── Reconnect to an import already in progress ──────────────────────────────
  //
  // This matters more on mobile than on the web: the OS can suspend the app at
  // any time, and a coach on patchy data will background it. Component state
  // does not survive that. The job row does.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { results } = await api.recentImportJobs(slug);
        const live = results.find((j) => !isTerminal(j));
        if (live && !cancelled) {
          setStep((cur) => (cur.type === "idle" ? { type: "job", job: live } : cur));
        }
      } catch {
        // Can't check — they can still start a new import.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // ── Poll a running job ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!activeJobId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      try {
        const job = await api.getImportJob(activeJobId);
        if (cancelled) return;
        setStep({ type: "job", job });
        if (isTerminal(job)) return;
      } catch {
        // A failed poll is usually a blip in signal. The job is unaffected by
        // our connection, so keep trying rather than declaring it dead.
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeJobId]);

  // ── Search ──────────────────────────────────────────────────────────────────

  async function handleSearch() {
    setSearchError(null);

    // A known FIDE ID always wins over the inputs — the field isn't rendered in
    // that case, so its state is not something to trust.
    const params = hasKnownFideId
      ? { fide_id: fideId!.trim() }
      : searchMode === "fide_id"
        ? { fide_id: fideInput.trim() }
        : { q: nameInput.trim() };

    if (!Object.values(params)[0]) return;
    setStep({ type: "searching" });

    try {
      const { results } = await api.searchChessResultsPlayer(params);
      if (results.length === 0) {
        setStep({ type: "idle" });
        setSearchError("No players found. Try a different name or check the FIDE ID.");
      } else if (results.length === 1) {
        await loadTournaments(results[0].cr_id, results[0].name);
      } else {
        setStep({ type: "selecting-player", candidates: results });
      }
    } catch (err) {
      setStep({ type: "idle" });
      setSearchError(userMessage(err, "Search failed. Try again."));
    }
  }

  async function loadTournaments(crId: string, name: string) {
    setStep({ type: "loading-tournaments", name });
    try {
      const data = await api.getChessResultsTournaments(crId);
      // Start empty: "Fetch all" is its own button, so someone who chose to
      // pick tournaments meant to pick them.
      setSelected(new Set());
      setStep({
        type: "choose-mode",
        playerName: data.player_name || name,
        tournaments: data.tournaments,
      });
    } catch (err) {
      setStep({ type: "idle" });
      setSearchError(userMessage(err, "Could not load tournament list."));
    }
  }

  // ── Import ──────────────────────────────────────────────────────────────────

  const startImport = useCallback(
    async (toImport: ChessResultsTournamentOption[]) => {
      // The caller decides what "these" means: everything for Fetch all, the
      // ticked ones for the picker.
      if (toImport.length === 0) return;
      setJobError(null);
      try {
        const job = await api.createImportJob(
          slug,
          toImport.map((tt) => ({ name: tt.name, url: buildImportUrl(tt) })),
          notifyEmail
        );
        setStep({ type: "job", job });
      } catch (err) {
        setJobError(userMessage(err, "Could not start the import."));
      }
    },
    [slug, notifyEmail]
  );

  async function cancelJob(jobId: string) {
    try {
      const job = await api.cancelImportJob(jobId);
      setStep({ type: "job", job });
    } catch (err) {
      setJobError(userMessage(err, "Could not cancel the import."));
    }
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const notifyRow = (
    <Pressable
      onPress={() => setNotifyEmail((v) => !v)}
      style={[st.notifyRow, { borderColor: t.border, backgroundColor: t.surface }]}
    >
      <Ionicons
        name={notifyEmail ? "checkbox" : "square-outline"}
        size={18}
        color={notifyEmail ? CR_COLOR : t.textFaint}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>
          Email me when this is done
        </Text>
        <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          Useful for big imports — we&apos;ll send a link to the player.
        </Text>
      </View>
    </Pressable>
  );

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
            Fetch over-the-board tournament games
          </Text>
        </View>
      </View>

      {/* ── Search ─────────────────────────────────────────────────────────── */}
      {(step.type === "idle" || step.type === "searching") && (
        <View>
          {hasKnownFideId ? (
            // Nothing to type and nothing to choose: the ID is the identity, and
            // an editable field here only invites importing another player's
            // games onto this profile.
            <View style={[st.knownIdRow, { borderColor: t.border, backgroundColor: t.surface }]}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: t.textMuted }}>Searching by FIDE ID</Text>
                <Text style={{ fontSize: 14, fontWeight: "600", color: t.text }}>{fideId}</Text>
              </View>
              <View style={st.fromProfileBadge}>
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#047857" }}>From profile</Text>
              </View>
            </View>
          ) : (
            <>
              <View style={[st.modeTabs, { backgroundColor: t.elevated }]}>
                {(["fide_id", "name"] as const).map((mode) => (
                  <Pressable
                    key={mode}
                    onPress={() => {
                      setSearchMode(mode);
                      setSearchError(null);
                    }}
                    style={[st.modeTab, searchMode === mode ? { backgroundColor: t.surface } : null]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color: searchMode === mode ? t.text : t.textMuted,
                      }}
                    >
                      {mode === "fide_id" ? "By FIDE ID" : "By Name"}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                value={searchMode === "fide_id" ? fideInput : nameInput}
                onChangeText={searchMode === "fide_id" ? setFideInput : setNameInput}
                placeholder={searchMode === "fide_id" ? "e.g. 1503014" : "e.g. Timothy Mwabu"}
                placeholderTextColor={t.textFaint}
                style={[
                  st.input,
                  { borderColor: t.border, color: t.text, backgroundColor: t.surface, marginTop: 10 },
                ]}
              />
            </>
          )}

          {searchError && <Text style={{ color: t.danger, fontSize: 12, marginTop: 8 }}>{searchError}</Text>}

          <Pressable
            onPress={handleSearch}
            disabled={
              step.type === "searching" ||
              (!hasKnownFideId && (searchMode === "fide_id" ? !fideInput.trim() : !nameInput.trim()))
            }
            style={[
              st.submitBtn,
              { backgroundColor: CR_COLOR, marginTop: 12, opacity: step.type === "searching" ? 0.7 : 1 },
            ]}
          >
            {step.type === "searching" ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Search Games</Text>
            )}
          </Pressable>
        </View>
      )}

      {/* ── Pick the right player ──────────────────────────────────────────── */}
      {step.type === "selecting-player" && (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setStep({ type: "idle" })}>
            <Text style={{ fontSize: 12, color: t.textMuted }}>← Search again</Text>
          </Pressable>
          {step.candidates.map((c) => (
            <Pressable
              key={c.cr_id}
              onPress={() => loadTournaments(c.cr_id, c.name)}
              style={[st.candidateRow, { borderColor: t.border, backgroundColor: t.surface }]}
            >
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {c.title && (
                    <View style={st.titleBadge}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400e" }}>{c.title}</Text>
                    </View>
                  )}
                  <Text style={{ fontWeight: "600", color: t.text, fontSize: 13 }}>{c.name}</Text>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 }}>
                  {c.federation && <Text style={{ fontSize: 11, color: t.textFaint }}>{c.federation}</Text>}
                  {c.fide_id && <Text style={{ fontSize: 11, color: t.textFaint }}>FIDE {c.fide_id}</Text>}
                  {c.rating && <Text style={{ fontSize: 11, color: t.textFaint }}>Elo {c.rating}</Text>}
                </View>
              </View>
              <Text style={{ fontSize: 11, color: CR_COLOR, fontWeight: "600" }}>Select →</Text>
            </Pressable>
          ))}
        </View>
      )}

      {step.type === "loading-tournaments" && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
          <ActivityIndicator size="small" color={CR_COLOR} />
          <Text style={{ fontSize: 12, color: t.textMuted }}>Loading tournaments for {step.name}…</Text>
        </View>
      )}

      {/* ── All, or pick ───────────────────────────────────────────────────── */}
      {step.type === "choose-mode" && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onPress={() => setStep({ type: "idle" })}>
              <Text style={{ fontSize: 12, color: t.textMuted }}>← Back</Text>
            </Pressable>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }}>
              {step.tournaments.length} found
            </Text>
          </View>

          {step.tournaments.length === 0 ? (
            <Text style={{ textAlign: "center", fontSize: 12, color: t.textFaint, paddingVertical: 16 }}>
              No tournaments found for this player.
            </Text>
          ) : (
            <>
              <ModeCards
                active={null}
                count={step.tournaments.length}
                onFetchAll={() => startImport(step.tournaments)}
                onChoose={() =>
                  setStep({
                    type: "selecting-tournaments",
                    playerName: step.playerName,
                    tournaments: step.tournaments,
                  })
                }
              />
              {notifyRow}
            </>
          )}
        </View>
      )}

      {/* ── Pick specific tournaments ──────────────────────────────────────── */}
      {step.type === "selecting-tournaments" && (
        <View style={{ gap: 10 }}>
          {/* The cards stay put with the highlight on the active choice, so it
              is obvious which mode you are in and switching back is one tap. */}
          <ModeCards
            active="choose"
            count={step.tournaments.length}
            onFetchAll={() => startImport(step.tournaments)}
            onChoose={() => {}}
          />

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable
              onPress={() =>
                setStep({
                  type: "choose-mode",
                  playerName: step.playerName,
                  tournaments: step.tournaments,
                })
              }
            >
              <Text style={{ fontSize: 12, color: t.textMuted }}>← Back</Text>
            </Pressable>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                onPress={() =>
                  setSelected(new Set(step.tournaments.map((tt) => `${tt.tnr}-${tt.snr}`)))
                }
              >
                <Text style={{ fontSize: 12, color: t.textMuted }}>Select all</Text>
              </Pressable>
              <Pressable onPress={() => setSelected(new Set())}>
                <Text style={{ fontSize: 12, color: t.textMuted }}>Clear</Text>
              </Pressable>
            </View>
          </View>

          {/*
            The list scrolls inside itself. Magnus Carlsen has 250-odd events,
            and letting them all flow into the page ScrollView buried the
            checkbox and the Import button under a quarter-mile of rows.
          */}
          <ScrollView
            style={{ maxHeight: 320 }}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          >
            {step.tournaments.map((tt) => {
              const key = `${tt.tnr}-${tt.snr}`;
              const checked = selected.has(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggle(key)}
                  style={[
                    st.tournRow,
                    checked
                      ? { borderColor: CR_COLOR, backgroundColor: "rgba(26,58,107,0.08)" }
                      : { borderColor: t.border, backgroundColor: t.surface },
                  ]}
                >
                  <Ionicons
                    name={checked ? "checkbox" : "square-outline"}
                    size={18}
                    color={checked ? CR_COLOR : t.textFaint}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>{tt.name}</Text>
                    <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                      {[tt.year, tt.location].filter(Boolean).join(" · ") || "No date/location info"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {notifyRow}

          <Pressable
            onPress={() =>
              startImport(step.tournaments.filter((tt) => selected.has(`${tt.tnr}-${tt.snr}`)))
            }
            disabled={selected.size === 0}
            style={[st.submitBtn, { backgroundColor: CR_COLOR, opacity: selected.size === 0 ? 0.5 : 1 }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Import{" "}
              {selected.size > 0
                ? `${selected.size} tournament${selected.size !== 1 ? "s" : ""}`
                : "selected"}
            </Text>
          </Pressable>
          <Text style={{ fontSize: 11, color: t.textFaint, textAlign: "center" }}>
            {selected.size} of {step.tournaments.length} selected
          </Text>
        </View>
      )}

      {/* ── The job ────────────────────────────────────────────────────────── */}
      {step.type === "job" && (
        <JobProgress
          job={step.job}
          error={jobError}
          onCancel={() => cancelJob(step.job.id)}
          onReset={() => {
            setStep({ type: "idle" });
            setJobError(null);
          }}
          onViewProfile={() => navigation.navigate("PlayerDetail", { slug: playerRef })}
        />
      )}
    </View>
  );
}

// ── Mode cards ───────────────────────────────────────────────────────────────

/**
 * The two ways in, shown in both steps so the highlight can move to whichever
 * you picked. A permanently-highlighted "Fetch all" while you were busy
 * ticking boxes said the wrong thing about where you were.
 */
function ModeCards({
  active,
  count,
  onFetchAll,
  onChoose,
}: {
  active: "all" | "choose" | null;
  count: number;
  onFetchAll: () => void;
  onChoose: () => void;
}) {
  const t = useTheme();

  const card = (isActive: boolean) => [
    st.modeCard,
    isActive
      ? { borderColor: CR_COLOR, backgroundColor: "rgba(26,58,107,0.08)" }
      : { borderColor: t.border, backgroundColor: t.surface },
  ];

  return (
    <View style={{ gap: 8 }}>
      <Pressable onPress={onFetchAll} style={card(active === "all")}>
        <Text style={{ fontSize: 20 }}>♞</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: t.text, marginTop: 4 }}>
          Fetch all tournaments
        </Text>
        <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          Import all {count} events. Best for a new player.
        </Text>
      </Pressable>

      <Pressable onPress={onChoose} style={card(active === "choose")}>
        <Text style={{ fontSize: 20 }}>♟</Text>
        <Text style={{ fontSize: 14, fontWeight: "700", color: t.text, marginTop: 4 }}>
          Choose tournaments
        </Text>
        <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>
          Pick exactly which events to bring in.
        </Text>
      </Pressable>
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
  const queued = job.status === "pending";
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
        <Text style={{ fontSize: 11, color: t.textFaint }}>Stopping after the current tournament…</Text>
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
  modeTabs: { flexDirection: "row", borderRadius: 8, padding: 3, gap: 3 },
  modeTab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 6 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14 },
  submitBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  candidateRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  titleBadge: { backgroundColor: "#fef3c7", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  tournRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  doneBanner: { borderRadius: 10, padding: 12 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  knownIdRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  fromProfileBadge: { backgroundColor: "rgba(16,185,129,0.15)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  modeCard: { borderWidth: 2, borderRadius: 12, padding: 14 },
  notifyRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  queuedRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
