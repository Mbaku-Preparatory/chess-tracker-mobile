import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { GameReplay } from "@/components/chess/GameReplay";
import type { MasterGame } from "@/types";

function buildFullPgn(game: MasterGame): string {
  const lines: string[] = [];
  lines.push(`[White "${game.white}"]`);
  lines.push(`[Black "${game.black}"]`);
  if (game.white_elo) lines.push(`[WhiteElo "${game.white_elo}"]`);
  if (game.black_elo) lines.push(`[BlackElo "${game.black_elo}"]`);
  lines.push(`[Result "${game.result}"]`);
  if (game.eco) lines.push(`[ECO "${game.eco}"]`);
  if (game.opening_name) lines.push(`[Opening "${game.opening_name}"]`);
  if (game.event) lines.push(`[Event "${game.event}"]`);
  if (game.site) lines.push(`[Site "${game.site}"]`);
  if (game.year) lines.push(`[Date "${game.year}.??.??"]`);
  lines.push("");
  lines.push(game.moves ?? "");
  return lines.join("\n");
}

function pgnFilename(game: MasterGame): string {
  const w = game.white.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  const b = game.black.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  return `${w}_vs_${b}_${game.year ?? "?"}_${game.result.replace("/", "-")}.pgn`;
}

export function MasterGameViewerModal({ game, onClose }: { game: MasterGame; onClose: () => void }) {
  const t = useTheme();
  const pgn = buildFullPgn(game);
  const resultLabel = game.result === "1/2-1/2" ? "½–½" : game.result === "1-0" ? "1–0" : "0–1";

  return (
    <GameReplay
      pgn={pgn}
      orientation="white"
      onClose={onClose}
      filename={pgnFilename(game)}
      header={
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontWeight: "700", color: t.text, fontSize: 14 }} numberOfLines={1}>
              {game.white}{game.white_elo ? ` (${game.white_elo})` : ""} vs {game.black}{game.black_elo ? ` (${game.black_elo})` : ""}
            </Text>
            <View style={{ backgroundColor: t.elevated, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: t.text }}>{resultLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 }}>
            {game.year && <Text style={{ fontSize: 11, color: t.textMuted }}>{game.year}</Text>}
            {game.event && <Text style={{ fontSize: 11, color: t.textMuted }}>{game.event}</Text>}
            {game.opening_name && <Text style={{ fontSize: 11, color: t.brand(600) }}>{game.eco} · {game.opening_name}</Text>}
          </View>
        </View>
      }
    />
  );
}
