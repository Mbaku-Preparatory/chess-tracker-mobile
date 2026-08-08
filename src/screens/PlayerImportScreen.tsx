import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChessComImportSection } from "@/components/import/ChessComImportSection";
import { LichessImportSection } from "@/components/import/LichessImportSection";
import { ChessResultsImportSection } from "@/components/import/ChessResultsImportSection";
import { ImportResultPanel } from "@/components/import/ImportResultPanel";
import type { RootStackParamList } from "@/navigation/types";
import type { PGNImportResult, PlayerDetail } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerImport">;

type Color = "auto" | "white" | "black";
type ImportSource = "chesscom" | "lichess" | "chess_results" | "pgn";

const SOURCE_TABS: { id: ImportSource; label: string; color: string }[] = [
  { id: "chess_results", label: "OTB", color: "#1a3a6b" },
  { id: "chesscom", label: "Chess.com", color: "#7fa650" },
  { id: "lichess", label: "Lichess", color: "#b05000" },
  { id: "pgn", label: "PGN file", color: "#6b7280" },
];

const COLOR_OPTIONS: { value: Color; label: string; hint: string }[] = [
  { value: "auto", label: "Auto-detect", hint: "Match by name in PGN headers" },
  { value: "white", label: "Always White", hint: "Player had white in every game" },
  { value: "black", label: "Always Black", hint: "Player had black in every game" },
];

export function PlayerImportScreen({ route, navigation }: Props) {
  const { slug, source } = route.params;
  const t = useTheme();

  const [player, setPlayer] = useState<PlayerDetail | null>(null);
  const [playerLoading, setPlayerLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<ImportSource>(source ?? "chess_results");

  const [pgn, setPgn] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [color, setColor] = useState<Color>("auto");
  const [nameOverride, setNameOverride] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PGNImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function refreshPlayer() {
    const updated = await api.getPlayerDetail(slug);
    setPlayer(updated);
    setNameOverride(updated.full_name);
  }

  useEffect(() => {
    setPlayerLoading(true);
    refreshPlayer()
      .catch(() => setPlayerError("Player not found."))
      .finally(() => setPlayerLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function handlePickFile() {
    const res = await DocumentPicker.getDocumentAsync({ type: ["*/*"], copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const asset = res.assets[0];
    try {
      const text = await FileSystem.readAsStringAsync(asset.uri, { encoding: "utf8" });
      setPgn(text);
      setFileName(asset.name);
      setResult(null);
      setError(null);
    } catch {
      setError("Could not read the file.");
    }
  }

  const canSubmit = pgn.trim().length > 0 && !loading && (color !== "auto" || nameOverride.trim().length > 0);

  async function handleSubmit() {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const data = await api.importPGN({
        pgn_text: pgn,
        mode: "self",
        player_slug: slug,
        color,
        ...(color === "auto" ? { player_name: nameOverride.trim() } : {}),
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed. Check your PGN and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (playerLoading) {
    return (
      <Screen>
        <ActivityIndicator color={t.brand(600)} />
      </Screen>
    );
  }

  if (playerError || !player) {
    return (
      <Screen>
        <View style={{ alignItems: "center", paddingVertical: 60, gap: 16 }}>
          <Text style={{ color: t.textMuted }}>{playerError ?? "Player not found."}</Text>
          <Button title="Back to players" onPress={() => navigation.navigate("MainTabs", { screen: "Players" })} />
        </View>
      </Screen>
    );
  }

  const initials = player.full_name.split(" ").map((n) => n[0]).join("");
  const playerRef = player.public_id || player.slug;

  return (
    <Screen>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 20 }}>
        <View style={[st.avatar, { backgroundColor: t.brand(100) }]}>
          <Text style={{ color: t.brand(700), fontWeight: "800", fontSize: 16 }}>{initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>Import Games</Text>
          <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            Adding games for <Text style={{ fontWeight: "600", color: t.text }}>{player.full_name}</Text>
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
        {SOURCE_TABS.map((tab) => {
          const active = activeSource === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveSource(tab.id)}
              style={[st.tab, active ? { backgroundColor: tab.color, borderColor: tab.color } : { borderColor: t.border, backgroundColor: t.surface }]}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#fff" : t.textMuted }}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeSource === "chesscom" && (
        <ChessComImportSection slug={slug} accounts={player.accounts ?? []} onUpdated={refreshPlayer} />
      )}
      {activeSource === "lichess" && (
        <LichessImportSection slug={slug} accounts={player.accounts ?? []} onUpdated={refreshPlayer} />
      )}
      {activeSource === "chess_results" && (
        <ChessResultsImportSection slug={slug} playerRef={playerRef} fideId={player.fide_id} />
      )}

      {activeSource === "pgn" && (
        <Card style={{ padding: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <View style={[st.iconBox, { backgroundColor: "#374151" }]}>
              <Ionicons name="document-text-outline" size={17} color="#fff" />
            </View>
            <View>
              <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }}>Import from PGN file</Text>
              <Text style={{ fontSize: 11, color: t.textMuted }}>Paste or upload a .pgn file directly</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginBottom: 8 }}>{player.full_name} played as…</Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
            {COLOR_OPTIONS.map(({ value, label, hint }) => (
              <Pressable
                key={value}
                onPress={() => { setColor(value); setResult(null); }}
                style={[st.colorOpt, color === value ? { borderColor: t.brand(600), backgroundColor: t.brand(50) } : { borderColor: t.border }]}
              >
                <Text style={{ fontSize: 12, fontWeight: "700", color: color === value ? t.brand(700) : t.text }}>{label}</Text>
                <Text style={{ fontSize: 10, color: t.textFaint, marginTop: 2 }}>{hint}</Text>
              </Pressable>
            ))}
          </View>

          {color === "auto" && (
            <View style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted, marginBottom: 6 }}>Name in PGN headers *</Text>
              <TextInput
                value={nameOverride}
                onChangeText={setNameOverride}
                style={[st.input, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
              />
            </View>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted }}>PGN *</Text>
            <Pressable onPress={handlePickFile} style={[st.uploadBtn, { borderColor: t.border }]}>
              <Ionicons name="cloud-upload-outline" size={13} color={t.textMuted} />
              <Text style={{ fontSize: 11, color: t.textMuted, fontWeight: "600" }}>Upload .pgn</Text>
            </Pressable>
          </View>
          <TextInput
            value={pgn}
            onChangeText={(v) => { setPgn(v); setFileName(null); setResult(null); }}
            multiline
            numberOfLines={10}
            placeholder={`[Event "Tournament"]\n[White "..."]\n[Black "..."]\n[Result "1-0"]\n\n1. e4 e5 2. Nf3 Nc6 ...`}
            placeholderTextColor={t.textFaint}
            style={[st.textarea, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
            textAlignVertical="top"
          />
          {fileName && <Text style={{ fontSize: 11, color: t.brand(600), marginTop: 6 }}>{fileName}</Text>}

          {error && (
            <View style={[st.errorBox, { backgroundColor: t.dangerBg, borderColor: t.dangerBorder }]}>
              <Text style={{ color: t.danger, fontSize: 12 }}>{error}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
            <Button title={loading ? "Importing…" : "Import Games"} onPress={handleSubmit} loading={loading} disabled={!canSubmit} />
            <Button title="Cancel" variant="secondary" onPress={() => navigation.navigate("PlayerDetail", { slug })} />
          </View>

          {result && <ImportResultPanel result={result} />}
        </Card>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  avatar: { height: 48, width: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  tab: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  iconBox: { height: 34, width: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  colorOpt: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
  input: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 13 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  textarea: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10, fontSize: 12, fontFamily: "monospace", minHeight: 160 },
  errorBox: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 10 },
});
