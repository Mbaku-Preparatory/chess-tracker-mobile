import { Chess, type Square } from "chess.js";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Chessboard, { type ChessboardRef } from "react-native-chessboard";

import { PlayerPlate } from "@/components/chess/PlayerPlate";
import { Button } from "@/components/ui/Button";
import { useBotEngine } from "@/hooks/useBotEngine";
import { BOOK_MOVES, BOOK_PLIES, gamesOnLine, type BookMove } from "@/lib/bot/book";
import type { LevelBook } from "@/lib/bot/levelBook";
import { useTheme } from "@/theme/ThemeContext";
import type { BotBookGame } from "@/types";

import { BotSpeech, type SpeechChoice } from "./BotSpeech";

/**
 * Playing the bot of a scouted player: the web's BotGame (components/bot
 * there) for a phone. For its first ten moves it plays the player's own moves
 * from their games, saying so, and offers the others they played; after that
 * Stockfish plays at the chosen strength (useBotEngine, the phone's engine).
 */

type Color = "white" | "black";

/** A book move comes after this pause, so it does not land before the eye
 * has left the piece just moved. */
const BOOK_DELAY_MS = 450;
const START_FEN = new Chess().fen();

interface Played {
  san: string;
  from: string;
  to: string;
  fen: string;
  /** Played by the bot from the player's games. */
  book: boolean;
}

/** The other moves they played where the bot just played one of theirs. */
interface Alternatives {
  /** The bot's move they replace. */
  ply: number;
  /** The one game being followed before that move, to put back. */
  single: string | null;
  moves: BookMove[];
}

const moveLabel = (ply: number, san: string) => `${Math.floor(ply / 2) + 1}${ply % 2 === 0 ? "." : "…"} ${san}`;

const RESULT_VERB = { win: "won", loss: "lost", draw: "drew" } as const;

/** "Kamau, Peter (1850) at the Nairobi Open, 2024" */
function gameLabel(g: BotBookGame): string {
  const y = g.date?.slice(0, 4);
  const year = y && !g.event.includes(y) ? `, ${y}` : "";
  return `${g.opponent || "an unnamed opponent"}${g.opponent_rating ? ` (${g.opponent_rating})` : ""}${g.event ? ` at the ${g.event.replace(/^the /i, "")}` : ""}${year}`;
}

/** "Nf6. I've played it here in 9 of my 14 games." `moves`: the book's moves in that position. */
function bookLine(moves: BookMove[], san: string): string {
  const total = moves.reduce((sum, m) => sum + m.count, 0);
  const count = moves.find((m) => m.san === san)?.count ?? 0;
  return total === 1 ? `${san}. I played it here in my one game.` : `${san}. I've played it here in ${count} of my ${total} games.`;
}

/** " In my games I faced 4… Nf6 (9 games) and 4… d6 (3) here." */
function facedLine(moves: BookMove[], ply: number, single: BotBookGame | null): string {
  if (!moves.length) return "";
  if (single && moves.length === 1) return ` In my game against ${single.opponent || "them"}, I faced ${moveLabel(ply, moves[0].san)} here.`;
  const shown = moves.slice(0, 3).map((m, i) => `${moveLabel(ply, m.san)} (${m.count}${i === 0 ? (m.count === 1 ? " game" : " games") : ""})`);
  const list =
    moves.length > shown.length ? `${shown.join(", ")} and others` : shown.length === 1 ? shown[0] : `${shown.slice(0, -1).join(", ")} and ${shown[shown.length - 1]}`;
  return ` In my games I faced ${list} here.`;
}

function resultOf(chess: Chess, resigned: boolean, botColor: Color, name: string): { text: string; tag: string } | null {
  const botWhite = botColor === "white";
  if (resigned) return { text: "You resigned.", tag: botWhite ? "1-0" : "0-1" };
  if (chess.isCheckmate()) {
    const whiteWon = chess.turn() === "b";
    return { text: whiteWon === botWhite ? `Checkmate. ${name} bot wins.` : "Checkmate. You win.", tag: whiteWon ? "1-0" : "0-1" };
  }
  if (chess.isStalemate()) return { text: "Stalemate. A draw.", tag: "1/2-1/2" };
  if (chess.isThreefoldRepetition()) return { text: "Draw by repetition.", tag: "1/2-1/2" };
  if (chess.isInsufficientMaterial()) return { text: "Draw: neither side can mate.", tag: "1/2-1/2" };
  if (chess.isDraw()) return { text: "Draw by the fifty-move rule.", tag: "1/2-1/2" };
  return null;
}

export function BotGame({
  botName: name,
  botRating,
  youName,
  botColor,
  games,
  book,
  elo,
  botAvatarUrl,
  youAvatarUrl,
  onBoardTouch,
}: {
  botName: string;
  botRating: number | null;
  youName: string;
  botColor: Color;
  /** The player's games in the bot's colour. */
  games: BotBookGame[];
  /** Its book, built from `games` (PlayBotScreen starts it during setup). */
  book: LevelBook;
  elo: number;
  botAvatarUrl: string;
  youAvatarUrl: string;
  /** A finger on the board (true) or off it: the page holds its scroll meanwhile,
   * or a piece dragged down the board would scroll the page instead. */
  onBoardTouch?: (touching: boolean) => void;
}) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const boardSize = Math.min(width - 24, 520);
  const youColor: Color = botColor === "white" ? "black" : "white";

  const engine = useBotEngine();
  const boardRef = useRef<ChessboardRef>(null);

  const [moves, setMoves] = useState<Played[]>([]);
  const [leftBook, setLeftBook] = useState<{ ply: number } | null>(null);
  const [alternatives, setAlternatives] = useState<Alternatives | null>(null);
  const opener = botColor === "white" ? "Let's play. I'll open the way I do in my games." : "Let's play. Your move: I'll answer the way I do in my games.";
  const [speech, setSpeech] = useState(opener);
  const singleRef = useRef<string | null>(null);
  const [resigned, setResigned] = useState(false);
  const [thinking, setThinking] = useState(false);

  // The whole game replayed, so repetition and the fifty-move rule are seen.
  const chess = useMemo(() => {
    const c = new Chess();
    for (const m of moves) c.move(m.san);
    return c;
  }, [moves]);
  const fen = moves.length ? moves[moves.length - 1].fen : START_FEN;
  const result = resultOf(chess, resigned, botColor, name);
  const botToMove = !result && chess.turn() === botColor[0];
  const ply = moves.length;
  const sans = moves.map((m) => m.san);

  // The board keeps its own position: ours is pushed in whenever it changes,
  // except for a move made on the board, which it already shows.
  const cameFromBoard = useRef(false);
  const previousPly = useRef(0);
  useEffect(() => {
    const forward = ply === previousPly.current + 1;
    previousPly.current = ply;
    if (cameFromBoard.current) {
      cameFromBoard.current = false;
      return;
    }
    const last = moves[moves.length - 1];
    const lastMove = last ? { from: last.from as Square, to: last.to as Square } : null;
    boardRef.current?.resetBoard(fen, { slide: forward && lastMove ? lastMove : undefined, lastMove });
  }, [fen, ply, moves]);

  /** Plays `san` as move `at`, dropping anything after it. */
  const play = useCallback((at: number, san: string, isBook: boolean) => {
    setMoves((prev) => {
      const before = prev.slice(0, at);
      const c = new Chess(before.length ? before[before.length - 1].fen : START_FEN);
      const m = c.move(san);
      return [...before, { san: m.san, from: m.from, to: m.to, fen: c.fen(), book: isBook }];
    });
  }, []);

  /** One of their moves after `line`, said aloud, with the others they played
   * there offered instead. `swapped`: asked for in place of the one it played. */
  function playBook(line: string[], from: string, san: string, swapped = false) {
    const at = line.length;
    const here = book.moves(from, at);
    const others = here.filter((m) => m.san !== san);
    setAlternatives(others.length ? { ply: at, single: singleRef.current, moves: others } : null);
    const ask = others.length ? " Try another?" : "";
    const on = gamesOnLine(games, [...line, san]);
    if (on.length === 1) {
      const g = on[0];
      const again = singleRef.current === g.public_id;
      singleRef.current = g.public_id;
      setSpeech(
        (again
          ? `${san}, still following my game against ${g.opponent || "them"}.`
          : `${san}. Ah, I've been here once before: against ${gameLabel(g)}. I ${RESULT_VERB[g.result] ?? "played"} that one.`) + ask,
      );
    } else {
      singleRef.current = null;
      setSpeech((at === 0 && !swapped ? "Let's play. " : "") + bookLine(here, san) + ask);
    }
    play(at, san, true);
  }

  // The bot's turn: one of the player's moves while the game is in their
  // games, the engine at the chosen strength after.
  const leftRef = useRef(leftBook);
  leftRef.current = leftBook;
  useEffect(() => {
    if (!botToMove) return;
    let cancelled = false;

    if (!leftRef.current && ply < BOOK_PLIES) {
      const pick = book.pick(fen, ply);
      if (pick) {
        const timer = setTimeout(() => {
          if (!cancelled) playBook(sans, fen, pick.san);
        }, BOOK_DELAY_MS);
        return () => {
          cancelled = true;
          clearTimeout(timer);
        };
      }
      setLeftBook({ ply });
      const on = gamesOnLine(games, sans);
      setSpeech(
        on.length === 1
          ? `My game against ${gameLabel(on[0])} ended here. I ${RESULT_VERB[on[0].result] ?? "played"} that one. From here I play at ${elo}.`
          : `That's where my games run out. From here I play at ${elo}.`,
      );
    } else if (!leftRef.current) {
      setLeftBook({ ply });
      setSpeech(`That's ${BOOK_MOVES} moves of my prep. From here I play at ${elo}.`);
    }

    setThinking(true);
    void engine.bestMove(fen, elo).then((uci) => {
      if (cancelled) return;
      setThinking(false);
      if (!uci) return;
      const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
      play(ply, m.san, false);
    });
    return () => {
      cancelled = true;
      engine.cancel();
      setThinking(false);
    };
    // A turn is a position: the rest is fixed for the game or read from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, botToMove]);

  /** A move made on the board: still in their prep only if one of their games reached it. */
  function onBoardMove(san: string) {
    const here = !leftBook && ply < BOOK_PLIES ? book.moves(fen, ply) : null;
    if (here && !here.some((m) => m.san === san)) {
      setLeftBook({ ply });
      const on = gamesOnLine(games, sans);
      const single = on.length === 1 ? on[0] : null;
      setSpeech(`${moveLabel(ply, san)}? I've never faced that.${facedLine(here, ply, single)} From here I play at ${elo}.`);
    }
    cameFromBoard.current = true;
    play(ply, san, false);
  }

  // Said once, when the game ends.
  const resultText = result?.text ?? null;
  useEffect(() => {
    if (!resultText) return;
    if (resigned) return setSpeech("Thanks for the game. Another one?");
    if (chess.isCheckmate()) return setSpeech(chess.turn() === youColor[0] ? "Checkmate! Good game." : "Checkmate. Well played, you got me.");
    setSpeech("A draw. Good fight.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultText]);

  function newGame() {
    engine.cancel();
    setMoves([]);
    setLeftBook(null);
    setAlternatives(null);
    singleRef.current = null;
    setSpeech(opener);
    setResigned(false);
  }

  // Back to the last position with you to move, and back into their prep if
  // the game left it after that.
  const yourParity = youColor === "white" ? 0 : 1;
  let takeBackTo = ply - 1;
  while (takeBackTo >= 0 && takeBackTo % 2 !== yourParity) takeBackTo -= 1;
  function takeBack() {
    if (takeBackTo < 0) return;
    engine.cancel();
    setMoves((prev) => prev.slice(0, takeBackTo));
    if (leftBook && leftBook.ply >= takeBackTo) setLeftBook(null);
    setAlternatives(null);
    singleRef.current = null;
    setSpeech("Take two. Your move.");
    setResigned(false);
  }

  async function sharePgn() {
    const white = botColor === "white" ? `${name} bot` : youName;
    const black = botColor === "black" ? `${name} bot` : youName;
    const tag = result?.tag ?? "*";
    const today = new Date().toISOString().slice(0, 10);
    const tags = { Event: `Play ${name} bot`, Site: "chesspreparatory.com", Date: today.replace(/-/g, "."), White: white, Black: black, Result: tag, BotElo: String(elo) };
    const text = moves.map((m, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${m.san}` : m.san)).join(" ");
    const pgn = `${Object.entries(tags).map(([k, v]) => `[${k} "${v.replace(/"/g, "'")}"]`).join("\n")}\n\n${text} ${tag}\n`;
    const file = `${FileSystem.cacheDirectory}${`${white}_vs_${black}_${today}`.replace(/[^A-Za-z0-9_.-]+/g, "_")}.pgn`;
    await FileSystem.writeAsStringAsync(file, pgn, { encoding: "utf8" });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file, { mimeType: "application/x-chess-pgn", dialogTitle: "Share the game" });
  }

  // Its other moves, while its own is the last on the board.
  const choices: SpeechChoice[] =
    alternatives && alternatives.ply === ply - 1 && !result
      ? alternatives.moves.map((m) => ({
          san: m.san,
          count: m.count,
          onPick: () => {
            singleRef.current = alternatives.single;
            playBook(sans.slice(0, alternatives.ply), alternatives.ply ? moves[alternatives.ply - 1].fen : START_FEN, m.san, true);
          },
        }))
      : [];

  const status = result
    ? result.text
    : engine.failed
      ? "The engine needs a connection the first time it runs."
      : botToMove
        ? thinking
          ? `${name} bot is thinking…`
          : `${name} bot to move.`
        : "Your move.";

  const plateWidth = boardSize - 8;

  return (
    <View style={{ gap: 12 }}>
      <BotSpeech avatarUrl={botAvatarUrl} text={speech} choices={choices} />

      <View style={{ alignItems: "center", gap: 8 }}>
        <PlayerPlate name={name} rating={botRating} color={botColor} width={plateWidth} tag={`Bot · ${elo}`} avatarUrl={botAvatarUrl} />
        <View
          onTouchStart={() => onBoardTouch?.(true)}
          onTouchEnd={() => onBoardTouch?.(false)}
          onTouchCancel={() => onBoardTouch?.(false)}
        >
        <Chessboard
          ref={boardRef}
          fen={START_FEN}
          flipped={youColor === "black"}
          boardSize={boardSize}
          gestureEnabled={!botToMove && !result}
          withLetters={false}
          withNumbers={false}
          colors={{ black: "#4a7c59", white: "#f0d9b5" }}
          onMove={({ move }) => {
            if (move) onBoardMove(move.san);
          }}
        />
        </View>
        <PlayerPlate name={youName} rating={null} color={youColor} width={plateWidth} avatarUrl={youAvatarUrl} />
      </View>

      <View style={[st.statusRow, { backgroundColor: t.surface, borderColor: t.border }]}>
        <Text style={{ flex: 1, fontSize: 14, fontWeight: "600", color: t.text }} accessibilityLiveRegion="polite">
          {status}
        </Text>
        <View style={[st.pill, { backgroundColor: leftBook ? t.warningBg : t.successBg }]}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: leftBook ? t.warning : t.success }}>
            {leftBook ? `Engine · ${elo}` : `In prep${ply > 0 ? ` · move ${Math.floor((ply - 1) / 2) + 1}` : ""}`}
          </Text>
        </View>
      </View>

      {moves.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
          {moves.map((m, i) => (
            <Text key={i} style={{ fontSize: 13, color: m.book ? t.brand(600) : t.text, fontWeight: i === ply - 1 ? "700" : "400" }}>
              {i % 2 === 0 ? `${i / 2 + 1}. ` : ""}
              {m.san}
            </Text>
          ))}
        </ScrollView>
      )}
      <Text style={{ fontSize: 11, color: t.textFaint }}>Green moves are {name}'s own, from their games.</Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Button title="Take back" size="sm" variant="secondary" disabled={takeBackTo < 0} onPress={takeBack} />
        <Button title="Resign" size="sm" variant="secondary" disabled={!!result || ply === 0} onPress={() => setResigned(true)} />
        <Button title="New game" size="sm" variant="secondary" disabled={ply === 0} onPress={newGame} />
        <Button title="Share PGN" size="sm" variant="secondary" disabled={ply === 0} onPress={() => void sharePgn()} />
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12 },
  pill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
});
