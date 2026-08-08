import { Text } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { useAppDispatch } from "@/redux/hooks";
import { addPrepSession } from "@/redux/actions/prepSessions";
import { useTheme } from "@/theme/ThemeContext";
import { Screen } from "@/components/layout/Screen";
import { SessionForm } from "@/components/schedule/SessionForm";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "SessionNew">;

export function SessionNewScreen({ navigation }: Props) {
  const t = useTheme();
  const dispatch = useAppDispatch();

  return (
    <Screen>
      <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>New session</Text>
      <Text style={{ color: t.textMuted, fontSize: 13, marginTop: 4, marginBottom: 20 }}>
        Add a prep task to your Schedule agenda.
      </Text>

      <SessionForm
        submitLabel="Save session"
        onCancel={() => navigation.goBack()}
        onSubmit={async (payload) => {
          const session = await api.createPrepSession(payload);
          dispatch(addPrepSession(session));
          navigation.goBack();
        }}
      />
    </Screen>
  );
}
