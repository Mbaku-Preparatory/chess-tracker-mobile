import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

const BLOCK = 8;
const GAP = 2;
const HEIGHT = 18;
// XP's green: a light rim over a strong middle
const GREEN = "#2ed330";
const RIM = "#acedad";

/**
 * A Windows XP progress bar, on purpose, as on the web (components/books/
 * RetroProgress.tsx there): green blocks filling a bevelled trough while a
 * book is read page by page. Before the page count is known three blocks run
 * across instead (XP's "marquee"), and stand still for people who asked for
 * less motion.
 */
export function RetroProgress({ value, label }: { value: number | null; label: string }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const percent = value === null ? null : Math.max(0, Math.min(100, Math.round(value * 100)));
  const inner = Math.max(0, width - 6);
  const filled = percent === null ? 3 : Math.floor(((inner + GAP) * percent) / 100 / (BLOCK + GAP));

  const run = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (percent !== null || !width) return;
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(Animated.timing(run, { toValue: 1, duration: 1600, easing: Easing.linear, useNativeDriver: true }));
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [percent, width, run]);

  const blocks = (
    <View style={{ flexDirection: "row", gap: GAP, height: "100%" }}>
      {Array.from({ length: Math.max(0, filled) }, (_, i) => (
        <View key={i} style={st.block}>
          <View style={st.rim} />
        </View>
      ))}
    </View>
  );

  return (
    <View style={{ gap: 6 }}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={percent === null ? undefined : { min: 0, max: 100, now: percent }}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={[st.trough, { backgroundColor: t.mode === "dark" ? "#1b1f18" : "#ffffff", borderColor: t.mode === "dark" ? "#5a5f55" : "#686868" }]}
      >
        {percent === null ? (
          <Animated.View
            style={{
              height: "100%",
              transform: [{ translateX: run.interpolate({ inputRange: [0, 1], outputRange: [-3 * (BLOCK + GAP), inner] }) }],
            }}
          >
            {blocks}
          </Animated.View>
        ) : (
          blocks
        )}
      </View>
      <Text style={{ fontSize: 13, color: t.textMuted, fontVariant: ["tabular-nums"] }}>{label}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  trough: { height: HEIGHT, borderWidth: 1, borderRadius: 3, padding: 2, overflow: "hidden", maxWidth: 360 },
  block: { width: BLOCK, height: "100%", backgroundColor: GREEN, borderRadius: 1, overflow: "hidden" },
  rim: { height: "30%", backgroundColor: RIM },
});
