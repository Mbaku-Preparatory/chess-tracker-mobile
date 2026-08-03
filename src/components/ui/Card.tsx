import { StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

export function Card({ style, children, ...rest }: ViewProps & { style?: ViewStyle }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: t.card,
          borderColor: t.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: 12,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
