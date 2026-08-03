import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import { hydrateAuthStorage } from "@/lib/auth";
import { hydrateThemeStorage } from "@/lib/themeStorage";
import { StoreProvider } from "@/redux/provider";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { navigationRef } from "@/navigation/navigationRef";
import { RootNavigator } from "@/navigation/RootNavigator";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

function AppShell() {
  const t = useTheme();
  const navTheme = t.mode === "dark"
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: t.bg, card: t.surface, border: t.border, text: t.text, primary: t.brand(600) } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: t.bg, card: t.surface, border: t.border, text: t.text, primary: t.brand(600) } };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
      <GlobalLoader />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([hydrateAuthStorage(), hydrateThemeStorage()]).finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0b0b0f" }}>
        <ActivityIndicator size="large" color="#0074c5" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <ThemeProvider>
          <AppShell />
        </ThemeProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
