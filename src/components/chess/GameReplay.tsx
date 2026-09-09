import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
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
import { useStockfish } from "@/hooks/useStockfish";
import { useTheme } from "@/theme/ThemeContext";
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

export function GameReplay({
  pgn,
  loading,
  error,
  orientation = "white",
  header,
  onClose,
  filename,
  players,
  scores,
}: {
  pgn: string | null;
  loading?: boolean;
  error?: string | null;
  orientation?: "white" | "black";
  header: React.ReactNode;
  onClose: () => void;
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

  const engine = useStockfish(currentFen, !loading && moves.length >= 0);

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
    <Modal visible animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <View style={[st.header, { borderColor: t.border }]}>
          <View style={{ flex: 1 }}>{header}</View>
          <Pressable onPress={onClose} style={st.closeBtn}>
            <Ionicons name="close" size={22} color={t.textMuted} />
          </Pressable>
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
              <View style={{ paddingHorizontal: 12, paddingTop: 2 }}>
                <EvalBar
                  orientation="horizontal"
                  score={engine.score}
                  mate={engine.mate}
                  depth={engine.depth}
                  isAnalyzing={engine.isAnalyzing}
                  source={engine.source}
                />
              </View>
            </View>
          </View>

          <View style={st.moveListWrap}>
            {error && <Text style={{ color: t.danger, fontSize: 13, textAlign: "center" }}>{error}</Text>}
            {!loading && !error && moves.length === 0 && (
              <Text style={{ color: t.textFaint, fontSize: 13, textAlign: "center" }}>No moves available</Text>
            )}
            {!loading && moves.length > 0 && (
              <ScrollView style={st.moveListScroll} nestedScrollEnabled>
                <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 3 }}>
                  {moves.map((mv, idx) => {
                    const branched = line.branchStartsAt !== null && idx >= line.branchStartsAt;
                    const current = idx === currentIndex;
                    return (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center" }}>
                        {/* Where the game stops and your line starts. */}
                        {idx === line.branchStartsAt && (
                          <Text style={{ color: t.brand(600), fontSize: 13, marginHorizontal: 3 }}>(</Text>
                        )}
                        {mv.color === "w" && (
                          <Text style={{ color: t.textFaint, fontSize: 13, marginRight: 2 }}>{mv.moveNumber}.</Text>
                        )}
                        <Pressable
                          onPress={() => goTo(idx)}
                          style={[
                            st.moveChip,
                            current ? { backgroundColor: branched ? t.brand(500) : t.brand(600) } : null,
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "monospace",
                              fontStyle: branched ? "italic" : "normal",
                              color: current ? "#fff" : branched ? t.brand(600) : t.text,
                            }}
                          >
                            {mv.san}
                          </Text>
                        </Pressable>
                        {branched && idx === moves.length - 1 && (
                          <Text style={{ color: t.brand(600), fontSize: 13, marginHorizontal: 3 }}>)</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {line.branch && (
              <Pressable
                onPress={line.clearBranch}
                style={[st.backToGame, { borderColor: t.brand(600) }]}
              >
                <Ionicons name="return-up-back" size={14} color={t.brand(600)} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: t.brand(600) }}>
                  Back to the game
                </Text>
              </Pressable>
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
            <Pressable onPress={handleDownload} style={[st.actionIconBtn, { borderColor: t.border }]}>
              <Ionicons name="download-outline" size={15} color={t.textMuted} />
            </Pressable>
            <Pressable onPress={() => handleAnalysis("chesscom")} style={[st.actionBtn, { borderColor: t.border }]}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted }}>Chess.com</Text>
            </Pressable>
            <Pressable onPress={() => handleAnalysis("lichess")} disabled={analysisLoading === "lichess"} style={[st.actionBtn, { borderColor: t.border }]}>
              {analysisLoading === "lichess" ? (
                <ActivityIndicator size="small" color={t.textMuted} />
              ) : (
                <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted }}>Lichess</Text>
              )}
            </Pressable>
            {/* share-social, not share: the three linked nodes are the glyph
                people read as "share", where Ionicons' "share" is a box with
                an arrow that reads as "open elsewhere". No label — the icon
                carries it, and the row is tight with four controls. */}
            <Pressable onPress={handleShare} style={[st.actionIconBtn, { borderColor: t.border }]}>
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
    </Modal>
  );
}

const st = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", paddingTop: 56, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  closeBtn: { padding: 4 },
  boardArea: { alignItems: "center", paddingVertical: 16 },
  moveListWrap: { padding: 16 },
  backToGame: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderRadius: 999,
  },
  moveListScroll: { maxHeight: 140 },
  moveChip: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4 },
  // Centred, not right-aligned: it sits directly above the move controls now,
  // and two pinned bars disagreeing about their alignment reads as a mistake.
  actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: "center" },
  actionIconBtn: { height: 30, width: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, height: 30 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  navBtn: { height: 36, width: 36, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
