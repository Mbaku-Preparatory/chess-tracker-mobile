import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadAuthFromStorage } from "@/redux/actions/auth";
import { fetchRepertoire, setInitialized } from "@/redux/actions/repertoire";
import { useTheme } from "@/theme/ThemeContext";
import type { RootStackParamList } from "./types";

import { LoginScreen } from "@/screens/LoginScreen";
import { SignupScreen } from "@/screens/SignupScreen";
import { PlayersScreen } from "@/screens/PlayersScreen";
import { PlayerNewScreen } from "@/screens/PlayerNewScreen";
import { PlayerDetailScreen } from "@/screens/PlayerDetailScreen";
import { PlayerGamesScreen } from "@/screens/PlayerGamesScreen";
import { PlayerPrepScreen } from "@/screens/PlayerPrepScreen";
import { PlayerImportScreen } from "@/screens/PlayerImportScreen";
import { MasterGamesScreen } from "@/screens/MasterGamesScreen";
import { TournamentPlayersScreen } from "@/screens/TournamentPlayersScreen";
import { SetupScreen } from "@/screens/SetupScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { token, initialized: authInitialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(loadAuthFromStorage());
  }, [dispatch]);

  useEffect(() => {
    if (!authInitialized) return;
    if (token) {
      dispatch(fetchRepertoire());
    } else {
      dispatch(setInitialized());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authInitialized, token]);

  if (!authInitialized) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <ActivityIndicator size="large" color={t.brand(600)} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Group>
          <Stack.Screen name="Players" component={PlayersScreen} />
          <Stack.Screen name="PlayerNew" component={PlayerNewScreen} />
          <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
          <Stack.Screen name="PlayerGames" component={PlayerGamesScreen} />
          <Stack.Screen name="PlayerPrep" component={PlayerPrepScreen} />
          <Stack.Screen name="PlayerImport" component={PlayerImportScreen} />
          <Stack.Screen name="MasterGames" component={MasterGamesScreen} />
          <Stack.Screen name="TournamentPlayers" component={TournamentPlayersScreen} />
          <Stack.Screen name="Setup" component={SetupScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
