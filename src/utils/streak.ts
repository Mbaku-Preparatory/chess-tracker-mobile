import type { PrepSession } from "@/types";

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Consecutive calendar days (ending today, or yesterday if today has no
 * completion yet) with at least one completed prep session. Computed on
 * the fly from `completed_at` rather than stored, so it's always in sync.
 */
export function computeStreak(sessions: PrepSession[]): number {
  const completedDays = new Set(
    sessions
      .filter((s): s is PrepSession & { completed_at: string } => Boolean(s.completed_at))
      .map((s) => localDayKey(new Date(s.completed_at)))
  );

  const cursor = new Date();
  if (!completedDays.has(localDayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let streak = 0;
  while (completedDays.has(localDayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
