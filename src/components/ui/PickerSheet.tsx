import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";

export interface PickerOption {
  value: string;
  label: string;
  /** Rendered before the label. Empty string means none is known. */
  prefix?: string;
}

/**
 * A dropdown, as a bottom sheet — the native shape of one.
 *
 * Built for lists that are long and known: 209 federations will not fit in a
 * row of chips, and scrolling one horizontally to reach Zimbabwe is not a
 * filter, it is a chore. A sheet with a search box reaches any entry in two
 * taps and a few letters.
 *
 * `searchable` is off by default: a list of 21 rounds does not need a box, and
 * an empty one is just something else to look at.
 */
export function PickerSheet({
  label,
  value,
  options,
  placeholder,
  onChange,
  searchable = false,
}: {
  label: string;
  value: string;
  options: PickerOption[];
  placeholder: string;
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options.find((o) => o.value === value);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  function choose(next: string) {
    onChange(next);
    setOpen(false);
    setQuery("");
  }

  return (
    <View style={{ flex: 1, minWidth: 120 }}>
      <Text style={[st.label, { color: t.textFaint }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={[st.field, { borderColor: t.border, backgroundColor: t.surface }]}
      >
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 14, color: selected ? t.text : t.textFaint }}>
          {selected ? `${selected.prefix ? `${selected.prefix} ` : ""}${selected.label}` : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={16} color={t.textFaint} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={st.backdrop} onPress={() => setOpen(false)} />
        <View style={[st.sheet, { backgroundColor: t.bg, borderColor: t.border }]}>
          <View style={st.sheetHeader}>
            <Text style={[st.sheetTitle, { color: t.text }]}>{label}</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={10}>
              <Ionicons name="close" size={22} color={t.textMuted} />
            </Pressable>
          </View>

          {searchable && (
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search…"
              placeholderTextColor={t.textFaint}
              autoCorrect={false}
              style={[st.search, { borderColor: t.border, backgroundColor: t.surface, color: t.text }]}
            />
          )}

          <FlatList
            data={[{ value: "", label: placeholder, prefix: "" }, ...shown]}
            // Values are unique by construction, but the "all" row shares the
            // empty string with nothing else, so the index keeps the key
            // total even if a source ever repeats a code.
            keyExtractor={(o, i) => `${o.value}-${i}`}
            renderItem={({ item }) => {
              const active = item.value === value;
              return (
                <Pressable
                  onPress={() => choose(item.value)}
                  style={[st.row, { borderBottomColor: t.border }]}
                >
                  <Text style={{ flex: 1, fontSize: 15, color: active ? t.brand(600) : t.text }}>
                    {item.prefix ? `${item.prefix}  ` : ""}
                    {item.label}
                  </Text>
                  {active && <Ionicons name="checkmark" size={18} color={t.brand(600)} />}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6, marginBottom: 4 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    maxHeight: "70%",
    borderTopWidth: 1,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 16, fontWeight: "800" },
  search: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
