import { Pressable, StyleSheet, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";

import { useTheme } from "@/theme/ThemeContext";

/** A move the bot could have played instead, offered as a button. */
export interface SpeechChoice {
  san: string;
  /** Games of theirs that played it. */
  count: number;
  onPick: () => void;
}

/**
 * The bot talking, as on the web (components/bot/BotSpeech.tsx there): its
 * face beside a speech bubble, first person, and under it the other moves it
 * could have played, while you can still ask for one.
 */
export function BotSpeech({ avatarUrl, text, choices = [] }: { avatarUrl: string; text: string; choices?: SpeechChoice[] }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      <View style={[st.avatar, { backgroundColor: t.elevated }]}>
        <SvgUri uri={avatarUrl} width={44} height={44} />
      </View>
      <View style={[st.bubble, { backgroundColor: t.elevated }]}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: t.text }} accessibilityLiveRegion="polite">
          {text}
        </Text>
        {choices.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }} accessibilityLabel="Play another move instead">
            {choices.map((c) => (
              <Pressable
                key={c.san}
                onPress={c.onPick}
                accessibilityRole="button"
                accessibilityLabel={`Play ${c.san} instead, ${c.count} ${c.count === 1 ? "game" : "games"}`}
                style={[st.chip, { borderColor: t.brand(600) }]}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: t.brand(600) }}>{c.san}</Text>
                <Text style={{ fontSize: 11, color: t.textMuted }}>{c.count}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  avatar: { width: 44, height: 44, borderRadius: 22, overflow: "hidden" },
  bubble: { flex: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
  chip: { flexDirection: "row", alignItems: "baseline", gap: 4, borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
});
