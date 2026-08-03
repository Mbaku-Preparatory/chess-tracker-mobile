import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";

export function SearchInput({
  placeholder = "Search...",
  onSearch,
  defaultValue = "",
  style,
}: {
  placeholder?: string;
  onSearch: (query: string) => void;
  defaultValue?: string;
  style?: object;
}) {
  const t = useTheme();
  const [value, setValue] = useState(defaultValue);

  return (
    <View style={[st.wrap, { borderColor: t.border, backgroundColor: t.surface }, style]}>
      <Ionicons name="search" size={16} color={t.textFaint} style={{ marginRight: 8 }} />
      <TextInput
        value={value}
        onChangeText={(text) => {
          setValue(text);
          onSearch(text);
        }}
        placeholder={placeholder}
        placeholderTextColor={t.textFaint}
        style={[st.input, { color: t.text }]}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 42,
  },
  input: { flex: 1, fontSize: 14, height: "100%" },
});
