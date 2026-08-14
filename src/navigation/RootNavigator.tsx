import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loadAuthFromStorage } from "@/redux/actions/auth";
import { useTheme } from "@/theme/ThemeContext";
import type { MainTabParamList, RootStackParamList } from "./types";

import { LoginScreen } from "@/screens/LoginScreen";
import { SignupScreen } from "@/screens/SignupScreen";
import { VerifyEmailScreen } from "@/screens/VerifyEmailScreen";
import { SchedulerScreen } from "@/screens/SchedulerScreen";
import { PlayersScreen } from "@/screens/PlayersScreen";
import { PlayerNewScreen } from "@/screens/PlayerNewScreen";
import { PlayerDetailScreen } from "@/screens/PlayerDetailScreen";
import { PlayerGamesScreen } from "@/screens/PlayerGamesScreen";
import { PlayerPrepScreen } from "@/screens/PlayerPrepScreen";
import { PlayerImportScreen } from "@/screens/PlayerImportScreen";
import { MasterGamesScreen } from "@/screens/MasterGamesScreen";
import { SessionNewScreen } from "@/screens/SessionNewScreen";
import { SessionDetailScreen } from "@/screens/SessionDetailScreen";
import { AccountScreen } from "@/screens/AccountScreen";
import MyProfileScreen from "@/screens/MyProfileScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<keyof MainTabParamList, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Schedule: { active: "today", inactive: "today-outline" },
  Players: { active: "people", inactive: "people-outline" },
};

function MainTabs() {
  const t = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: t.brand(600),
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border },
        tabBarIcon: ({ focused, color, size }) => {
          const icons = TAB_ICONS[route.name];
          return <Ionicons name={focused ? icons.active : icons.inactive} size={size} color={color} />;
        },
      })}
    >
      {/* Prep is listed first because a bottom navigator opens on its first screen, and Prep -
          not Schedule - is the app's primary destination. The route name stays "Players" so the
          existing navigate("Players") call sites keep working. */}
      <Tab.Screen name="Players" component={PlayersScreen} options={{ tabBarLabel: "Prep" }} />
      <Tab.Screen name="Schedule" component={SchedulerScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { token, initialized: authInitialized } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(loadAuthFromStorage());
  }, [dispatch]);

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
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="PlayerNew" component={PlayerNewScreen} />
          <Stack.Screen name="PlayerDetail" component={PlayerDetailScreen} />
          <Stack.Screen name="PlayerGames" component={PlayerGamesScreen} />
          <Stack.Screen name="PlayerPrep" component={PlayerPrepScreen} />
          <Stack.Screen name="PlayerImport" component={PlayerImportScreen} />
          <Stack.Screen name="MasterGames" component={MasterGamesScreen} />
          <Stack.Screen name="SessionNew" component={SessionNewScreen} />
          <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
          <Stack.Screen name="MyProfile" component={MyProfileScreen} />
          <Stack.Screen name="Account" component={AccountScreen} />
        </Stack.Group>
      ) : (
        <Stack.Group>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}
