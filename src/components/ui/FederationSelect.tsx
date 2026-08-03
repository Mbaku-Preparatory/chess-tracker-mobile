import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { FEDERATIONS } from "@/lib/federations";
import { useTheme } from "@/theme/ThemeContext";

export function FederationSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = FEDERATIONS.find((f) => f.code === value);

  const filtered = useMemo(() => {
    if (!query.trim()) return FEDERATIONS;
    const q = query.toLowerCase();
    return FEDERATIONS.filter((f) => f.code.toLowerCase().startsWith(q) || f.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[st.trigger, { borderColor: t.border, backgroundColor: t.surface }]}
      >
        <Text style={{ color: selected ? t.text : t.textFaint, fontSize: 14 }}>
          {selected ? `${selected.flag} ${selected.code} — ${selected.name}` : "e.g. NOR or Norway"}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: 60 }}>
          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: t.text }}>Select federation</Text>
              <Pressable onPress={() => setOpen(false)}>
                <Text style={{ color: t.brand(600), fontWeight: "600" }}>Close</Text>
              </Pressable>
            </View>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search federation…"
              placeholderTextColor={t.textFaint}
              autoFocus
              style={[st.search, { borderColor: t.border, color: t.text, backgroundColor: t.surface }]}
            />
            {value !== "" && (
              <Pressable onPress={() => { onChange(""); setOpen(false); }}>
                <Text style={{ color: t.textMuted, fontSize: 13 }}>Clear selection</Text>
              </Pressable>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(f) => f.code}
            style={{ marginTop: 10 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => { onChange(item.code); setOpen(false); setQuery(""); }}
                style={[st.row, { borderColor: t.border }]}
              >
                <Text style={{ fontSize: 16 }}>{item.flag}</Text>
                <Text style={{ width: 40, fontFamily: "monospace", fontWeight: "700", color: t.textMuted, fontSize: 12 }}>{item.code}</Text>
                <Text style={{ color: t.text, fontSize: 14, flex: 1 }}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}

const st = StyleSheet.create({
  trigger: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 44, justifyContent: "center" },
  search: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, height: 42, fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
