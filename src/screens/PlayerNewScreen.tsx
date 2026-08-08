import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { FederationSelect } from "@/components/ui/FederationSelect";
import type { RootStackParamList } from "@/navigation/types";
import type { PlayerLookupResult } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerNew">;

const FIDE_COLOR = "#1a56db";
const CC_COLOR = "#7fa650";
const LI_COLOR = "#b05000";

const PLATFORM_META = {
  fide: { label: "FIDE", color: FIDE_COLOR },
  chesscom: { label: "Chess.com", color: CC_COLOR },
  lichess: { label: "Lichess", color: LI_COLOR },
} as const;

function LookupResultCard({ result, onSelect }: { result: PlayerLookupResult; onSelect: (r: PlayerLookupResult) => void }) {
  const t = useTheme();
  const meta = PLATFORM_META[result.platform];
  const ratings = result.ratings ?? {};
  const ratingParts = [
    ratings.standard ? `Std ${ratings.standard}` : null,
    ratings.rapid ? `Rapid ${ratings.rapid}` : null,
    ratings.blitz ? `Blitz ${ratings.blitz}` : null,
  ].filter(Boolean);

  return (
    <Pressable onPress={() => onSelect(result)} style={[st.resultRow, { borderColor: t.border, backgroundColor: t.surface }]}>
      <View style={[st.avatarSm, { backgroundColor: t.elevated }]}>
        {result.avatar_url ? (
          <Image source={{ uri: result.avatar_url }} style={{ height: 36, width: 36, borderRadius: 18 }} />
        ) : (
          <Text style={{ color: t.textMuted, fontWeight: "700" }}>{result.display_name.charAt(0).toUpperCase()}</Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {result.title && (
            <View style={st.titleBadge}>
              <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400e" }}>{result.title}</Text>
            </View>
          )}
          <Text style={{ color: t.text, fontWeight: "600", fontSize: 13 }} numberOfLines={1}>{result.display_name}</Text>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 3, alignItems: "center" }}>
          <View style={[st.platformPill, { backgroundColor: meta?.color ?? "#888" }]}>
            <Text style={{ color: "#fff", fontSize: 10, fontWeight: "600" }}>{meta?.label}</Text>
          </View>
          {result.federation && <Text style={{ fontSize: 11, color: t.textFaint }}>{result.federation}</Text>}
          {result.fide_id && <Text style={{ fontSize: 11, color: t.textFaint }}>FIDE {result.fide_id}</Text>}
          {ratingParts.map((r) => (
            <Text key={r} style={{ fontSize: 11, color: t.textFaint }}>{r}</Text>
          ))}
        </View>
      </View>
      <Text style={{ color: t.brand(600), fontSize: 12, fontWeight: "600" }}>Select →</Text>
    </Pressable>
  );
}

function PlatformUsernameSection({
  platform,
  color,
  label,
  username,
  onChange,
  onFound,
}: {
  platform: "chesscom" | "lichess";
  color: string;
  label: string;
  username: string;
  onChange: (v: string) => void;
  onFound: (r: PlayerLookupResult) => void;
}) {
  const t = useTheme();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlayerLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function lookup() {
    const u = username.trim();
    if (!u) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { results } = await api.lookupPlayer(platform, u);
      if (results.length > 0) setResult(results[0]);
      else setError(`No ${label} user found for "${u}".`);
    } catch {
      setError("Lookup failed. Check the username.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <View style={[st.iconDot, { backgroundColor: color }]} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.textMuted }}>{label}</Text>
        <Text style={{ fontSize: 11, color: t.textFaint }}>optional</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          value={username}
          onChangeText={(v) => { onChange(v); setResult(null); setError(null); }}
          placeholder={`username, e.g. Magnus${label === "Chess.com" ? "Carlsen" : ""}`}
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
        />
        <Pressable
          onPress={lookup}
          disabled={!username.trim() || loading}
          style={[st.lookupBtn, { borderColor: t.border, opacity: !username.trim() ? 0.4 : 1 }]}
        >
          {loading ? <ActivityIndicator size="small" color={t.textMuted} /> : <Ionicons name="search" size={16} color={t.textMuted} />}
        </Pressable>
      </View>
      {result && (
        <View style={{ marginTop: 8 }}>
          <LookupResultCard result={result} onSelect={(r) => { onFound(r); setResult(null); }} />
        </View>
      )}
      {error && <Text style={{ marginTop: 6, fontSize: 12, color: t.textFaint }}>{error}</Text>}
    </View>
  );
}

export function PlayerNewScreen({ navigation }: Props) {
  const t = useTheme();

  const [fideQuery, setFideQuery] = useState("");
  const [fideSearching, setFideSearching] = useState(false);
  const [fideResults, setFideResults] = useState<PlayerLookupResult[] | null>(null);
  const [fideError, setFideError] = useState<string | null>(null);
  const [fideSelected, setFideSelected] = useState<PlayerLookupResult | null>(null);

  const [fullName, setFullName] = useState("");
  const [federation, setFederation] = useState("");
  const [fideId, setFideId] = useState("");
  const [chesscomUsername, setChesscomUsername] = useState("");
  const [lichessUsername, setLichessUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFideSearch() {
    const q = fideQuery.trim();
    if (!q) return;
    setFideSearching(true);
    setFideResults(null);
    setFideError(null);
    try {
      const { results } = await api.lookupPlayer("fide", q);
      if (results.length === 0) setFideError(`No FIDE player found for "${q}".`);
      else setFideResults(results);
    } catch (err) {
      // The API explains short queries and FIDE outages — pass that through
      // rather than flattening both to "try again".
      setFideError(err instanceof Error ? err.message : "FIDE search failed. Try again.");
    } finally {
      setFideSearching(false);
    }
  }

  function handleSelectFide(result: PlayerLookupResult) {
    if (result.fide_id) setFideId(result.fide_id);
    if (result.federation) setFederation(result.federation);
    if (result.display_name) setFullName(result.display_name);
    setFideSelected(result);
    setFideResults(null);
    setFideQuery("");
  }

  function handlePlatformFound(result: PlayerLookupResult) {
    if (!fullName && result.display_name) setFullName(result.display_name);
  }

  const hasAnyIdentifier = fideId.trim() || chesscomUsername.trim() || lichessUsername.trim();

  async function handleSubmit() {
    if (!hasAnyIdentifier) return;
    const derivedName = fullName.trim() || chesscomUsername.trim() || lichessUsername.trim() || fideId.trim();
    if (!derivedName) return;

    setLoading(true);
    setError(null);
    try {
      const accounts: { platform: "chesscom" | "lichess"; username: string }[] = [
        ...(chesscomUsername.trim() ? [{ platform: "chesscom" as const, username: chesscomUsername.trim() }] : []),
        ...(lichessUsername.trim() ? [{ platform: "lichess" as const, username: lichessUsername.trim() }] : []),
      ];
      const player = await api.createPlayer({
        full_name: derivedName,
        ...(federation.trim() ? { federation: federation.trim() } : {}),
        ...(fideId.trim() ? { fide_id: fideId.trim() } : {}),
        ...(accounts.length ? { accounts } : {}),
      });
      const source = chesscomUsername.trim() ? "chesscom" : lichessUsername.trim() ? "lichess" : "chess_results";
      navigation.replace("PlayerImport", { slug: player.public_id, source });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create player. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Text style={[st.h1, { color: t.text }]}>Add opponent</Text>
      <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Search FIDE by name, or enter their Chess.com / Lichess username directly.
      </Text>

      <Card style={{ padding: 16, marginBottom: 14 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <View style={[st.iconDot, { backgroundColor: FIDE_COLOR }]} />
          <Text style={{ fontSize: 13, fontWeight: "600", color: t.textMuted }}>FIDE search</Text>
          <Text style={{ fontSize: 11, color: t.textFaint }}>by name</Text>
        </View>

        {fideSelected ? (
          <View style={[st.selectedFide, { borderColor: "rgba(26,86,219,0.3)", backgroundColor: "rgba(26,86,219,0.06)" }]}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                {fideSelected.title && (
                  <View style={st.titleBadge}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: "#92400e" }}>{fideSelected.title}</Text>
                  </View>
                )}
                <Text style={{ color: t.text, fontWeight: "600" }}>{fideSelected.display_name}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 }}>
                {fideSelected.fide_id && <Text style={{ fontSize: 11, color: t.textFaint }}>#{fideSelected.fide_id}</Text>}
                {fideSelected.federation && <Text style={{ fontSize: 11, color: t.textFaint }}>{fideSelected.federation}</Text>}
              </View>
            </View>
            <Pressable onPress={() => { setFideSelected(null); setFideId(""); setFederation(""); setFullName(""); }}>
              <Text style={{ color: t.textMuted, fontSize: 12, textDecorationLine: "underline" }}>Change</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput
              value={fideQuery}
              onChangeText={(v) => { setFideQuery(v); setFideResults(null); setFideError(null); }}
              placeholder="e.g. Magnus Carlsen"
              placeholderTextColor={t.textFaint}
              style={[st.input, { flex: 1, borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
            />
            <Button title={fideSearching ? "…" : "Search"} onPress={handleFideSearch} loading={fideSearching} disabled={!fideQuery.trim()} />
          </View>
        )}

        {fideError && <Text style={{ marginTop: 8, fontSize: 12, color: t.textFaint }}>{fideError}</Text>}

        {fideResults && fideResults.length > 0 && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {fideResults.map((r, i) => (
              <LookupResultCard key={i} result={r} onSelect={handleSelectFide} />
            ))}
          </View>
        )}
      </Card>

      <Card style={{ padding: 16, gap: 18 }}>
        <Text style={{ fontSize: 13, fontWeight: "600", color: t.textMuted }}>Player details</Text>

        {error && (
          <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
            <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <PlatformUsernameSection
          platform="chesscom"
          color={CC_COLOR}
          label="Chess.com"
          username={chesscomUsername}
          onChange={setChesscomUsername}
          onFound={handlePlatformFound}
        />

        <PlatformUsernameSection
          platform="lichess"
          color={LI_COLOR}
          label="Lichess"
          username={lichessUsername}
          onChange={setLichessUsername}
          onFound={handlePlatformFound}
        />

        <View>
          <Text style={{ fontSize: 13, fontWeight: "500", color: t.textMuted, marginBottom: 6 }}>
            Federation <Text style={{ fontSize: 11, color: t.textFaint }}>optional</Text>
          </Text>
          <FederationSelect value={federation} onChange={setFederation} />
        </View>

        <TextField
          label="FIDE ID (optional)"
          value={fideId}
          onChangeText={setFideId}
          placeholder="e.g. 1503014"
          keyboardType="number-pad"
        />

        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button
            title={loading ? "Creating…" : "Create & import games →"}
            onPress={handleSubmit}
            loading={loading}
            disabled={!hasAnyIdentifier}
          />
          <Button title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
        </View>
      </Card>
    </Screen>
  );
}

const st = StyleSheet.create({
  h1: { fontSize: 22, fontWeight: "800" },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, fontSize: 14 },
  lookupBtn: { height: 44, width: 44, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  iconDot: { height: 14, width: 14, borderRadius: 4 },
  resultRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  avatarSm: { height: 36, width: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  titleBadge: { backgroundColor: "#fef3c7", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  platformPill: { borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  selectedFide: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
  errorBox: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
