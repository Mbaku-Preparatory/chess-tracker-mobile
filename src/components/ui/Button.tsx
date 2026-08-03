import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = "primary",
  size = "md",
  style,
  fullWidth,
}: ButtonProps) {
  const t = useTheme();
  const isDisabled = disabled || loading;

  const variants: Record<string, { bg: string; fg: string; border?: string }> = {
    primary: { bg: t.brand(600), fg: "#ffffff" },
    secondary: { bg: t.surface, fg: t.text, border: t.border },
    danger: { bg: t.dangerBg, fg: t.danger, border: t.dangerBorder },
    ghost: { bg: "transparent", fg: t.brand(600) },
  };
  const v = variants[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        st.base,
        size === "sm" ? st.sm : st.md,
        {
          backgroundColor: v.bg,
          borderColor: v.border ?? "transparent",
          borderWidth: v.border ? StyleSheet.hairlineWidth : 0,
          opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
        },
        style,
      ]}
    >
      {loading && <ActivityIndicator size="small" color={v.fg} style={{ marginRight: 8 }} />}
      <Text style={[st.text, size === "sm" ? st.textSm : null, { color: v.fg }]}>{title}</Text>
    </Pressable>
  );
}

const st = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  md: { paddingHorizontal: 16, paddingVertical: 11 },
  sm: { paddingHorizontal: 12, paddingVertical: 7 },
  text: { fontSize: 14, fontWeight: "600" },
  textSm: { fontSize: 13 },
});
