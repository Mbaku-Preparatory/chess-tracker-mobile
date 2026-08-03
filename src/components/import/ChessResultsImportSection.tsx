import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";
import type {
  ChessResultsImportResult,
  ChessResultsPlayerCandidate,
  ChessResultsTournamentOption,
} from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const CR_COLOR = "#1a3a6b";

type TournamentResult =
  | { status: "pending" }
  | { status: "importing" }
  | { status: "done"; result: ChessResultsImportResult }
  | { status: "error"; message: string };

type Step =
  | { type: "idle" }
  | { type: "searching" }
  | { type: "selecting-player"; candidates: ChessResultsPlayerCandidate[] }
  | { type: "loading-tournaments"; name: string }
  | { type: "selecting-tournaments"; playerName: string; tournaments: ChessResultsTournamentOption[] }
  | { type: "importing"; selected: ChessResultsTournamentOption[]; results: TournamentResult[] }
  | { type: "done"; selected: ChessResultsTournamentOption[]; results: TournamentResult[] };

function buildImportUrl(t: ChessResultsTournamentOption): string {
  if (t.url) return t.url;
  return `https://chess-results.com/tnr${t.tnr}.aspx?lan=1&art=9&snr=${t.snr}`;
}

function totalImported(results: TournamentResult[]): number {
  return results.reduce((sum, r) => (r.status === "done" ? sum + (r.result.games_imported ?? 0) : sum), 0);
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
  const [step, setStep] = useState<Step>({ type: "idle" });
  const [searchMode, setSearchMode] = useState<"fide_id" | "name">(fideId ? "fide_id" : "name");
  const [fideInput, setFideInput] = useState(fideId ?? "");
  const [nameInput, setNameInput] = useState("");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const cancelledRef = useRef(false);

  async function handleSearch() {
    setSearchError(null);
    const q = searchMode === "fide_id" ? fideInput.trim() : nameInput.trim();
    if (!q) return;
    setStep({ type: "searching" });
    try {
      const { results } = await api.searchChessResultsPlayer(searchMode === "fide_id" ? { fide_id: q } : { q });
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
      setSearchError(err instanceof Error ? err.message : "Search failed. Try again.");
    }
  }

  async function loadTournaments(crId: string, name: string) {
    setStep({ type: "loading-tournaments", name });
    try {
      const data = await api.getChessResultsTournaments(crId);
      setSelected(new Set());
      setStep({ type: "selecting-tournaments", playerName: data.player_name || name, tournaments: data.tournaments });
    } catch (err) {
      setStep({ type: "idle" });
      setSearchError(err instanceof Error ? err.message : "Could not load tournament list.");
    }
  }

  async function handleImport(tournaments: ChessResultsTournamentOption[]) {
    const toImport = tournaments.filter((tt) => selected.has(`${tt.tnr}-${tt.snr}`));
    if (toImport.length === 0) return;
    cancelledRef.current = false;
    const results: TournamentResult[] = toImport.map(() => ({ status: "pending" }));
    setStep({ type: "importing", selected: toImport, results: [...results] });

    for (let i = 0; i < toImport.length; i++) {
      if (cancelledRef.current) break;
      results[i] = { status: "importing" };
      setStep({ type: "importing", selected: toImport, results: [...results] });
      try {
        const result = await api.importFromChessResults(slug, { url: buildImportUrl(toImport[i]) });
        results[i] = { status: "done", result };
      } catch (err) {
        results[i] = { status: "error", message: err instanceof Error ? err.message : "Import failed." };
      }
      setStep({ type: "importing", selected: toImport, results: [...results] });
    }
    setStep({ type: "done", selected: toImport, results: [...results] });
  }

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <View style={[st.card, { borderColor: "rgba(26,58,107,0.35)", backgroundColor: "rgba(26,58,107,0.05)" }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <View style={[st.iconBox, { backgroundColor: CR_COLOR }]}>
          <Ionicons name="trophy-outline" size={18} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>Import OTB Games from Chess-Results</Text>
          <Text style={{ fontSize: 11, color: t.textMuted }}>Fetch over-the-board tournament games</Text>
        </View>
      </View>

      {(step.type === "idle" || step.type === "searching") && (
        <View>
          <View style={[st.modeTabs, { backgroundColor: t.elevated }]}>
            {(["fide_id", "name"] as const).map((mode) => (
              <Pressable
                key={mode}
                onPress={() => { setSearchMode(mode); setSearchError(null); }}
                style={[st.modeTab, searchMode === mode ? { backgroundColor: t.surface } : null]}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: searchMode === mode ? t.text : t.textMuted }}>
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
            style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface, marginTop: 10 }]}
          />

          {searchError && <Text style={{ color: t.danger, fontSize: 12, marginTop: 8 }}>{searchError}</Text>}

          <Pressable
            onPress={handleSearch}
            disabled={step.type === "searching" || (searchMode === "fide_id" ? !fideInput.trim() : !nameInput.trim())}
            style={[st.submitBtn, { backgroundColor: CR_COLOR, marginTop: 12, opacity: step.type === "searching" ? 0.7 : 1 }]}
          >
            {step.type === "searching" ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>Search player</Text>}
          </Pressable>
        </View>
      )}

      {step.type === "selecting-player" && (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => setStep({ type: "idle" })}>
            <Text style={{ fontSize: 12, color: t.textMuted }}>← Search again</Text>
          </Pressable>
          {step.candidates.map((c) => (
            <Pressable key={c.cr_id} onPress={() => loadTournaments(c.cr_id, c.name)} style={[st.candidateRow, { borderColor: t.border, backgroundColor: t.surface }]}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {c.title && (
                    <View style={st.titleBadge}><Text style={{ fontSize: 10, fontWeight: "700", color: "#92400e" }}>{c.title}</Text></View>
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

      {step.type === "selecting-tournaments" && (
        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable onPress={() => setStep({ type: "idle" })}>
              <Text style={{ fontSize: 12, color: t.textMuted }}>← Back</Text>
            </Pressable>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }}>{step.playerName}</Text>
          </View>

          {step.tournaments.length === 0 ? (
            <Text style={{ textAlign: "center", fontSize: 12, color: t.textFaint, paddingVertical: 16 }}>
              No tournaments found for this player.
            </Text>
          ) : (
            <View style={{ gap: 6 }}>
              {step.tournaments.map((tt) => {
                const key = `${tt.tnr}-${tt.snr}`;
                const checked = selected.has(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggle(key)}
                    style={[st.tournRow, checked ? { borderColor: CR_COLOR, backgroundColor: "rgba(26,58,107,0.08)" } : { borderColor: t.border, backgroundColor: t.surface }]}
                  >
                    <Ionicons name={checked ? "checkbox" : "square-outline"} size={18} color={checked ? CR_COLOR : t.textFaint} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: t.text }}>{tt.name}</Text>
                      <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>
                        {[tt.year, tt.location].filter(Boolean).join(" · ") || "No date/location info"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            onPress={() => handleImport(step.tournaments)}
            disabled={selected.size === 0}
            style={[st.submitBtn, { backgroundColor: CR_COLOR, opacity: selected.size === 0 ? 0.5 : 1 }]}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13 }}>
              Import {selected.size > 0 ? `${selected.size} tournament${selected.size !== 1 ? "s" : ""}` : "selected"}
            </Text>
          </Pressable>
        </View>
      )}

      {(step.type === "importing" || step.type === "done") && (
        <View style={{ gap: 10 }}>
          {step.type === "done" && (
            <View style={[st.doneBanner, { backgroundColor: t.successBg }]}>
              <Text style={{ color: t.success, fontSize: 13, fontWeight: "700" }}>
                {totalImported(step.results)} game{totalImported(step.results) !== 1 ? "s" : ""} imported
              </Text>
            </View>
          )}
          {step.selected.map((tt, i) => {
            const r = step.results[i];
            return (
              <View key={`${tt.tnr}-${tt.snr}`} style={[st.progressRow, { borderColor: t.border, backgroundColor: t.surface }]}>
                {r.status === "pending" && <View style={[st.pendingDot, { borderColor: t.border }]} />}
                {r.status === "importing" && <ActivityIndicator size="small" color={CR_COLOR} />}
                {r.status === "done" && <Ionicons name="checkmark-circle" size={16} color={t.success} />}
                {r.status === "error" && <Ionicons name="close-circle" size={16} color={t.danger} />}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: t.text }} numberOfLines={1}>{tt.name}</Text>
                  {r.status === "done" && (
                    <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 2 }}>{r.result.games_imported} imported</Text>
                  )}
                  {r.status === "error" && <Text style={{ fontSize: 11, color: t.danger, marginTop: 2 }}>{r.message}</Text>}
                </View>
              </View>
            );
          })}
          {step.type === "importing" && (
            <Pressable onPress={() => { cancelledRef.current = true; }}>
              <Text style={{ fontSize: 12, color: t.textMuted, textAlign: "right" }}>Cancel import</Text>
            </Pressable>
          )}
          {step.type === "done" && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable onPress={() => setStep({ type: "idle" })}>
                <Text style={{ fontSize: 12, color: t.textMuted }}>← Import more</Text>
              </Pressable>
              <Button title="View Profile" size="sm" variant="secondary" onPress={() => navigation.navigate("PlayerDetail", { slug: playerRef })} />
            </View>
          )}
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
  pendingDot: { height: 14, width: 14, borderRadius: 7, borderWidth: 2 },
});
