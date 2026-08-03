import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/theme/ThemeContext";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";
import type { PGNImportResult } from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ImportResultPanel({ result }: { result: PGNImportResult }) {
  const t = useTheme();
  const navigation = useNavigation<Nav>();
  const {
    player_public_id,
    player_slug,
    player_name,
    games_created,
    games_updated,
    games_skipped,
    games_imported,
    opening_summary,
    result_summary,
  } = result;
  const { wins, draws, losses } = result_summary;
  const total = wins + draws + losses;
  const noneImported = games_imported === 0;
  const playerRef = player_public_id || player_slug;

  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <View style={[st.banner, { backgroundColor: noneImported ? t.warningBg : t.successBg }]}>
        {noneImported ? (
          <Text style={{ color: t.warning, fontSize: 13, fontWeight: "600" }}>
            No games were imported.
            {games_skipped > 0
              ? ` ${games_skipped} game${games_skipped !== 1 ? "s" : ""} skipped — the player name didn't match any PGN header.`
              : ""}
          </Text>
        ) : (
          <>
            <Text style={{ color: t.success, fontSize: 13, fontWeight: "700" }}>
              {games_imported} game{games_imported !== 1 ? "s" : ""} imported for {player_name}.
            </Text>
            <Text style={{ color: t.success, fontSize: 11, marginTop: 3 }}>
              {games_created > 0 ? `${games_created} new` : ""}
              {games_updated > 0 ? ` · ${games_updated} updated` : ""}
              {games_skipped > 0 ? ` · ${games_skipped} skipped` : ""}
            </Text>
          </>
        )}
        <Button
          title="View Player Profile"
          size="sm"
          style={{ marginTop: 10 }}
          onPress={() => navigation.navigate("PlayerDetail", { slug: playerRef })}
        />
      </View>

      {!noneImported && (
        <>
          <Card style={{ padding: 16 }}>
            <Text style={[st.sectionLabel, { color: t.textFaint }]}>Results from this import</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {[
                { label: "Wins", value: wins, color: "#4ade80" },
                { label: "Draws", value: draws, color: "#facc15" },
                { label: "Losses", value: losses, color: "#f87171" },
              ].map(({ label, value, color }) => (
                <View key={label} style={[st.resultCell, { backgroundColor: t.elevated }]}>
                  <View style={{ height: 3, width: 28, borderRadius: 2, backgroundColor: color, marginBottom: 6 }} />
                  <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>{value}</Text>
                  <Text style={{ fontSize: 11, color: t.textMuted }}>{label}</Text>
                  {total > 0 && <Text style={{ fontSize: 10, color: t.textFaint }}>{Math.round((value / total) * 100)}%</Text>}
                </View>
              ))}
            </View>
          </Card>

          {opening_summary.length > 0 && (
            <Card style={{ padding: 16 }}>
              <Text style={[st.sectionLabel, { color: t.textFaint }]}>Openings detected</Text>
              <View style={{ gap: 10 }}>
                {opening_summary.map(({ name, count, percent }) => (
                  <View key={name}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: t.text, flexShrink: 1 }} numberOfLines={1}>{name}</Text>
                      <Text style={{ fontSize: 12, color: t.textMuted }}>{percent}% ({count}×)</Text>
                    </View>
                    <View style={[st.track, { backgroundColor: t.elevated }]}>
                      <View style={[st.fill, { width: `${percent}%`, backgroundColor: t.brand(500) }]} />
                    </View>
                  </View>
                ))}
              </View>
            </Card>
          )}
        </>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  banner: { borderRadius: 12, padding: 16 },
  sectionLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 },
  resultCell: { flex: 1, borderRadius: 10, alignItems: "center", paddingVertical: 12 },
  track: { marginTop: 6, height: 5, borderRadius: 3, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
});
