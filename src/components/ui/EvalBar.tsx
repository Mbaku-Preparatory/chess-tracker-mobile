import { StyleSheet, Text, View } from "react-native";

import { cpToWhitePct, formatScore, type StockfishResult } from "@/hooks/useStockfish";
import { useTheme } from "@/theme/ThemeContext";

type EvalBarProps = Pick<StockfishResult, "score" | "mate" | "depth" | "isAnalyzing" | "source"> & { height?: number };

export function EvalBar({ score, mate, depth, isAnalyzing, source, height = 220 }: EvalBarProps) {
  const t = useTheme();
  const whitePct = cpToWhitePct(score, mate);
  const label = formatScore(score, mate);

  return (
    <View style={st.wrap}>
      <Text style={[st.label, { color: t.textMuted }]}>{isAnalyzing && depth === 0 ? "…" : label}</Text>
      <View style={[st.bar, { height, borderColor: t.border }]}>
        <View style={[st.blackPart, { height: `${100 - whitePct}%` }]} />
        <View style={[st.whitePart, { height: `${whitePct}%`, backgroundColor: "#ffffff" }]} />
      </View>
      <View style={st.dotWrap}>
        {isAnalyzing ? (
          <View style={[st.dot, { backgroundColor: t.brand(400) }]} />
        ) : source === "lichess" ? (
          <View style={[st.dot, { backgroundColor: "#fbbf24" }]} />
        ) : null}
      </View>
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
});
