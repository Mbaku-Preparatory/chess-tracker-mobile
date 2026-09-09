import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Chessboard, { type ChessboardRef } from "react-native-chessboard";

import { api } from "@/lib/api";
import { userMessage } from "@/lib/apiError";
import { usePuzzleSolve } from "@/components/chess/puzzleSolve";
import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/SectionContainer";
import { useTheme } from "@/theme/ThemeContext";
import type { Puzzle } from "@/types";

/**
 * The daily puzzle: one position, and the move that wins it.
 *
 * Play your move on the board. The opponent answers, and you play the next
 * one — usually two or three in all. A wrong move ends it, which is what makes
 * getting it right mean anything.
 *
 * Nothing is checked here. Each move goes to the server and comes back marked,
 * because the line is the whole point and a client that could check its own
 * moves would have been handed it.
 */

/** Lichess's theme tags are camelCase; nobody wants to read "mateIn2". */
function prettyTheme(tag: string): string {
  const spaced = tag.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * What to tell the player right now.
 *
 * Deliberately never says how many moves are left in a way that gives the line
 * away — "find 2 moves" is the shape of the puzzle, not its content, and
 * Lichess shows the same thing.
 */
function statusLine(puzzle: Puzzle, status: string, found: number) {
  if (status === "solved") return { text: "Solved", tone: "good" as const };
  if (status === "failed") return { text: "Not the move", tone: "bad" as const };
  if (found > 0) return { text: "Right — keep going", tone: "good" as const };
  const side = puzzle.side_to_move === "white" ? "White" : "Black";
  const count = puzzle.moves_to_find === 1 ? "the move" : `${puzzle.moves_to_find} moves`;
  return { text: `${side} to play · find ${count}`, tone: "plain" as const };
}

function PuzzleBoard({ puzzle, onChanged }: { puzzle: Puzzle; onChanged: (p: Puzzle) => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 420);

  const [error, setError] = useState<string | null>(null);
  const solve = usePuzzleSolve(puzzle, api.playPuzzleMove, onChanged);
  const boardRef = useRef<ChessboardRef>(null);

  // The board owns its own position — `fen` is only its starting one — so it
  // has to be told whenever ours moves without it.
  //
  // Which is most of the time: the opponent's reply and the take-back after a
  // wrong move are both ours alone. The exception is the player's own drag,
  // where the board has already animated the move and resetting would fight
  // the gesture that caused it. This ref marks that one case.
  const cameFromBoard = useRef(false);
  useEffect(() => {
    if (cameFromBoard.current) {
      cameFromBoard.current = false;
      return;
    }
    boardRef.current?.resetBoard(solve.fen);
  }, [solve.fen]);

  const status = statusLine(puzzle, solve.status, solve.found);
  const toneColour =
    status.tone === "good" ? t.brand(600) : status.tone === "bad" ? t.danger : t.text;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center" }}>
        <Chessboard
          ref={boardRef}
          fen={puzzle.fen}
          // Your pieces at the bottom. Solving a tactic from the other side of
          // the board is a different and much worse puzzle.
          flipped={puzzle.side_to_move === "black"}
          boardSize={boardSize}
          gestureEnabled={solve.status === "playing"}
          withLetters={false}
          withNumbers={false}
          colors={{ black: "#4a7c59", white: "#f0d9b5" }}
          onMove={({ move }) => {
            if (!move) return;
            cameFromBoard.current = true;
            setError(null);
            solve.play(move.from, move.to);
          }}
        />
      </View>

      <View style={[st.status, { borderColor: t.border, backgroundColor: t.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "800", color: toneColour }}>{status.text}</Text>
          <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
            Move {puzzle.move_number}
            {puzzle.rating ? ` · rated ${puzzle.rating}` : ""}
            {solve.status === "playing" && puzzle.moves_to_find > 1
              ? ` · ${solve.found}/${puzzle.moves_to_find} found`
              : ""}
          </Text>
        </View>
        {solve.status === "checking" && <ActivityIndicator size="small" color={t.brand(600)} />}
      </View>

      {error && <Text style={{ color: t.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>}

      {puzzle.finished && (
        <View style={[st.outcome, { borderColor: t.border, backgroundColor: t.surface }]}>
          {/* Only now: before this, these are the answer. */}
          {solve.solutionSan.length > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: "700", color: t.textFaint }}>
                THE LINE
              </Text>
              <Text style={[st.line, { color: t.text }]}>{solve.solutionSan.join("  ")}</Text>
            </>
          )}
          {puzzle.themes.length > 0 && (
            <View style={st.themeRow}>
              {puzzle.themes.slice(0, 4).map((tag) => (
                <View key={tag} style={[st.themeChip, { borderColor: t.border }]}>
                  <Text style={{ fontSize: 11, color: t.textMuted }}>{prettyTheme(tag)}</Text>
                </View>
              ))}
            </View>
          )}
          {!!puzzle.game_url && (
            <Pressable
              onPress={() => Linking.openURL(puzzle.game_url)}
              style={[st.gameLink, { borderColor: t.border }]}
            >
              <Ionicons name="open-outline" size={14} color={t.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: t.textMuted }}>
                See the game
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export function GamesScreen() {
  const t = useTheme();
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getPuzzles()
      .then((body) => setPuzzles(body.puzzles))
      .catch((err) => setError(userMessage(err, "Couldn't load the puzzles.")))
      .finally(() => setLoading(false));
  }, []);

  const current = puzzles[index];

  // Replaces the one puzzle that changed rather than refetching the list: the
  // server has already returned its new state, and a refetch would throw away
  // a scroll position to learn what we were just told.
  const replace = useCallback(
    (next: Puzzle) => setPuzzles((prev) => prev.map((p) => (p.id === next.id ? next : p))),
    []
  );

  return (
    <Screen>
      <PageHeader
        title="Daily puzzle"
        subtitle={current ? new Date(current.date).toDateString() : "One position, one line"}
      />

      {loading ? (
        <ActivityIndicator color={t.brand(600)} style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={{ color: t.danger }}>{error}</Text>
      ) : !current ? (
        <EmptyState
          title="No puzzle yet"
          description="A new position is set each day. Check back shortly."
        />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {puzzles.length > 1 && (
            <View style={st.dayRow}>
              {puzzles.map((p, i) => (
                <Pressable
                  key={p.id}
                  onPress={() => setIndex(i)}
                  style={[
                    st.dayChip,
                    {
                      borderColor: i === index ? t.brand(600) : t.border,
                      backgroundColor: i === index ? t.brand(600) : t.surface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "700",
                      color: i === index ? "#fff" : p.solved ? t.brand(600) : t.textMuted,
                    }}
                  >
                    {new Date(p.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                    {p.solved ? " ✓" : p.failed ? " ✕" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          {/* Keyed on the puzzle: switching days is a new board, and carrying
              the old one's move state across would be a bug hunt later. */}
          <PuzzleBoard key={current.id} puzzle={current} onChanged={replace} />
        </ScrollView>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  status: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  outcome: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 8 },
  line: { fontSize: 14, fontFamily: "monospace", fontWeight: "700" },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  themeChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  gameLink: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dayRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 12 },
  dayChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
