import { Linking, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";
import { Button } from "@/components/ui/Button";
import { APP_VERSION, type VersionGate } from "@/lib/appVersion";

/**
 * Terminal screen shown when the backend reports this build is no longer allowed.
 *
 * Rendered above the navigator rather than as a route, so there is nothing to navigate back to
 * and no way to dismiss it - the whole point of a forced update is that it can't be skipped.
 */
export function UpdateRequiredScreen({ gate }: { gate: VersionGate }) {
  const t = useTheme();

  return (
    <View style={[st.container, { backgroundColor: t.bg }]}>
      <View style={[st.iconWrap, { backgroundColor: t.brand(600) }]}>
        <Ionicons name="arrow-up-circle-outline" size={40} color="#fff" />
      </View>

      <Text style={[st.title, { color: t.text }]}>Update required</Text>

      <Text style={[st.body, { color: t.textMuted }]}>
        {gate.message ??
          "This version of Chess Preparatory is no longer supported. Update to keep using the app."}
      </Text>

      <View style={[st.versions, { borderColor: t.border, backgroundColor: t.surface }]}>
        <View style={st.versionRow}>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>You have</Text>
          <Text style={{ color: t.text, fontSize: 13, fontWeight: "600" }}>{APP_VERSION}</Text>
        </View>
        <View style={st.versionRow}>
          <Text style={{ color: t.textMuted, fontSize: 13 }}>Latest</Text>
          <Text style={{ color: t.brand(600), fontSize: 13, fontWeight: "700" }}>
            {gate.latest_version}
          </Text>
        </View>
      </View>

      <Button title="Update now" onPress={() => Linking.openURL(gate.update_url)} />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  iconWrap: { height: 72, width: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 22, fontWeight: "800" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  versions: { alignSelf: "stretch", borderWidth: 1, borderRadius: 12, padding: 14, gap: 8, marginBottom: 8 },
  versionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
