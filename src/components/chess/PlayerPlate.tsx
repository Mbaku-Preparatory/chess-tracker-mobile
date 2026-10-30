import { StyleSheet, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";

import { useTheme } from "@/theme/ThemeContext";

/**
 * The name strip above or below a board: a dot for the colour, the name, a
 * score or tag, the rating at the right edge. The game screen and the bot
 * use it; the bot adds an avatar and a "Bot · 1800" tag.
 */
export function PlayerPlate({
  name,
  rating,
  color,
  width,
  score,
  tag,
  avatarUrl,
}: {
  name: string;
  rating: string | number | null;
  color: "white" | "black";
  width: number;
  score?: string | null;
  tag?: string;
  avatarUrl?: string;
}) {
  const t = useTheme();
  const dot = (
    <View
      style={[
        st.dot,
        {
          backgroundColor: color === "white" ? "#ffffff" : "#1f2937",
          borderColor: color === "white" ? "#d1d5db" : "#4b5563",
        },
        avatarUrl ? st.dotOnAvatar : null,
      ]}
    />
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, width }}>
      {avatarUrl ? (
        <View>
          <View style={[st.avatar, { backgroundColor: t.elevated }]}>
            <SvgUri uri={avatarUrl} width={28} height={28} />
          </View>
          {dot}
        </View>
      ) : (
        dot
      )}
      {/* No flex:1 on the name — that would push the score out to the right
          edge with the rating. The name takes what it needs and truncates,
          the score sits against it, and marginLeft:"auto" on the rating is
          what holds the right edge. */}
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: "700", color: t.text }}>
        {name}
      </Text>
      {score ? <Text style={{ fontSize: 13, fontWeight: "800", color: t.text }}>({score})</Text> : null}
      {tag ? (
        <View style={[st.tag, { backgroundColor: t.elevated }]}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: t.textMuted, letterSpacing: 0.4 }}>{tag.toUpperCase()}</Text>
        </View>
      ) : null}
      {rating ? <Text style={{ marginLeft: "auto", fontSize: 11, color: t.textMuted }}>{rating}</Text> : null}
    </View>
  );
}

const st = StyleSheet.create({
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: StyleSheet.hairlineWidth },
  dotOnAvatar: { position: "absolute", right: -2, bottom: -2 },
  avatar: { width: 28, height: 28, borderRadius: 14, overflow: "hidden" },
  tag: { borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
});
