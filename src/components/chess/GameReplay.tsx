import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Chess } from "chess.js";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { api } from "@/lib/api";
import { useStockfish } from "@/hooks/useStockfish";
import { useTheme } from "@/theme/ThemeContext";
import { ChessBoard } from "./ChessBoard";
import { EvalBar } from "@/components/ui/EvalBar";

export interface ParsedMove {
  san: string;
  fen: string;
  from: string;
  to: string;
  moveNumber: number;
  color: "w" | "b";
}

export function parsePgnMoves(pgn: string): ParsedMove[] {
  const chess = new Chess();
  try {
    chess.loadPgn(pgn);
  } catch {
    return [];
  }
  const history = chess.history({ verbose: true });
  const parsed: ParsedMove[] = [];
  const replay = new Chess();
  for (const move of history) {
    replay.move(move.san);
    parsed.push({
      san: move.san,
      fen: replay.fen(),
      from: move.from,
      to: move.to,
      moveNumber: Math.ceil((parsed.length + 1) / 2),
      color: move.color,
    });
  }
  return parsed;
}

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
}: {
  pgn: string | null;
  loading?: boolean;
  error?: string | null;
  orientation?: "white" | "black";
  header: React.ReactNode;
  onClose: () => void;
  filename: string;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [analysisLoading, setAnalysisLoading] = useState<"lichess" | null>(null);

  const moves = useMemo(() => (pgn ? parsePgnMoves(pgn) : []), [pgn]);

  const goTo = useCallback((i: number) => setCurrentIndex(Math.max(-1, Math.min(i, moves.length - 1))), [moves.length]);

  const currentFen = currentIndex === -1 ? START_FEN : moves[currentIndex]?.fen ?? START_FEN;
  const engine = useStockfish(currentFen, !loading && moves.length >= 0);

  const highlights = [];
  if (currentIndex >= 0 && moves[currentIndex]) {
    highlights.push({ square: moves[currentIndex].from, color: "rgba(255,214,10,0.4)" });
    highlights.push({ square: moves[currentIndex].to, color: "rgba(255,214,10,0.55)" });
  }

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

  const boardSize = Math.min(Dimensions.get("window").width - 100, 320);

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
            <EvalBar score={engine.score} mate={engine.mate} depth={engine.depth} isAnalyzing={engine.isAnalyzing} source={engine.source} height={boardSize} />
            {loading ? (
              <View style={{ width: boardSize, height: boardSize, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator color={t.brand(600)} />
              </View>
            ) : (
              <ChessBoard fen={currentFen} orientation={orientation} size={boardSize} highlights={highlights} />
            )}
          </View>

          <View style={st.moveListWrap}>
            {error && <Text style={{ color: t.danger, fontSize: 13, textAlign: "center" }}>{error}</Text>}
            {!loading && !error && moves.length === 0 && (
              <Text style={{ color: t.textFaint, fontSize: 13, textAlign: "center" }}>No moves available</Text>
            )}
            {!loading && moves.length > 0 && (
              <ScrollView style={st.moveListScroll} nestedScrollEnabled>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
                  {moves.map((mv, idx) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "baseline" }}>
                      {mv.color === "w" && (
                        <Text style={{ color: t.textFaint, fontSize: 13, marginRight: 2 }}>{mv.moveNumber}.</Text>
                      )}
                      <Pressable onPress={() => goTo(idx)} style={[st.moveChip, idx === currentIndex ? { backgroundColor: t.brand(600) } : null]}>
                        <Text style={{ fontSize: 13, fontFamily: "monospace", color: idx === currentIndex ? "#fff" : t.text }}>{mv.san}</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

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
              <Pressable onPress={handleShare} style={[st.actionBtn, { borderColor: t.border }]}>
                <Ionicons name="share-outline" size={13} color={t.textMuted} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: t.textMuted }}>Share</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

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
  boardArea: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 20 },
  moveListWrap: { padding: 16 },
  moveListScroll: { maxHeight: 140 },
  moveChip: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 2, marginRight: 4 },
  actionsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, justifyContent: "flex-end" },
  actionIconBtn: { height: 30, width: 30, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, height: 30 },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  navBtn: { height: 36, width: 36, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center" },
});
