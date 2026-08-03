import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "@/theme/ThemeContext";
import { AppHeader } from "./AppHeader";

export function Screen({
  children,
  scroll = true,
  header = true,
  padded = true,
  onRefresh,
  refreshing,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  header?: boolean;
  padded?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const t = useTheme();

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={padded ? st.padded : undefined}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.brand(600)} /> : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded ? st.padded : undefined]}>{children}</View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={["top", "left", "right", "bottom"]}>
      {header && <AppHeader />}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  padded: { padding: 16, paddingBottom: 40 },
});
