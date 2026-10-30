import { Pressable, StyleSheet, Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import type { ParsedMove } from "./GameReplay";
import type { AnalysisLine } from "./useAnalysisLine";

/**
 * The game as a numbered two-column list, the way Chess.com shows it, with the
 * line you tried indented under the move it replaced. Both stay tappable: the
 * game is never hidden behind the variation, so there is no "back to the game"
 * to find. The same layout as the web app's.
 */
export function MoveList({ mainMoves, line, intro = null }: { mainMoves: ParsedMove[]; line: AnalysisLine; intro?: string | null }) {
  const t = useTheme();
  const startsAt = line.branchStartsAt;

  // A move of the game is current when the board is on it: on the game, or
  // on the branch's stretch of the game before the branch leaves it.
  const mainActive = (i: number) => line.index === i && (!line.onBranch || (startsAt !== null && i < startsAt));
  const branchActive = (i: number) => line.onBranch && line.index === i;

  const rows: { number: number; white: number | null; black: number | null }[] = [];
  mainMoves.forEach((m, i) => {
    if (m.color === "w" || rows.length === 0) rows.push({ number: m.moveNumber, white: null, black: null });
    rows[rows.length - 1][m.color === "w" ? "white" : "black"] = i;
  });
  // Under the row of the move it replaced, or after the last row when the
  // line continues past the end of the game.
  const replacedRow = rows.findIndex((r) => r.white === startsAt || r.black === startsAt);
  const variationRow = !line.branch ? -1 : replacedRow >= 0 ? replacedRow : rows.length - 1;

  const cell = (i: number | null) =>
    i === null ? (
      <View style={{ flex: 1 }} />
    ) : (
      <Pressable
        onPress={() => line.selectMain(i)}
        style={[st.cell, mainActive(i) ? { backgroundColor: t.brand(600) } : null]}
      >
        <Text style={[st.mono, { color: mainActive(i) ? "#fff" : t.text }]}>{mainMoves[i].san}</Text>
      </Pressable>
    );

  const variation = line.branch && startsAt !== null && (
    <View style={[st.variation, { borderColor: t.brand(500) }]}>
      {line.branch.moves.map((m, k) => {
        const i = startsAt + k;
        const label = m.color === "w" ? `${m.moveNumber}.` : k === 0 ? `${m.moveNumber}…` : null;
        return (
          <View key={i} style={{ flexDirection: "row", alignItems: "center" }}>
            {label && <Text style={[st.mono, { color: t.textFaint, fontSize: 12 }]}>{label}</Text>}
            <Pressable
              onPress={() => line.selectBranch(i)}
              style={[st.chip, branchActive(i) ? { backgroundColor: t.brand(600) } : null]}
            >
              <Text style={[st.mono, { fontSize: 12, color: branchActive(i) ? "#fff" : t.brand(600) }]}>{m.san}</Text>
            </Pressable>
          </View>
        );
      })}
    </View>
  );

  // An annotated game's notes sit under the row of the move they follow, in
  // the body font: they are prose, not notation.
  const note = (i: number | null) =>
    i !== null && mainMoves[i].comment ? <Text key={i} style={[st.note, { color: t.textMuted }]}>{mainMoves[i].comment}</Text> : null;

  return (
    <View>
      {intro && <Text style={[st.note, { color: t.textMuted }]}>{intro}</Text>}
      {rows.length === 0 && variation}
      {rows.map((r, n) => (
        <View key={n}>
          <View style={[st.row, n % 2 === 0 ? { backgroundColor: t.elevated } : null]}>
            <Text style={[st.mono, st.number, { color: t.textFaint }]}>{r.number}.</Text>
            {r.white === null ? <Text style={[st.mono, st.cell, { flex: 1, color: t.textFaint }]}>…</Text> : cell(r.white)}
            {cell(r.black)}
          </View>
          {note(r.white)}
          {note(r.black)}
          {n === variationRow && variation}
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  mono: { fontFamily: "monospace", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "center", borderRadius: 4 },
  number: { width: 40, paddingLeft: 8 },
  cell: { flex: 1, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 5 },
  note: { fontSize: 13, lineHeight: 19, paddingHorizontal: 10, paddingVertical: 6 },
  chip: { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2, marginRight: 2 },
  variation: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginLeft: 40, marginVertical: 4, paddingLeft: 10, paddingVertical: 4, borderLeftWidth: 2 },
});
