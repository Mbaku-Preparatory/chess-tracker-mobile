import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeContext";
import { ColorBadge, ResultBadge } from "@/components/ui/Badge";
import { GameReplay } from "@/components/chess/GameReplay";
import type { Game } from "@/types";

function pgnFilename(game: Game): string {
  const opp = game.opponent_name.replace(/[^a-z0-9]/gi, "_").replace(/_+/g, "_");
  const date = game.date_played ? game.date_played.replace(/-/g, "") : "unknown";
  return `${opp}_${date}_${game.result}.pgn`;
}

export function PgnViewerModal({ game, onClose }: { game: Game; onClose: () => void }) {
  const t = useTheme();
  const [pgn, setPgn] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getGamePgn(game.id)
      .then((data) => {
        if (!cancelled) setPgn(data.pgn_text);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Failed to load PGN");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [game.id]);

  const dateStr = game.date_played
    ? new Date(game.date_played).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : null;

  // Only reached when the PGN carries no name tag for that side; the scouted
  // player's own name is not on the game record, so their plate falls back to
  // the colour word rather than inventing one.
  const opponent = {
    name: game.opponent_name,
    rating: game.opponent_rating ? String(game.opponent_rating) : null,
  };

  return (
    <GameReplay
      pgn={pgn}
      loading={loading}
      error={error}
      orientation={game.color_played === "black" ? "black" : "white"}
      players={game.color_played === "black" ? { white: opponent } : { black: opponent }}
      onClose={onClose}
      filename={pgnFilename(game)}
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
            {game.event && <Text style={{ fontSize: 11, color: t.textMuted }}>{game.event}{game.round ? ` · R${game.round}` : ""}</Text>}
            {game.opening_name && <Text style={{ fontSize: 11, color: t.brand(600) }}>{game.opening_name}</Text>}
          </View>
        </View>
      }
    />
  );
}
