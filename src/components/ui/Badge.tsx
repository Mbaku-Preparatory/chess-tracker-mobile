import { StyleSheet, Text, View } from "react-native";

import { gameSource, tint } from "@/lib/games";
import { useTheme } from "@/theme/ThemeContext";

type BadgeVariant = "default" | "eco" | "win" | "draw" | "loss" | "white" | "black";

function useBadgeStyles() {
  const t = useTheme();
  const isDark = t.mode === "dark";
  const styles: Record<BadgeVariant, { bg: string; fg: string; border?: string }> = {
    default: { bg: t.elevated, fg: t.textMuted },
    eco: { bg: isDark ? "rgba(99,102,241,0.15)" : "#eef2ff", fg: isDark ? "#a5b4fc" : "#4338ca", border: isDark ? "rgba(99,102,241,0.35)" : "#c7d2fe" },
    win: { bg: t.successBg, fg: t.success, border: t.successBg },
    draw: { bg: t.warningBg, fg: t.warning, border: t.warningBg },
    loss: { bg: t.dangerBg, fg: t.danger, border: t.dangerBg },
    white: { bg: t.surface, fg: t.text, border: t.border },
    black: { bg: "#1f2937", fg: "#ffffff" },
  };
  return styles;
}

export function Badge({ label, variant = "default" }: { label: string; variant?: BadgeVariant }) {
  const styles = useBadgeStyles();
  const s = styles[variant] ?? styles.default;
  return (
    <View style={[st.badge, { backgroundColor: s.bg, borderColor: s.border ?? "transparent" }]}>
      <Text style={[st.badgeText, { color: s.fg }]}>{label}</Text>
    </View>
  );
}

export function ResultBadge({ result }: { result: string }) {
  return <Badge label={result.charAt(0).toUpperCase() + result.slice(1)} variant={result as BadgeVariant} />;
}

export function ColorBadge({ color }: { color: string }) {
  return <Badge label={color.charAt(0).toUpperCase() + color.slice(1)} variant={color as BadgeVariant} />;
}

export function EcoBadge({ code }: { code: string }) {
  return <Badge label={code} variant="eco" />;
}

export function SourceBadge({ source }: { source: string }) {
  const s = gameSource(source);
  return (
    <View style={[st.badge, { backgroundColor: tint(s.color, 0.12), borderColor: tint(s.color, 0.35) }]}>
      <Text style={[st.badgeText, { color: s.text }]}>{s.short}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
