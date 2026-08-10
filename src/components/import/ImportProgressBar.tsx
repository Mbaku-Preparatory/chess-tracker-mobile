import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

const CR_COLOR = "#1a3a6b";
const CELLS = 10;

/**
 * A rank of pawns with a wave running across it, repeating.
 *
 * Deliberately indeterminate. One tournament takes fifteen-plus seconds, and a
 * bar sitting on "0 of 1" that whole time reads as a frozen app. The real
 * counts underneath stay exactly as accurate as before — the animation is
 * reassurance, the text is the truth.
 *
 * The web version does this with a CSS keyframe and per-element delays; React
 * Native has no stylesheet animations, so each pawn gets its own Animated
 * value driven by one looping timeline.
 */
export function ImportProgressBar({
  done,
  total,
  games,
}: {
  done: number;
  total: number;
  games: number;
}) {
  const t = useTheme();
  const filled = total === 0 ? 0 : Math.floor((done / total) * CELLS);

  // One value per pawn, created once and reused across renders.
  const anims = useRef(
    Array.from({ length: CELLS }, () => new Animated.Value(0.25))
  ).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.stagger(
        80,
        anims.map((v) =>
          Animated.sequence([
            Animated.timing(v, {
              toValue: 1,
              duration: 400,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(v, {
              toValue: 0.25,
              duration: 400,
              easing: Easing.in(Easing.ease),
              useNativeDriver: true,
            }),
          ])
        )
      )
    );
    loop.start();
    return () => loop.stop();
  }, [anims]);

  return (
    <View style={[st.card, { borderColor: t.border, backgroundColor: t.surface }]}>
      <View style={st.header}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>
          {total === 1 ? "Importing tournament" : "Importing tournaments"}
        </Text>
        <Text style={{ fontSize: 11, color: t.textMuted }}>
          {done} of {total}
        </Text>
      </View>

      <View style={st.rank}>
        {anims.map((v, i) => (
          <Animated.Text
            key={i}
            style={{
              fontSize: 16,
              lineHeight: 20,
              color: CR_COLOR,
              // Completed pawns are solid and still; the rest carry the wave.
              opacity: i < filled ? 1 : v,
            }}
          >
            ♟
          </Animated.Text>
        ))}
      </View>

      <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 6 }}>
        <Text style={{ fontWeight: "700", color: t.text }}>{games}</Text> game
        {games !== 1 ? "s" : ""} imported so far
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14 },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  rank: { flexDirection: "row", gap: 2 },
});
