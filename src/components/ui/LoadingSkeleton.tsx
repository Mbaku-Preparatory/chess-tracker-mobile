import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";

function usePulse() {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return opacity;
}

export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  const t = useTheme();
  const opacity = usePulse();
  return (
    <Animated.View style={{ opacity, gap: 10 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[st.line, { backgroundColor: t.elevated, width: `${85 - i * 15}%` }]}
        />
      ))}
    </Animated.View>
  );
}

export function CardSkeleton() {
  const t = useTheme();
  const opacity = usePulse();
  return (
    <Animated.View style={[st.card, { opacity, backgroundColor: t.card, borderColor: t.border }]}>
      <View style={[st.line, { backgroundColor: t.elevated, width: "33%", height: 18, marginBottom: 16 }]} />
      <View style={{ gap: 10 }}>
        <View style={[st.line, { backgroundColor: t.elevated, width: "100%" }]} />
        <View style={[st.line, { backgroundColor: t.elevated, width: "85%" }]} />
        <View style={[st.line, { backgroundColor: t.elevated, width: "65%" }]} />
      </View>
    </Animated.View>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  const t = useTheme();
  const opacity = usePulse();
  return (
    <Animated.View style={{ opacity, gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={[st.row, { backgroundColor: t.elevated }]} />
      ))}
    </Animated.View>
  );
}

const st = StyleSheet.create({
  line: { height: 14, borderRadius: 4 },
  card: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 20 },
  row: { height: 56, borderRadius: 12 },
});
