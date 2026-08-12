import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPlayerDetail } from "@/redux/actions/playerDetail";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/ui/SectionContainer";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { PrepSummaryPanel } from "@/components/players/PrepSummaryPanel";
import { OpeningStudyPlan } from "@/components/players/OpeningStudyPlan";
import { AskAssistant } from "@/components/players/AskAssistant";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerPrep">;
type PrepTab = "tree" | "studies" | "ask";

export function PlayerPrepScreen({ route, navigation }: Props) {
  const { slug } = route.params;
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { player, loading } = useAppSelector((s) => s.playerDetail);
  const [tab, setTab] = useState<PrepTab>("tree");

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

  return (
    <Screen>
      <PageHeader
        title={player ? `${player.full_name} — Prep` : "Prep"}
        subtitle="Opening tree and study recommendations"
        actions={<Button title="Import Games" size="sm" variant="secondary" onPress={() => navigation.navigate("PlayerImport", { slug })} />}
      />

      <View style={[st.tabBar, { borderColor: t.border, backgroundColor: t.elevated }]}>
        {([{ id: "tree", label: "Opening Tree", icon: "git-branch-outline" }, { id: "studies", label: "Opening Studies", icon: "book-outline" }, { id: "ask", label: "Ask", icon: "chatbubble-ellipses-outline" }] as { id: PrepTab; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map((tb) => (
          <Pressable key={tb.id} onPress={() => setTab(tb.id)} style={[st.tab, tab === tb.id ? { backgroundColor: t.surface } : null]}>
            <Ionicons name={tb.icon} size={14} color={tab === tb.id ? t.text : t.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: tab === tb.id ? t.text : t.textMuted }}>{tb.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "tree" && <PrepSummaryPanel slug={slug} />}
      {tab === "studies" && <OpeningStudyPlan slug={slug} />}
      {tab === "ask" && <AskAssistant slug={slug} playerName={player?.full_name} />}
    </Screen>
  );
}

const st = StyleSheet.create({
  tabBar: { flexDirection: "row", alignSelf: "flex-start", borderRadius: 10, padding: 4, gap: 4, borderWidth: StyleSheet.hairlineWidth, marginBottom: 18 },
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8 },
});
