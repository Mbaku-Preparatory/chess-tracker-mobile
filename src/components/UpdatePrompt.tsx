import { Modal, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { Button } from "@/components/ui/Button";

/**
 * Offers to apply a downloaded over-the-air update. Never forced: "Later" keeps the running code,
 * and the update applies by itself on the next cold start. Forcing is the backend's job
 * (MOBILE_MIN_JS_VERSION), not this prompt's.
 */
export function UpdatePrompt({
  visible,
  onRestart,
  onDismiss,
}: {
  visible: boolean;
  onRestart: () => void;
  onDismiss: () => void;
}) {
  const t = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={st.backdrop}>
        <View style={[st.card, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[st.title, { color: t.text }]}>Update ready</Text>
          <Text style={[st.body, { color: t.textMuted }]}>
            A new version of Chess Preparatory has been downloaded. Restart to use it now, or it
            will be used the next time you open the app.
          </Text>
          <View style={st.actions}>
            <Button title="Later" variant="ghost" onPress={onDismiss} />
            <Button title="Restart now" onPress={onRestart} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.6)" },
  card: { borderWidth: 1, borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "800", textAlign: "center" },
  body: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
});
