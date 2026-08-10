import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { api } from "@/lib/api";
import { navigationRef } from "@/navigation/navigationRef";
import { useAppSelector } from "@/redux/hooks";
import { useTheme } from "@/theme/ThemeContext";
import type { ActiveImportJob } from "@/types";

const CR_COLOR = "#1a3a6b";
const POLL_INTERVAL_MS = 3000;
const PAWN_CELLS = 8;

/**
 * "An import is running" pill, floating above whatever screen you are on.
 *
 * Without it, telling someone the import survives closing the app is hollow —
 * they take you up on it, come back, and there is no sign of it anywhere
 * except the one screen they started from.
 *
 * Polls a single endpoint covering every unfinished job, so the cost is one
 * request every few seconds no matter how many imports are in flight.
 *
 * Uses navigationRef rather than navigation hooks. This renders as a sibling of
 * NavigationContainer, and useNavigation/useNavigationState require being
 * inside a *navigator* — being inside the container is not enough, and calling
 * them here throws "Couldn't get the navigation state" on first render, which
 * crashes the app at launch.
 */
export function ActiveImportsIndicator() {
  const t = useTheme();
  const token = useAppSelector((s) => s.auth.token);

  const [jobs, setJobs] = useState<ActiveImportJob[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  // The import screen already shows the full picture; a pill on top of it is
  // just a second, smaller copy of the same numbers.
  const [routeName, setRouteName] = useState<string | undefined>();
  useEffect(() => {
    const sync = () =>
      setRouteName(navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined);
    sync();
    return navigationRef.addListener("state", sync);
  }, []);
  const onImportScreen = routeName === "PlayerImport";

  const poll = useCallback(async () => {
    try {
      const { results } = await api.activeImportJobs();
      if (!stoppedRef.current) setJobs(results);
    } catch {
      // Offline, signed out, backend down — none of it is worth interrupting
      // anyone over. Keep the last known state and try again.
    }
  }, []);

  useEffect(() => {
    if (!token) {
      setJobs([]);
      return;
    }
    stoppedRef.current = false;

    const schedule = (delay: number) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await poll();
        if (!stoppedRef.current) schedule(POLL_INTERVAL_MS);
      }, delay);
    };

    void poll();
    schedule(POLL_INTERVAL_MS);

    // Polling a backgrounded app is wasted battery, and someone returning to it
    // wants current numbers now rather than in three seconds.
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") schedule(0);
      else if (timerRef.current) clearTimeout(timerRef.current);
    });

    return () => {
      stoppedRef.current = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [token, poll]);

  if (jobs.length === 0 || onImportScreen) return null;

  const completed = jobs.reduce((sum, j) => sum + j.completed, 0);
  const total = jobs.reduce((sum, j) => sum + j.total, 0);
  const games = jobs.reduce((sum, j) => sum + j.games_imported, 0);
  const filled = total === 0 ? 0 : Math.floor((completed / total) * PAWN_CELLS);

  const single = jobs.length === 1 ? jobs[0] : null;
  const label = single ? single.player_name : `${jobs.length} imports`;
  const queued = jobs.every((j) => j.status === "pending");
  const ahead = single?.queue_ahead ?? 0;

  return (
    <Pressable
      onPress={() => {
        if (single && navigationRef.isReady()) {
          navigationRef.navigate("PlayerImport", {
            slug: single.player_slug,
            source: "chess_results",
          });
        }
      }}
      style={[st.pill, { backgroundColor: t.surface, borderColor: t.border }]}
    >
      <View style={{ flexDirection: "row", gap: 1 }}>
        {Array.from({ length: PAWN_CELLS }, (_, i) => (
          <Text
            key={i}
            style={{ fontSize: 12, lineHeight: 15, color: CR_COLOR, opacity: i < filled ? 1 : 0.25 }}
          >
            ♟
          </Text>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: "700", color: t.text }} numberOfLines={1}>
          {queued ? "Import queued" : `Importing ${label}`}
        </Text>
        <Text style={{ fontSize: 11, color: t.textMuted }} numberOfLines={1}>
          {queued
            ? ahead > 0
              ? `${ahead} ahead of yours`
              : "starting…"
            : `${completed} of ${total} · ${games} games`}
        </Text>
      </View>
    </Pressable>
  );
}

const st = StyleSheet.create({
  pill: {
    position: "absolute",
    // Clear of the bottom tab bar rather than sitting on top of it.
    bottom: 84,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
});
