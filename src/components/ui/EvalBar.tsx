import { StyleSheet, Text, View } from "react-native";

import { cpToWhitePct, formatScore, type StockfishResult } from "@/hooks/useStockfish";
import { useTheme } from "@/theme/ThemeContext";

type EvalBarProps = Pick<StockfishResult, "score" | "mate" | "depth" | "isAnalyzing" | "source"> & {
  /** Only used by the vertical bar. */
  height?: number;
  /**
   * Horizontal reads left-to-right as white's share of the position, which is
   * the shape that fits under a full-width board. Vertical is kept for
   * anywhere the bar still stands beside one.
   */
  orientation?: "vertical" | "horizontal";
};

export function EvalBar({
  score,
  mate,
  depth,
  isAnalyzing,
  source,
  height = 220,
  orientation = "vertical",
}: EvalBarProps) {
  const t = useTheme();
  const whitePct = cpToWhitePct(score, mate);
  const label = formatScore(score, mate);
  const shown = isAnalyzing && depth === 0 ? "…" : label;

  const statusDot = isAnalyzing ? (
    <View style={[st.dot, { backgroundColor: t.brand(400) }]} />
  ) : source === "lichess" ? (
    <View style={[st.dot, { backgroundColor: "#fbbf24" }]} />
  ) : null;

  if (orientation === "horizontal") {
    return (
      <View style={st.hWrap}>
        {/* White's share grows from the left, which is where White sits when
            the board is the usual way up. */}
        <View style={[st.hBar, { borderColor: t.border }]}>
          <View style={[st.hWhitePart, { width: `${whitePct}%` }]} />
        </View>
        <View style={st.hMeta}>
          <Text style={[st.label, { color: t.textMuted }]}>{shown}</Text>
          <View style={st.dotWrap}>{statusDot}</View>
        </View>
      </View>
    );
  }

  return (
    <View style={st.wrap}>
      <Text style={[st.label, { color: t.textMuted }]}>{shown}</Text>
      <View style={[st.bar, { height, borderColor: t.border }]}>
        <View style={[st.blackPart, { height: `${100 - whitePct}%` }]} />
        <View style={[st.whitePart, { height: `${whitePct}%`, backgroundColor: "#ffffff" }]} />
      </View>
      <View style={st.dotWrap}>{statusDot}</View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { width: 24, alignItems: "center", gap: 4 },
  label: { fontSize: 10, fontWeight: "700", fontFamily: "monospace" },
  bar: { width: 12, borderRadius: 6, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden", backgroundColor: "#1f2937" },
  blackPart: { width: "100%", backgroundColor: "#1f2937" },
  whitePart: { width: "100%" },
  dotWrap: { height: 8, alignItems: "center", justifyContent: "center" },
  dot: { height: 6, width: 6, borderRadius: 3 },

  hWrap: { flexDirection: "row", alignItems: "center", gap: 8, width: "100%" },
  hBar: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    backgroundColor: "#1f2937",
  },
  hWhitePart: { height: "100%", backgroundColor: "#ffffff" },
  hMeta: { flexDirection: "row", alignItems: "center", gap: 4, minWidth: 46, justifyContent: "flex-end" },
});
