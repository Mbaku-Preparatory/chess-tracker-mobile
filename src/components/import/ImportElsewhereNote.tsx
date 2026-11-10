import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import type { ImportJob, ImportSource } from "@/types";

const SOURCE_NAMES: Record<ImportSource, string> = {
  chesscom: "Chess.com",
  lichess: "Lichess",
  chess_results: "chess-results",
};

/**
 * Shown on an import panel when another import for the same player is queued
 * or running (useImportJob's `elsewhere`). Imports run one at a time, so a new
 * one waits its turn; saying so is what stops "nothing is happening" and a
 * second tap. The panel's button reads "Add to queue" meanwhile. Same words as
 * the web.
 */
export function ImportElsewhereNote({ job }: { job: ImportJob }) {
  const t = useTheme();
  const state = job.status === "running" ? "is running" : "is queued";
  return (
    <View style={{ borderWidth: 1, borderColor: "rgba(217,119,6,0.4)", backgroundColor: "rgba(217,119,6,0.08)", borderRadius: 10, padding: 10 }}>
      <Text style={{ fontSize: 12, color: t.text }}>
        A {SOURCE_NAMES[job.source]} import for this player {state}. Imports run one at a time: add this one to
        the queue and it starts by itself when that one finishes.
      </Text>
    </View>
  );
}
