import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { usePuzzleEntry } from "@/components/chess/puzzleEntry";
import { Screen } from "@/components/layout/Screen";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/SectionContainer";
import { useTheme } from "@/theme/ThemeContext";
import type { Puzzle, PuzzleVerdict } from "@/types";

/**
 * The daily puzzle: guess the five moves actually played from a real position.
 *
 * Moves are entered on the board rather than typed. It is chess and the board
 * is right there, and typing SAN would make the game partly a spelling test.
 *
 * Nothing is scored here. The attempt goes to the server and comes back marked
 * — the solution is the whole game, so a client that could mark it would have
 * been given it.
 */

const VERDICT_COLOUR: Record<PuzzleVerdict, string> = {
  correct: "#4a7c59",
  misplaced: "#c9a227",
  piece: "#3f6fa8",
  wrong: "#6b7280",
};

const VERDICT_MEANING: { verdict: PuzzleVerdict; label: string }[] = [
  { verdict: "correct", label: "Right move, right place" },
  { verdict: "misplaced", label: "In the line, wrong place" },
  { verdict: "piece", label: "Right piece, wrong move" },
  { verdict: "wrong", label: "Not in the line" },
];

function Tile({
  san,
  verdict,
  width,
}: {
  san: string | null;
  verdict?: PuzzleVerdict;
  width: number;
}) {
  const t = useTheme();
  const filled = !!verdict;
  return (
    <View
      style={[
        st.tile,
        {
          width,
          backgroundColor: filled ? VERDICT_COLOUR[verdict] : t.surface,
          borderColor: filled ? "transparent" : t.border,
        },
      ]}
    >
      <Text
        numberOfLines={1}
        style={{
          fontSize: 12,
          fontWeight: "700",
          fontFamily: "monospace",
          color: filled ? "#fff" : t.text,
        }}
      >
        {san ?? ""}
      </Text>
    </View>
  );
}

function Legend() {
  const t = useTheme();
  return (
    <View style={st.legend}>
      {VERDICT_MEANING.map(({ verdict, label }) => (
        <View key={verdict} style={st.legendItem}>
          <View style={[st.legendSwatch, { backgroundColor: VERDICT_COLOUR[verdict] }]} />
          <Text style={{ fontSize: 11, color: t.textMuted }}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function PuzzleBoard({ puzzle, onSolved }: { puzzle: Puzzle; onSolved: (p: Puzzle) => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 32, 380);
  const tileWidth = (boardSize - 4 * 6) / puzzle.solution_length;

  const entry = usePuzzleEntry(puzzle.fen, puzzle.solution_length);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef<ChessboardRef>(null);

  // The board owns its own position — `fen` is only its starting one — so it
  // has to be told when ours diverges. That is the price of this library: our
  // state is the record, and the board is pushed at rather than rendered from.
  //
  // Only when the entry goes *backwards*, though. After a drag the two already
  // agree, and resetting there would fight the animation the move just played
  // and throw away the board's own history mid-gesture.
  const syncedCount = useRef(0);
  useEffect(() => {
    if (entry.moves.length < syncedCount.current) {
      boardRef.current?.resetBoard(entry.fen || puzzle.fen);
    }
    syncedCount.current = entry.moves.length;
  }, [entry.moves.length, entry.fen, puzzle.fen]);

  // A different puzzle is a different game; the board has to start over.
  useEffect(() => {
    boardRef.current?.resetBoard(puzzle.fen);
    syncedCount.current = 0;
  }, [puzzle.id, puzzle.fen]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const next = await api.guessPuzzle(puzzle.id, entry.moves);
      entry.clear();
      onSolved(next);
    } catch (err) {
      setError(userMessage(err, "Couldn't submit that guess."));
    } finally {
      setSubmitting(false);
    }
  }

  const rows = Array.from({ length: puzzle.max_attempts }, (_, row) => {
    if (row < puzzle.guesses.length) {
      return { moves: puzzle.guesses[row], verdicts: puzzle.results[row] };
    }
    if (row === puzzle.guesses.length && !puzzle.finished) {
      return { moves: entry.moves, verdicts: null };
    }
    return { moves: [], verdicts: null };
  });

  return (
    <View style={{ gap: 14 }}>
      <View style={[st.prompt, { borderColor: t.border, backgroundColor: t.surface }]}>
        <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>
          {puzzle.side_to_move === "white" ? "White" : "Black"} to play, move {puzzle.move_number}
        </Text>
        <Text style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>
          {puzzle.white} vs {puzzle.black}
          {puzzle.year ? ` · ${puzzle.year}` : ""}
        </Text>
        <Text style={{ fontSize: 12, color: t.textFaint, marginTop: 4 }}>
          Play the {puzzle.solution_length} moves you think came next.
        </Text>
      </View>

      <View style={{ alignItems: "center" }}>
        <Chessboard
          ref={boardRef}
          fen={puzzle.fen}
          flipped={puzzle.side_to_move === "black"}
          boardSize={boardSize}
          gestureEnabled={!puzzle.finished}
          withLetters={false}
          withNumbers={false}
          colors={{ black: "#4a7c59", white: "#f0d9b5" }}
          // The board validates the move and tells us afterwards; our own
          // entry hook stays the record of what has been guessed, because it
          // is what the submit sends and what the tiles read.
          onMove={({ move }) => {
            if (move) entry.play(move.from, move.to);
          }}
        />
      </View>

      <View style={{ gap: 6 }}>
        {rows.map((row, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
            {Array.from({ length: puzzle.solution_length }, (_, col) => (
              <Tile
                key={col}
                san={row.moves[col] ?? null}
                verdict={row.verdicts?.[col]}
                width={tileWidth}
              />
            ))}
          </View>
        ))}
      </View>

      {error && <Text style={{ color: t.danger, fontSize: 12, textAlign: "center" }}>{error}</Text>}

      {!puzzle.finished && (
        <View style={{ flexDirection: "row", gap: 10, justifyContent: "center" }}>
          <Pressable
            // Only ours. The effect above notices the entry shrinking and
            // resets the board to match, so undoing on both would step back
            // twice.
            onPress={entry.undo}
            disabled={entry.moves.length === 0}
            style={[st.btn, { borderColor: t.border, opacity: entry.moves.length ? 1 : 0.4 }]}
          >
            <Ionicons name="arrow-undo-outline" size={15} color={t.textMuted} />
            <Text style={{ fontSize: 12, fontWeight: "700", color: t.textMuted }}>Undo</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={!entry.complete || submitting}
            style={[
              st.btn,
              {
                borderColor: t.brand(600),
                backgroundColor: entry.complete ? t.brand(600) : "transparent",
                opacity: entry.complete && !submitting ? 1 : 0.5,
              },
            ]}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: entry.complete ? "#fff" : t.brand(600),
                }}
              >
                Submit ({puzzle.max_attempts - puzzle.attempts_used} left)
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {puzzle.finished && (
        <View style={[st.outcome, { borderColor: puzzle.solved ? t.brand(600) : t.border }]}>
          <Text style={{ fontSize: 13, fontWeight: "800", color: puzzle.solved ? t.brand(600) : t.text }}>
            {puzzle.solved ? "Solved" : "Out of guesses"}
          </Text>
          {puzzle.solution && (
            <Text style={{ fontSize: 12, fontFamily: "monospace", color: t.textMuted, marginTop: 4 }}>
              {puzzle.solution.join("  ")}
            </Text>
          )}
        </View>
      )}

      <Legend />
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
        subtitle={current ? new Date(current.date).toDateString() : "Guess the moves"}
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
                    {p.solved ? " ✓" : ""}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
          <PuzzleBoard puzzle={current} onSolved={replace} />
        </ScrollView>
      )}
    </Screen>
  );
}

const st = StyleSheet.create({
  prompt: { borderWidth: 1, borderRadius: 12, padding: 12 },
  tile: {
    height: 30,
    borderWidth: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  outcome: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  legend: { gap: 4, marginTop: 4 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 8 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3 },
  dayRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: 14 },
  dayChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
});
