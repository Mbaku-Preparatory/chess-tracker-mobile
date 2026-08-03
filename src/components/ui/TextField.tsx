import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";

interface TextFieldProps extends TextInputProps {
  label?: string;
  isPassword?: boolean;
  error?: string;
}

export function TextField({ label, isPassword, error, style, ...rest }: TextFieldProps) {
  const t = useTheme();
  const [hidden, setHidden] = useState(!!isPassword);

  return (
    <View style={{ marginBottom: 4 }}>
      {label && <Text style={[st.label, { color: t.textMuted }]}>{label}</Text>}
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          {...rest}
          secureTextEntry={isPassword ? hidden : rest.secureTextEntry}
          placeholderTextColor={t.textFaint}
          style={[
            st.input,
            { color: t.text, borderColor: error ? t.danger : t.border, backgroundColor: t.surface },
            isPassword ? { paddingRight: 40 } : null,
            style,
          ]}
        />
        {isPassword && (
          <Pressable style={st.eyeBtn} onPress={() => setHidden((v) => !v)}>
            <Ionicons name={hidden ? "eye-outline" : "eye-off-outline"} size={18} color={t.textFaint} />
          </Pressable>
        )}
      </View>
      {error && <Text style={[st.error, { color: t.danger }]}>{error}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  label: { marginBottom: 6, fontSize: 13, fontWeight: "500" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
  },
  eyeBtn: { position: "absolute", right: 10, height: 44, justifyContent: "center" },
  error: { marginTop: 4, fontSize: 12 },
});
