import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPlayerDetail } from "@/redux/actions/playerDetail";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { PageHeader, SectionContainer } from "@/components/ui/SectionContainer";
import { StatCard, StatStrip } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PerformanceSplitCard } from "@/components/players/PerformanceSplitCard";
import { OpeningBreakdownCard } from "@/components/players/OpeningBreakdownCard";
import { StrengthWeaknessCard } from "@/components/players/StrengthWeaknessCard";
import { GamesTable } from "@/components/players/GamesTable";
import type { RootStackParamList } from "@/navigation/types";
import { userMessage } from "@/lib/apiError";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerDetail">;

function FideSection({ slug, fideId }: { slug: string; fideId: string | null }) {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [inputId, setInputId] = useState("");
  const [showInput, setShowInput] = useState(false);

  const doSync = useCallback(
    async (id?: string) => {
      setSyncing(true);
      setMessage(null);
      try {
        const data = await api.syncFide(slug, id);
        const fields = data.updated_fields.filter((f) => f !== "updated_at");
        setMessage(fields.length ? `Updated: ${fields.join(", ")}` : "Already up to date");
        dispatch(fetchPlayerDetail(slug));
        setShowInput(false);
      } catch (err) {
        setMessage(userMessage(err, "Sync failed"));
      } finally {
        setSyncing(false);
      }
    },
    [slug, dispatch]
  );

  if (fideId) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Pressable onPress={() => doSync()} disabled={syncing} style={[st.fideBtn, { borderColor: "rgba(26,58,107,0.3)", backgroundColor: "rgba(26,58,107,0.05)" }]}>
          {syncing ? <ActivityIndicator size="small" color="#1a3a6b" /> : <Ionicons name="sync-outline" size={13} color="#1a3a6b" />}
          <Text style={{ fontSize: 12, fontWeight: "600", color: "#1a3a6b" }}>{syncing ? "Syncing…" : "Sync from FIDE"}</Text>
        </Pressable>
        {message && <Text style={{ fontSize: 11, color: t.textMuted }}>{message}</Text>}
      </View>
    );
  }

  if (!showInput) {
    return (
      <Pressable onPress={() => setShowInput(true)} style={[st.setFideBtn, { borderColor: t.border }]}>
        <Text style={{ fontSize: 12, color: t.textMuted }}>+ Set FIDE ID</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <TextInput
        value={inputId}
        onChangeText={setInputId}
        placeholder="e.g. 12345678"
        placeholderTextColor={t.textFaint}
        keyboardType="number-pad"
        style={[st.fideInput, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
      />
      <Pressable onPress={() => inputId.trim() && doSync(inputId.trim())} disabled={syncing || !inputId.trim()} style={[st.saveBtn, { backgroundColor: "#1a3a6b", opacity: !inputId.trim() ? 0.6 : 1 }]}>
        <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>{syncing ? "Syncing…" : "Save & Sync"}</Text>
      </Pressable>
      <Pressable onPress={() => { setShowInput(false); setMessage(null); }}>
        <Text style={{ fontSize: 12, color: t.textFaint }}>Cancel</Text>
      </Pressable>
      {message && <Text style={{ fontSize: 11, color: t.danger }}>{message}</Text>}
    </View>
  );
}

export function PlayerDetailScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { player, loading, error } = useAppSelector((s) => s.playerDetail);

  useEffect(() => {
    if (slug) dispatch(fetchPlayerDetail(slug));
  }, [dispatch, slug]);

  if (loading) {
    return (
      <Screen>
        <View style={{ gap: 16 }}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </Screen>
    );
  }

  if (error || !player) {
    return (
      <Screen>
        <View style={{ alignItems: "center", paddingVertical: 60, gap: 16 }}>
          <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>{error || "Player not found"}</Text>
          <Button title="Back to players" onPress={() => navigation.navigate("MainTabs", { screen: "Players" })} />
        </View>
      </Screen>
    );
  }

  const ps = player.performance_summary;
  const whiteOpenings = player.opening_stats.filter((o) => o.color_choice === "white").slice(0, 5);
  const blackOpenings = player.opening_stats.filter((o) => o.color_choice === "black").slice(0, 5);
  const initials = player.full_name.split(" ").map((n) => n[0]).join("");
  const sc = player.game_source_counts;

  return (
    <Screen>
      <Card style={{ padding: 20, marginBottom: 20 }}>
        <View style={{ flexDirection: "row", gap: 16 }}>
          <View style={[st.avatar, { backgroundColor: t.brand(100) }]}>
            <Text style={{ color: t.brand(700), fontWeight: "800", fontSize: 20 }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{player.full_name}</Text>
              {player.title && (
                <View style={st.titleBadge}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#92400e" }}>{player.title}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
              {player.federation && <Text style={{ fontSize: 12, color: t.textMuted }}>{player.federation}</Text>}
              {player.fide_id && <Text style={{ fontSize: 12, color: t.textMuted }}>FIDE #{player.fide_id}</Text>}
              {player.birth_year && <Text style={{ fontSize: 12, color: t.textMuted }}>Born {player.birth_year}</Text>}
            </View>
            {sc && (sc.chess_results || sc.chess_com || sc.lichess) ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 6 }}>
                {!!sc.chess_results && <Text style={{ fontSize: 11, color: t.textFaint }}>● {sc.chess_results} OTB</Text>}
                {!!sc.chess_com && <Text style={{ fontSize: 11, color: t.textFaint }}>● {sc.chess_com} Chess.com</Text>}
                {!!sc.lichess && <Text style={{ fontSize: 11, color: t.textFaint }}>● {sc.lichess} Lichess</Text>}
              </View>
            ) : null}
            <View style={{ marginTop: 10 }}>
              <FideSection slug={slug} fideId={player.fide_id} />
            </View>
            {player.bio ? <Text style={{ marginTop: 10, fontSize: 13, color: t.textMuted, lineHeight: 19 }}>{player.bio}</Text> : null}
          </View>
        </View>
      </Card>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
        <Button title="View All Games" onPress={() => navigation.navigate("PlayerGames", { slug })} />
        {/* Brand-blue border so Mbaku reads as the new thing among the
            neutral secondaries, without shouting like a primary button. */}
        <Button
          title="Ask Mbaku"
          variant="secondary"
          style={{ borderColor: t.brand(600), borderWidth: 1.5 }}
          onPress={() => navigation.navigate("PlayerPrep", { slug, tab: "ask" })}
        />
        <Button title="Opening Tree" variant="secondary" onPress={() => navigation.navigate("PlayerPrep", { slug })} />
        <Button title="Import Games" variant="secondary" onPress={() => navigation.navigate("PlayerImport", { slug, source: "chess_results" })} />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 20 }}>
        <StatCard label="Standard" value={player.standard_rating ?? "—"} sublabel="FIDE Standard" />
        <StatCard label="Rapid" value={player.rapid_rating ?? "—"} sublabel="FIDE Rapid" />
        <StatCard label="Blitz" value={player.blitz_rating ?? "—"} sublabel="FIDE Blitz" />
      </View>

      {ps && (
        <>
          <SectionContainer title="Performance Overview" subtitle={`Based on ${ps.total_games} games analyzed`}>
            <StatStrip
              items={[
                { label: "Games", value: ps.total_games },
                { label: "Wins", value: ps.wins, variant: "success" },
                { label: "Draws", value: ps.draws, variant: "warning" },
                { label: "Losses", value: ps.losses, variant: "danger" },
                { label: "Win Rate", value: `${ps.win_rate}%`, variant: ps.win_rate >= 50 ? "success" : "danger" },
              ]}
            />
            {ps.summary_text && (
              <Card style={{ padding: 16, marginTop: 12 }}>
                <Text style={{ fontSize: 13, color: t.textMuted, lineHeight: 19 }}>{ps.summary_text}</Text>
              </Card>
            )}
          </SectionContainer>

          <SectionContainer title="White vs Black Performance">
            <View style={{ flexDirection: "row", gap: 10 }}>
              <PerformanceSplitCard label="As White" games={ps.white_games} score={Number(ps.white_score)} colorIndicator="white" />
              <PerformanceSplitCard label="As Black" games={ps.black_games} score={Number(ps.black_score)} colorIndicator="black" />
            </View>
          </SectionContainer>
        </>
      )}

      {(whiteOpenings.length > 0 || blackOpenings.length > 0) && (
        <SectionContainer title="Opening Repertoire" subtitle="Top 5 openings by color">
          <View style={{ gap: 10 }}>
            <OpeningBreakdownCard title="White Openings" openings={whiteOpenings} colorLabel="White" />
            <OpeningBreakdownCard title="Black Openings" openings={blackOpenings} colorLabel="Black" />
          </View>
        </SectionContainer>
      )}

      {(player.strengths.length > 0 || player.weaknesses.length > 0) && (
        <SectionContainer title="Strengths & Weaknesses">
          <View style={{ gap: 10 }}>
            {player.strengths.length > 0 && <StrengthWeaknessCard items={player.strengths} type="strength" />}
            {player.weaknesses.length > 0 && <StrengthWeaknessCard items={player.weaknesses} type="weakness" />}
          </View>
        </SectionContainer>
      )}

      {player.recent_games.length > 0 && (
        <SectionContainer
          title="Recent Games"
          action={<Button title="View all" size="sm" variant="secondary" onPress={() => navigation.navigate("PlayerGames", { slug })} />}
        >
          <GamesTable games={player.recent_games} />
        </SectionContainer>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  avatar: { height: 64, width: 64, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  titleBadge: { backgroundColor: "#fef3c7", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  fideBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  setFideBtn: { borderWidth: StyleSheet.hairlineWidth, borderStyle: "dashed", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: "flex-start" },
  fideInput: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, height: 34, fontSize: 12, width: 140 },
  saveBtn: { borderRadius: 8, paddingHorizontal: 10, height: 34, alignItems: "center", justifyContent: "center" },
});
