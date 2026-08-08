function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Parses a "YYYY-MM-DD" date string as a local calendar date (not UTC). */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Parses a "HH:MM:SS" time string into today's Date with that time-of-day (for picker display). */
export function parseLocalTimeAsDate(timeStr: string): Date {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date;
}

export function toDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeString(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export function formatSessionDate(dateStr: string): string {
  return parseLocalDate(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function formatSessionTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(h, m, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export type ScheduleSection = "Overdue" | "Today" | "Upcoming";

export function getSessionSection(dateStr: string): ScheduleSection {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const scheduled = parseLocalDate(dateStr);
  if (scheduled.getTime() < today.getTime()) return "Overdue";
  if (scheduled.getTime() === today.getTime()) return "Today";
  return "Upcoming";
}
