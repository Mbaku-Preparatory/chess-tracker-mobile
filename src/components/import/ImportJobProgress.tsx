import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import type { ImportJob } from "@/types";
import { isTerminal } from "./useImportJob";

/**
 * What a queued import looks like while it runs and once it settles.
 *
 * Shared by the Chess.com and Lichess panels, which queue exactly one entry
 * each, so the job and the import are the same thing and the per-entry
 * results array has at most one row.
 */
export function ImportJobProgress({
  job,
  onCancel,
  accent,
  runningLabel,
}: {
  job: ImportJob | null;
  onCancel: () => void;
  accent: string;
  runningLabel: string;
}) {
  const t = useTheme();
  if (!job) return null;

  const entry = job.results?.[0];

  if (!isTerminal(job)) {
    const waiting = job.queue_ahead != null && job.queue_ahead > 0;
    return (
      <View style={[st.box, { borderColor: t.border, backgroundColor: t.elevated }]}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Text style={{ fontSize: 12, color: t.text, flex: 1 }}>
            {waiting
              ? `Waiting behind ${job.queue_ahead} other import${job.queue_ahead !== 1 ? "s" : ""}…`
              : runningLabel}
          </Text>
          <Pressable onPress={onCancel} disabled={job.cancel_requested}>
            <Text style={{ fontSize: 12, color: t.textMuted, opacity: job.cancel_requested ? 0.5 : 1 }}>
              {job.cancel_requested ? "Cancelling…" : "Cancel"}
            </Text>
          </Pressable>
        </View>
        {/* The point of the change: this no longer dies when the app is
            backgrounded or the screen is left. */}
        <Text style={{ fontSize: 11, color: t.textFaint, marginTop: 6 }}>
          This runs on the server — you can leave this screen and come back.
        </Text>
      </View>
    );
  }

  if (job.status === "succeeded") {
    return (
      <View style={{ marginTop: 14 }}>
        <View style={[st.box, { borderColor: accent, backgroundColor: t.elevated }]}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: t.text }}>
            {job.games_imported} game{job.games_imported !== 1 ? "s" : ""} imported
          </Text>
          {entry?.skipped_reason === "no_games" && (
            <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
              No public standard games were found for that account.
            </Text>
          )}
          {entry?.games_skipped ? (
            <Text style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}>
              {entry.games_skipped} already on file, skipped.
            </Text>
          ) : null}
        </View>
      </View>
    );
  }

  if (job.status === "cancelled") {
    return (
      <View style={[st.box, { borderColor: t.border, backgroundColor: t.elevated }]}>
        <Text style={{ fontSize: 12, color: t.textMuted }}>Import cancelled.</Text>
      </View>
    );
  }

  return (
    <View style={[st.box, { borderColor: t.dangerBorder, backgroundColor: t.dangerBg }]}>
      <Text style={{ fontSize: 12, color: t.danger }}>
        {entry?.message || "The import failed. You can try again."}
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  box: { marginTop: 12, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 12 },
});
