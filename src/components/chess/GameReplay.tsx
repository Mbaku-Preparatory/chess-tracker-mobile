import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Chess } from "chess.js";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { formatScore, pvToSan, useEngine, type EngineResult } from "@/hooks/useEngine";
import { useAnalysisPrefs } from "@/lib/analysisPrefs";
import { useTheme } from "@/theme/ThemeContext";
import Svg, { Circle, Path } from "react-native-svg";

import { MoveList } from "./MoveList";
import { useAnalysisLine } from "./useAnalysisLine";
import Chessboard, { type ChessboardRef } from "react-native-chessboard";
import { EvalBar } from "@/components/ui/EvalBar";

export interface ParsedMove {
  san: string;
  fen: string;
  from: string;
  to: string;
  moveNumber: number;
  color: "w" | "b";
}

export interface ParsedPgn {
  /** The PGN's Result tag, e.g. "1-0". null when absent. */
  result: string | null;
  moves: ParsedMove[];
  players: PgnPlayers;
}

/**
 * One parse per PGN — the move list and the tag roster both come off the same
 * load. `move.after` is the position following the move, so there is no need to
 * replay the game a second time to collect per-ply FENs.
 */
export function parsePgn(pgn: string | null): ParsedPgn {
  if (!pgn) return { moves: [], players: { white: null, black: null }, result: null };
  // Held outside the try: chess.js fills the roster before it walks the moves,
  // so a game that throws on an illegal move still has real names on it.
  const chess = new Chess();
  let loaded = true;
  try {
    chess.loadPgn(pgn);
  } catch {
    loaded = false;
  }
  const moves = loaded
    ? chess.history({ verbose: true }).map((move, i) => ({
        san: move.san,
        fen: move.after,
        from: move.from,
        to: move.to,
        moveNumber: Math.ceil((i + 1) / 2),
        color: move.color,
      }))
    : [];
  const headers = chess.getHeaders();
  return {
    moves,
    players: playersFromHeaders(headers),
    result: headers.Result?.trim() || null,
  };
}

export function parsePgnMoves(pgn: string): ParsedMove[] {
  return parsePgn(pgn).moves;
}

// ── Board name plates ─────────────────────────────────────────────────────────

export interface SidePlayer {
  name: string;
  rating: string | null;
}

/** "1", "0" or "½" per side; null when the game has no recorded result. */
export type SideScores = Record<"white" | "black", string | null>;

const NO_SCORES: SideScores = { white: null, black: null };

/**
 * Each side's score from the PGN's Result tag.
 *
 * The tag is authoritative: it is written from the board's point of view and
 * covers both sides. A Game record stores its result relative to the player
 * being scouted, so the caller passes that as a fallback instead.
 */
export function scoresFromResultTag(tag: string | null): SideScores | null {
  switch (tag) {
    case "1-0":
      return { white: "1", black: "0" };
    case "0-1":
      return { white: "0", black: "1" };
    case "1/2-1/2":
      return { white: "½", black: "½" };
    default:
      return null;
  }
}

export interface PgnPlayers {
  white: SidePlayer | null;
  black: SidePlayer | null;
}

/**
 * Both players, read from the PGN's tag roster. This is the only source that
 * names *both* sides — a `Game` record only stores the opponent. Null per side
 * when the import carried no usable tag, leaving the caller's fallback to fill
 * in; PGN writers use "?" for an unknown tag, which is worse than no tag.
 */
function playersFromHeaders(headers: Record<string, string>): PgnPlayers {
  const read = (prefix: "White" | "Black"): SidePlayer | null => {
    const name = headers[prefix]?.trim();
    if (!name || name === "?") return null;
    const elo = headers[`${prefix}Elo`]?.trim();
    return { name, rating: elo && elo !== "?" ? elo : null };
  };
  return { white: read("White"), black: read("Black") };
}

/** One name plate, width-matched to the board so long names truncate. */
function PlayerPlate({ player, color, width, score }: { player: SidePlayer; color: "white" | "black"; width: number; score?: string | null }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, width }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          borderWidth: StyleSheet.hairlineWidth,
          backgroundColor: color === "white" ? "#ffffff" : "#1f2937",
          borderColor: color === "white" ? "#d1d5db" : "#4b5563",
        }}
      />
      {/* No flex:1 on the name — that would push the score out to the right
          edge with the rating. The name takes what it needs and truncates,
          the score sits against it, and marginLeft:"auto" on the rating is
          what holds the right edge. */}
      <Text numberOfLines={1} style={{ flexShrink: 1, fontSize: 13, fontWeight: "700", color: t.text }}>
        {player.name}
      </Text>
      {score ? (
        <Text style={{ fontSize: 13, fontWeight: "800", color: t.text }}>({score})</Text>
      ) : null}
      {player.rating ? (
        <Text style={{ marginLeft: "auto", fontSize: 11, color: t.textMuted }}>{player.rating}</Text>
      ) : null}
    </View>
  );
}

function NavBtn({ icon, disabled, onPress, color }: { icon: keyof typeof Ionicons.glyphMap; disabled: boolean; onPress: () => void; color: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} style={[st.navBtn, { borderColor: t.border, opacity: disabled ? 0.3 : 1 }]}>
      <Ionicons name={icon} size={17} color={color} />
    </Pressable>
  );
}

/** The engine switch and Lichess's best lines. */
function EnginePanel({ engine, fen }: { engine: EngineResult; fen: string }) {
  const t = useTheme();
  const [prefs, setPrefs] = useAnalysisPrefs();
  return (
    <View style={[st.enginePanel, { backgroundColor: t.surface, borderColor: t.border }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Switch
          value={prefs.engine}
          onValueChange={(engineOn) => setPrefs({ engine: engineOn })}
          trackColor={{ true: t.brand(600), false: t.border }}
          accessibilityLabel="Engine"
        />
        <Text style={{ fontSize: 14, fontWeight: "700", color: t.text }}>Engine</Text>
      </View>
      {prefs.engine ? (
        <View style={{ gap: 6, marginTop: 8 }}>
          {engine.isAnalyzing && <ActivityIndicator size="small" color={t.textMuted} style={{ alignSelf: "flex-start" }} />}
          {engine.lines.map((line, i) => {
            const whiteBetter = (line.mate ?? line.score ?? 0) >= 0;
            return (
              <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[st.scorePill, { backgroundColor: whiteBetter ? "#ffffff" : "#262626", borderColor: t.border }]}>
                  <Text style={{ fontSize: 11, fontWeight: "800", fontFamily: "monospace", color: whiteBetter ? "#171717" : "#ffffff" }}>
                    {formatScore(line.score, line.mate)}
                  </Text>
                </View>
                <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontFamily: "monospace", color: t.textMuted }}>
                  {pvToSan(fen, line.pv)}
                </Text>
              </View>
            );
          })}
          {!engine.isAnalyzing && engine.lines.length === 0 && (
            <Text style={{ fontSize: 12, color: t.textFaint }}>Lichess has no evaluation for this position.</Text>
          )}
          {engine.source === "lichess" && (
            <Text style={{ fontSize: 11, color: t.textFaint }}>Depth {engine.depth} · Lichess cloud</Text>
          )}
        </View>
      ) : (
        <Text style={{ fontSize: 12, color: t.textFaint, marginTop: 6 }}>
          Off. Turn it on for the evaluation and best lines, from Lichess&apos;s cloud analysis.
        </Text>
      )}
    </View>
  );
}

/**
 * A game on its own screen: the board, the engine (off until switched on), the
 * moves and ways out to Chess.com, Lichess or a PGN file. A stack screen, not
 * a modal, so Android's back button and iOS's swipe-back leave it.
 */
export function GameReplay({
  pgn,
  loading,
  error,
  orientation = "white",
  header,
  filename,
  players,
  scores,
}: {
  pgn: string | null;
  loading?: boolean;
  error?: string | null;
  orientation?: "white" | "black";
  header: React.ReactNode;
  filename: string;
  /** Used only for sides the PGN itself does not name. */
  players?: { white?: SidePlayer; black?: SidePlayer };
  /** Fallback scores, used only when the PGN carries no Result tag. */
  scores?: SideScores;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [analysisLoading, setAnalysisLoading] = useState<"lichess" | null>(null);
  const boardRef = useRef<ChessboardRef>(null);

  const { moves: gameMoves, players: named, result: resultTag } = useMemo(() => parsePgn(pgn), [pgn]);

  // The game is never edited. Playing a move that leaves it opens a branch,
  // and the line below reads the game up to that point followed by the branch.
  const line = useAnalysisLine(gameMoves);
  const { moves, index: currentIndex, fen: currentFen, goTo } = line;

  const [prefs] = useAnalysisPrefs();
  const engine = useEngine(currentFen, prefs.engine && !loading);
  const bestLine = engine.lines[0] ?? null;

  // The board keeps its own position — its `fen` prop is only a starting one —
  // so ours has to be pushed in whenever it changes. Two things make that
  // bearable rather than ugly: `lastMove` gives the yellow highlight natively,
  // and `slide` animates a piece from one square to another, so stepping
  // through a game still moves rather than cutting.
  //
  // A move made *on* the board must not be pushed back at it. The board is
  // already showing it, and resetting there would interrupt the animation of
  // the move just played. The flag is set in onMove and consumed by the effect.
  const cameFromBoard = useRef(false);
  const previousIndex = useRef(currentIndex);

  useEffect(() => {
    const step = currentIndex - previousIndex.current;
    previousIndex.current = currentIndex;

    if (cameFromBoard.current) {
      cameFromBoard.current = false;
      return;
    }

    const move = currentIndex >= 0 ? moves[currentIndex] : null;
    const lastMove = move ? { from: move.from as never, to: move.to as never } : null;
    boardRef.current?.resetBoard(currentFen, {
      // Only a single step forward is a move to animate. A jump to the start,
      // the end, or a tapped move in the list is not a piece travelling — it
      // is a different position, and sliding to it would be a lie about what
      // happened.
      slide: step === 1 && move ? { from: move.from as never, to: move.to as never } : undefined,
      lastMove,
    });
  }, [currentFen, currentIndex, moves]);

  async function handleDownload() {
    if (!pgn) return;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, pgn, { encoding: "utf8" });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: "application/x-chess-pgn", dialogTitle: filename });
    }
  }

  async function handleAnalysis(platform: "chesscom" | "lichess") {
    if (!pgn) return;
    if (platform === "chesscom") {
      Linking.openURL(`https://www.chess.com/analysis?pgn=${encodeURIComponent(pgn)}`);
      return;
    }
    setAnalysisLoading("lichess");
    try {
      const data = await api.lichessImportProxy(pgn);
      Linking.openURL(data.url);
    } catch {
      // silent — user can retry
    } finally {
      setAnalysisLoading(null);
    }
  }

  function handleShare() {
    if (!pgn) return;
    Share.share({ message: pgn, title: filename });
  }

  // Read reactively so the board resizes on rotation and on foldables, rather
  // than freezing at whatever the width happened to be on first render.
  const { width: windowWidth } = useWindowDimensions();
  // The full width of the screen. It used to leave 100px for a vertical eval
  // bar beside it and cap at 320, which on a modern phone wasted a third of
  // the screen on a game viewer whose whole point is the board. The eval bar
  // now sits under it, so nothing is competing for the width, and the board is
  // square — the height follows.
  const boardSize = windowWidth;

  // Plates are placed by seat, not by colour: whoever is at the bottom of the
  // board gets the bottom plate, which flips with the orientation.
  // PGN tag first, caller's fallback second — the tag covers both sides.
  const sideScores = scoresFromResultTag(resultTag) ?? scores ?? NO_SCORES;
  const white = named.white ?? players?.white ?? { name: "White", rating: null };
  const black = named.black ?? players?.black ?? { name: "Black", rating: null };
  const bottom = orientation === "white" ? white : black;
  const top = orientation === "white" ? black : white;

  return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={[st.header, { borderColor: t.border, paddingTop: insets.top + 8 }]}>
          <View style={{ flex: 1 }}>{header}</View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
          <View style={[st.boardArea, { backgroundColor: t.elevated }]}>
            <View style={{ gap: 6, width: boardSize }}>
              {/* Plates are inset while the board is not: the board reaching
                  both edges is the point, but a name touching the screen edge
                  reads as a rendering fault. */}
              <View style={{ paddingHorizontal: 12 }}>
                <PlayerPlate
                  player={top}
                  color={orientation === "white" ? "black" : "white"}
                  width={boardSize - 24}
                  score={sideScores[orientation === "white" ? "black" : "white"]}
                />
              </View>
              {loading ? (
                <View style={{ width: boardSize, height: boardSize, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator color={t.brand(600)} />
                </View>
              ) : (
                <Chessboard
                  ref={boardRef}
                  fen={currentFen}
                  flipped={orientation === "black"}
                  boardSize={boardSize}
                  withLetters={false}
                  withNumbers={false}
                  colors={{ black: "#4a7c59", white: "#f0d9b5" }}
                  onMove={({ move }) => {
                    if (!move) return;
                    // Ours is the record; the board has already drawn it.
                    cameFromBoard.current = true;
                    line.play(move.from, move.to);
                  }}
                />
              )}
              <View style={{ paddingHorizontal: 12 }}>
                <PlayerPlate
                  player={bottom}
                  color={orientation}
                  width={boardSize - 24}
                  score={sideScores[orientation]}
                />
              </View>
              {/* Under the board and both names, so it reads as a summary of
                  the position rather than as part of either player's plate. */}
              {prefs.engine && (
                <View style={{ paddingHorizontal: 12, paddingTop: 2 }}>
                  <EvalBar
                    orientation="horizontal"
                    score={bestLine?.score ?? null}
                    mate={bestLine?.mate ?? null}
                    depth={engine.depth}
                    isAnalyzing={engine.isAnalyzing}
                    source={engine.source}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <EnginePanel engine={engine} fen={currentFen} />
          </View>

          <View style={st.moveListWrap}>
            {error && <Text style={{ color: t.danger, fontSize: 13, textAlign: "center" }}>{error}</Text>}
            {!loading && !error && moves.length === 0 && (
              <Text style={{ color: t.textFaint, fontSize: 13, textAlign: "center" }}>No moves available</Text>
            )}
            {!loading && moves.length > 0 && (
              <ScrollView style={st.moveListScroll} nestedScrollEnabled>
                <MoveList mainMoves={gameMoves} line={line} />
              </ScrollView>
            )}
          </View>

        </ScrollView>

        {/* Outside the ScrollView: these are the things you reach for while
          reading a game — sending it to an engine, saving it, passing it on —
          and scrolling to the end of a long game to find them made them feel
          like a footnote. Pinned above the move controls, which were already
          fixed for the same reason. */}
        {pgn && (
          <View style={[st.actionsRow, { borderColor: t.border }]}>
            <Pressable onPress={handleDownload} accessibilityLabel="Download PGN" style={[st.actionIconBtn, { borderColor: t.border }]}>
              <Ionicons name="download-outline" size={15} color={t.textMuted} />
            </Pressable>
            {/* Each site's own mark, as on the web: a phone row has no room for
                four labels. Lichess licenses its logo for referring to
                lichess.org, which this button does. */}
            <Pressable onPress={() => handleAnalysis("chesscom")} accessibilityLabel="Open in Chess.com" style={[st.actionIconBtn, { borderColor: t.border }]}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Circle cx={12} cy={5.5} r={3.5} fill="#81b64c" />
                <Path fill="#81b64c" d="M9.2 9.5h5.6l-.9 4.2c1.9.9 3.3 2.6 3.6 4.6H6.5c.3-2 1.7-3.7 3.6-4.6zM5.5 19.5h13a1.5 1.5 0 010 3h-13a1.5 1.5 0 010-3z" />
              </Svg>
            </Pressable>
            <Pressable onPress={() => handleAnalysis("lichess")} disabled={analysisLoading === "lichess"} accessibilityLabel="Open in Lichess" style={[st.actionIconBtn, { borderColor: t.border }]}>
              {analysisLoading === "lichess" ? (
                <ActivityIndicator size="small" color={t.textMuted} />
              ) : (
                <Svg width={16} height={16} viewBox="0 0 50 50">
                  <Path fill={t.text} stroke={t.text} strokeLinejoin="round" d="M38.956.5c-3.53.418-6.452.902-9.286 2.984C5.534 1.786-.692 18.533.68 29.364 3.493 50.214 31.918 55.785 41.329 41.7c-7.444 7.696-19.276 8.752-28.323 3.084S-.506 27.392 4.683 17.567C9.873 7.742 18.996 4.535 29.03 6.405c2.43-1.418 5.225-3.22 7.655-3.187l-1.694 4.86 12.752 21.37c-.439 5.654-5.459 6.112-5.459 6.112-.574-1.47-1.634-2.942-4.842-6.036-3.207-3.094-17.465-10.177-15.788-16.207-2.001 6.967 10.311 14.152 14.04 17.663 3.73 3.51 5.426 6.04 5.795 6.756 0 0 9.392-2.504 7.838-8.927L37.4 7.171z" />
                </Svg>
              )}
            </Pressable>
            {/* share-social, not share: the three linked nodes are the glyph
                people read as "share", where Ionicons' "share" is a box with
                an arrow that reads as "open elsewhere". No label — the icon
                carries it, and the row is tight with four controls. */}
            <Pressable onPress={handleShare} accessibilityLabel="Share" style={[st.actionIconBtn, { borderColor: t.border }]}>
              <Ionicons name="share-social-outline" size={15} color={t.textMuted} />
            </Pressable>
          </View>
        )}
        <View style={[st.navRow, { borderColor: t.border, paddingBottom: 12 + insets.bottom }]}>
          <NavBtn icon="play-skip-back" disabled={currentIndex === -1} onPress={() => goTo(-1)} color={t.textMuted} />
          <NavBtn icon="chevron-back" disabled={currentIndex === -1} onPress={() => goTo(currentIndex - 1)} color={t.textMuted} />
          <Text style={{ minWidth: 60, textAlign: "center", fontSize: 12, color: t.textMuted }}>
            {currentIndex === -1 ? "Start" : `${moves[currentIndex]?.moveNumber ?? ""}${moves[currentIndex]?.color === "w" ? "." : "…"}`}
          </Text>
          <NavBtn icon="chevron-forward" disabled={currentIndex === moves.length - 1} onPress={() => goTo(currentIndex + 1)} color={t.textMuted} />
          <NavBtn icon="play-skip-forward" disabled={currentIndex === moves.length - 1} onPress={() => goTo(moves.length - 1)} color={t.textMuted} />
        </View>
      </View>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingBottom: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  enginePanel: { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, padding: 12 },
  scorePill: { minWidth: 54, alignItems: "center", borderRadius: 5, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 5, paddingVertical: 2 },
  boardArea: { alignItems: "center", paddingVertical: 16 },
  moveListWrap: { padding: 16 },
  moveListScroll: { maxHeight: 260 },
  // Centred, not right-aligned: it sits directly above the move controls now,
  // and two pinned bars disagreeing about their alignment reads as a mistake.
  actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: "center" },
  actionIconBtn: { height: 36, width: 44, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  navBtn: { height: 36, width: 36, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
