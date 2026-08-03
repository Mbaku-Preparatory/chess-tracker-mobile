import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { THEMES, type ThemeId } from "@/lib/themes";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setColorScheme } from "@/redux/actions/theme";
import { useTheme } from "@/theme/ThemeContext";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function ThemePicker() {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const { colorScheme, customColor } = useAppSelector((s) => s.theme);
  const [hexInput, setHexInput] = useState(customColor ?? "");
  const [showCustom, setShowCustom] = useState(false);

  function handlePreset(id: ThemeId) {
    dispatch(setColorScheme({ id }));
    setShowCustom(false);
  }

  function submitCustom() {
    if (HEX_RE.test(hexInput)) {
      dispatch(setColorScheme({ id: "custom", customColor: hexInput }));
    }
  }

  return (
    <View>
      <Text style={[st.label, { color: t.textFaint }]}>Colour</Text>
      <View style={st.row}>
        {THEMES.map((theme) => {
          const isActive = colorScheme === theme.id;
          return (
            <Pressable
              key={theme.id}
              onPress={() => handlePreset(theme.id)}
              style={[st.swatch, { backgroundColor: theme.preview }]}
            >
              {isActive && <Ionicons name="checkmark" size={16} color="#fff" />}
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setShowCustom((v) => !v)}
          style={[
            st.swatch,
            {
              borderWidth: 2,
              borderColor: colorScheme === "custom" ? t.text : t.border,
              backgroundColor: colorScheme === "custom" && customColor ? customColor : t.elevated,
            },
          ]}
        >
          <Ionicons name="color-palette-outline" size={14} color={colorScheme === "custom" ? "#fff" : t.textMuted} />
        </Pressable>
      </View>

      {showCustom && (
        <View style={st.customRow}>
          <TextInput
            value={hexInput}
            onChangeText={setHexInput}
            placeholder="#0074c5"
            placeholderTextColor={t.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={7}
            style={[st.hexInput, { color: t.text, borderColor: t.border }]}
          />
          <Pressable onPress={submitCustom} style={[st.applyBtn, { backgroundColor: t.brand(600) }]}>
            <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Apply</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  label: { marginBottom: 8, fontSize: 12, fontWeight: "500" },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  swatch: { height: 28, width: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  customRow: { marginTop: 10, flexDirection: "row", gap: 8 },
  hexInput: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, height: 34, fontSize: 13 },
  applyBtn: { paddingHorizontal: 12, justifyContent: "center", borderRadius: 8 },
});
