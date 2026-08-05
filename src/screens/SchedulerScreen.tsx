import { useCallback, useMemo } from "react";
import { SectionList, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { deletePrepSession, fetchPrepSessions, updatePrepSession } from "@/redux/actions/prepSessions";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/ui/SectionContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { ListSkeleton } from "@/components/ui/LoadingSkeleton";
import { PrepSessionCard } from "@/components/schedule/PrepSessionCard";
import { computeStreak } from "@/utils/streak";
import { getSessionSection, type ScheduleSection } from "@/utils/schedule";
import type { RootStackParamList } from "@/navigation/types";
import type { PrepSession } from "@/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SECTION_ORDER: ScheduleSection[] = ["Overdue", "Today", "Upcoming"];

export function SchedulerScreen() {
  const t = useTheme();
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.prepSessions);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchPrepSessions());
    }, [dispatch])
  );

  const streak = useMemo(() => computeStreak(items), [items]);

  const sections = useMemo(() => {
    const grouped: Record<ScheduleSection, PrepSession[]> = { Overdue: [], Today: [], Upcoming: [] };
    for (const session of items) {
      grouped[getSessionSection(session.scheduled_for)].push(session);
    }
    return SECTION_ORDER.filter((key) => grouped[key].length > 0).map((key) => ({
      title: key,
      data: grouped[key],
    }));
  }, [items]);

  return (
    <Screen scroll={false} padded={false}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        onRefresh={() => dispatch(fetchPrepSessions())}
        refreshing={loading}
        ListHeaderComponent={
          <View>
            <PageHeader
              title="Schedule"
              subtitle="Your prep agenda"
              actions={
                <>
                  <Button title="+ New Session" size="sm" onPress={() => navigation.navigate("SessionNew")} />
                  {streak > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ fontSize: 14 }}>🔥</Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: t.textMuted }}>
                        {streak} day streak
                      </Text>
                    </View>
                  )}
                </>
              }
            />
            {error && (
              <View style={{ borderWidth: 1, borderColor: t.dangerBorder, backgroundColor: t.dangerBg, borderRadius: 10, padding: 12, marginBottom: 12 }}>
                <Text style={{ color: t.danger, fontSize: 13 }}>{error}</Text>
              </View>
            )}
            {loading && items.length === 0 && <ListSkeleton rows={3} />}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.textMuted, marginBottom: 8, marginTop: 4 }}>
            {section.title.toUpperCase()}
          </Text>
        )}
        renderItem={({ item }) => (
          <View style={{ marginBottom: 10 }}>
            <PrepSessionCard
              session={item}
              onToggleComplete={(session) => dispatch(updatePrepSession(session.id, !session.completed_at))}
              onDelete={(session) => dispatch(deletePrepSession(session.id))}
            />
          </View>
        )}
        SectionSeparatorComponent={() => <View style={{ height: 16 }} />}
        ListEmptyComponent={
          loading ? null : (
            <EmptyState
              title="No sessions scheduled"
              description="Plan a study session against an opponent, an opening, or your own games — it'll show up here."
              action={<Button title="New Session" size="sm" onPress={() => navigation.navigate("SessionNew")} />}
            />
          )
        }
      />
    </Screen>
  );
}
