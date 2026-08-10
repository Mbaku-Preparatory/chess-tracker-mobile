import "react-native-gesture-handler";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";

import { hydrateAuthStorage } from "@/lib/auth";
import { hydrateThemeStorage } from "@/lib/themeStorage";
import { store } from "@/redux/store";
import { loadThemeFromStorage } from "@/redux/actions/theme";
import { StoreProvider } from "@/redux/provider";
import { ThemeProvider, useTheme } from "@/theme/ThemeContext";
import { navigationRef } from "@/navigation/navigationRef";
import { RootNavigator } from "@/navigation/RootNavigator";
import { UpdateRequiredScreen } from "@/screens/UpdateRequiredScreen";
import { checkVersionGate, type VersionGate } from "@/lib/appVersion";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { ActiveImportsIndicator } from "@/components/import/ActiveImportsIndicator";

function AppShell() {
  const t = useTheme();
  const [gate, setGate] = useState<VersionGate | null>(null);

  // Checked once per launch. Failures resolve to null and are ignored, so an offline start or a
  // backend outage never blocks the app - see checkVersionGate.
  useEffect(() => {
    let cancelled = false;
    checkVersionGate().then((result) => {
      if (!cancelled && result?.update_required) setGate(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const navTheme = t.mode === "dark"
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: t.bg, card: t.surface, border: t.border, text: t.text, primary: t.brand(600) } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: t.bg, card: t.surface, border: t.border, text: t.text, primary: t.brand(600) } };

  // Replaces the navigator outright rather than pushing a route, so a forced update has no
  // back gesture and nothing behind it to reach.
  if (gate) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
        <UpdateRequiredScreen gate={gate} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar style={t.mode === "dark" ? "light" : "dark"} />
      <NavigationContainer ref={navigationRef} theme={navTheme}>
        {/*
          Inside the container, not beside it: the indicator uses navigation
          hooks to hide itself on the import screen and to link back to the
          player it is importing.
        */}
        <>
          <RootNavigator />
          <ActiveImportsIndicator />
        </>
      </NavigationContainer>
      <GlobalLoader />
    </View>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([hydrateAuthStorage(), hydrateThemeStorage()])
      .then(() => {
        // Reducers evaluate their initial state at module load, long before AsyncStorage has
        // been read, so the hydrated values have to be pushed in explicitly. Dispatched on the
        // store directly rather than from a mounted component so the very first render already
        // has the saved theme - going through a useEffect would flash the default theme first.
        store.dispatch(loadThemeFromStorage());
      })
      .finally(() => setReady(true));
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
