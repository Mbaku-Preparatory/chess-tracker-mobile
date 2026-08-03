import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { fetchPlayerDetail } from "@/redux/actions/playerDetail";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/ui/SectionContainer";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { AllGamesView } from "@/components/players/AllGamesView";
import { OpeningTreeView } from "@/components/players/OpeningTreeView";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlayerGames">;
type Tab = "games" | "openings";

export function PlayerGamesScreen({ route }: Props) {
  const { slug } = route.params;
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { player, loading } = useAppSelector((s) => s.playerDetail);
  const [tab, setTab] = useState<Tab>("games");

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
        title={player ? `${player.full_name} — Games` : "Games"}
        subtitle={tab === "games" ? "Browse all games with filters" : "Drill into any opening to see individual games"}
      />

      <View style={[st.tabs, { borderColor: t.border }]}>
        {([{ id: "games", label: "All Games" }, { id: "openings", label: "By Opening" }] as { id: Tab; label: string }[]).map((tb) => (
          <Pressable key={tb.id} onPress={() => setTab(tb.id)} style={[st.tab, tab === tb.id ? { borderColor: t.brand(600) } : null]}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: tab === tb.id ? t.brand(600) : t.textMuted }}>{tb.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === "games" ? <AllGamesView slug={slug} /> : <OpeningTreeView slug={slug} />}
    </Screen>
  );
}

const st = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 16 },
  tab: { paddingHorizontal: 4, paddingBottom: 10, marginRight: 20, borderBottomWidth: 2, borderColor: "transparent" },
});
