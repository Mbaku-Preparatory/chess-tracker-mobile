import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import type { Appearance } from "@/lib/themeStorage";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setAppearance } from "@/redux/actions/theme";
import { useTheme } from "@/theme/ThemeContext";

/**
 * System / Light / Dark.
 *
 * This is the surviving half of what used to be ThemePicker, which also
 * offered six brand colours and a custom hex. The colour picker is gone; the
 * light/dark choice is not, so it lives on its own rather than disappearing
 * with the component it happened to share a card with.
 */
const APPEARANCE_OPTIONS: {
  id: Appearance;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { id: "system", label: "System", icon: "phone-portrait-outline" },
  { id: "light", label: "Light", icon: "sunny-outline" },
  { id: "dark", label: "Dark", icon: "moon-outline" },
];

export function AppearancePicker() {
  const t = useTheme();
  const dispatch = useAppDispatch();
  const appearance = useAppSelector((s) => s.theme.appearance);

  return (
    <View>
      <Text style={[st.label, { color: t.textFaint }]}>Appearance</Text>
      <View style={[st.segment, { borderColor: t.border, backgroundColor: t.elevated }]}>
        {APPEARANCE_OPTIONS.map((option) => {
          const isActive = appearance === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => dispatch(setAppearance(option.id))}
              style={[st.segmentItem, isActive && { backgroundColor: t.surface }]}
            >
              <Ionicons
                name={option.icon}
                size={14}
                color={isActive ? t.brand(600) : t.textMuted}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? "700" : "500",
                  color: isActive ? t.text : t.textMuted,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  label: { marginBottom: 8, fontSize: 12, fontWeight: "500" },
  segment: {
    flexDirection: "row",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 9,
    padding: 3,
    gap: 3,
  },
  segmentItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 7,
    paddingVertical: 7,
  },
});
