import { Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { PageHeader } from "@/components/ui/SectionContainer";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import type { RootStackParamList } from "@/navigation/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SchedulerScreen() {
  const t = useTheme();
  const navigation = useNavigation<Nav>();

  return (
    <Screen scroll={false} padded>
      <PageHeader title="Today" subtitle="Your prep sessions for the day" />

      <View style={{ flex: 1 }}>
        <EmptyState
          title="No sessions scheduled"
          description="Plan a study session against an opponent, an opening, or your own games — it'll show up here."
          action={
            <Button
              title="Go to Prep"
              size="sm"
              onPress={() => navigation.navigate("Players")}
            />
          }
        />
        <Text style={{ marginTop: 16, textAlign: "center", fontSize: 12, color: t.textFaint }}>
          Scheduling is coming soon — this tab will hold your daily agenda and streak.
        </Text>
      </View>
    </Screen>
  );
}
