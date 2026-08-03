import { StyleSheet, Text, View } from "react-native";

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

const SOURCE_COLORS: Record<string, { bg: string; fg: string; border: string }> = {
  chess_com: { bg: "rgba(127,166,80,0.12)", fg: "#4a6e2e", border: "rgba(127,166,80,0.35)" },
  lichess: { bg: "rgba(176,80,0,0.12)", fg: "#7a3800", border: "rgba(176,80,0,0.35)" },
  chess_results: { bg: "rgba(26,58,107,0.12)", fg: "#1a3a6b", border: "rgba(26,58,107,0.35)" },
  pgn_import: { bg: "#f5f3ff", fg: "#6d28d9", border: "#ddd6fe" },
  manual: { bg: "#f3f4f6", fg: "#4b5563", border: "#e5e7eb" },
};

const SOURCE_LABELS: Record<string, string> = {
  chess_com: "Chess.com",
  lichess: "Lichess",
  chess_results: "OTB",
  pgn_import: "PGN",
  manual: "Manual",
};

export function SourceBadge({ source }: { source: string }) {
  const c = SOURCE_COLORS[source] ?? SOURCE_COLORS.manual;
  const label = SOURCE_LABELS[source] ?? source;
  return (
    <View style={[st.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
      <Text style={[st.badgeText, { color: c.fg }]}>{label}</Text>
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
