import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { api } from "@/lib/api";
import { gameRef } from "@/lib/gameRef";
import { useTheme } from "@/theme/ThemeContext";
import { ColorBadge, ResultBadge } from "@/components/ui/Badge";
import { GameReplay, type SideScores } from "@/components/chess/GameReplay";
import type { RootStackParamList } from "@/navigation/types";
import type { Game, MasterGame } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "GameAnalysis">;

/** A Game record's result, expressed as a score per side. It is stored
 * relative to the player being scouted, so it needs their colour to read. */
function scoresFromGameResult(result: string, playerColor: "white" | "black"): SideScores {
  const other = playerColor === "white" ? "black" : "white";
  const pair: Record<string, [string, string]> = { win: ["1", "0"], loss: ["0", "1"], draw: ["½", "½"] };
  const found = pair[result];
  if (!found) return { white: null, black: null };
  return { [playerColor]: found[0], [other]: found[1] } as SideScores;
}

const safe = (s: string) => s.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");

function ScoutedGame({ game }: { game: Game }) {
  const t = useTheme();
  const [pgn, setPgn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getGamePgn(gameRef(game))
      .then((data) => !cancelled && setPgn(data.pgn_text))
      .catch((err) => !cancelled && setError(err.message || "Failed to load PGN"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [game.id]);

  const color = game.color_played === "black" ? "black" : "white";
  const dateStr = game.date_played
    ? new Date(game.date_played).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;
  // Only reached when the PGN carries no name tag for that side.
  const opponent = { name: game.opponent_name, rating: game.opponent_rating ? String(game.opponent_rating) : null };

  return (
    <GameReplay
      pgn={pgn}
      loading={loading}
      error={error}
      orientation={color}
      players={color === "black" ? { white: opponent } : { black: opponent }}
      // Only used when the PGN has no Result tag.
      scores={scoresFromGameResult(game.result, color)}
      filename={`${safe(game.opponent_name)}_${game.date_played ? game.date_played.replace(/-/g, "") : "unknown"}_${game.result}.pgn`}
      header={
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontWeight: "700", color: t.text, fontSize: 15 }} numberOfLines={1}>
              {game.opponent_name}
              {game.opponent_rating ? ` (${game.opponent_rating})` : ""}
            </Text>
            <ColorBadge color={game.color_played} />
            <ResultBadge result={game.result} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 3 }}>
            {dateStr && <Text style={{ fontSize: 11, color: t.textMuted }}>{dateStr}</Text>}
            {game.event ? <Text style={{ fontSize: 11, color: t.textMuted }}>{game.event}{game.round ? ` · R${game.round}` : ""}</Text> : null}
            {game.opening_name ? <Text style={{ fontSize: 11, color: t.brand(600) }}>{game.opening_name}</Text> : null}
          </View>
        </View>
      }
    />
  );
}

function masterPgn(game: MasterGame): string {
  const tags: [string, string | number | null][] = [
    ["White", game.white], ["Black", game.black], ["WhiteElo", game.white_elo], ["BlackElo", game.black_elo],
    ["Result", game.result], ["ECO", game.eco], ["Opening", game.opening_name], ["Event", game.event],
    ["Site", game.site], ["Date", game.year ? `${game.year}.??.??` : null],
  ];
  const head = tags.filter(([, v]) => v !== null && v !== "").map(([k, v]) => `[${k} "${v}"]`);
  return `${head.join("\n")}\n\n${game.moves ?? ""}`;
}

function MasterGameView({ game }: { game: MasterGame }) {
  const t = useTheme();
  const resultLabel = game.result === "1/2-1/2" ? "½–½" : game.result === "1-0" ? "1–0" : "0–1";
  return (
    <GameReplay
      pgn={masterPgn(game)}
      orientation="white"
      filename={`${safe(game.white)}_vs_${safe(game.black)}_${game.year ?? "?"}_${game.result.replace("/", "-")}.pgn`}
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
            {game.year ? <Text style={{ fontSize: 11, color: t.textMuted }}>{game.year}</Text> : null}
            {game.event ? <Text style={{ fontSize: 11, color: t.textMuted }}>{game.event}</Text> : null}
            {game.opening_name ? <Text style={{ fontSize: 11, color: t.brand(600) }}>{game.eco} · {game.opening_name}</Text> : null}
          </View>
        </View>
      }
    />
  );
}

/** Any game, on its own screen. Android's back button and iOS's swipe-back
 * leave it, because it is a stack screen rather than a modal. */
export function GameAnalysisScreen({ route }: Props) {
  return route.params.kind === "game" ? <ScoutedGame game={route.params.game} /> : <MasterGameView game={route.params.game} />;
}
