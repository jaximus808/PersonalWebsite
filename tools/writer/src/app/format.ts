// Small display helpers: dates the way the site prints them, reading time,
// and the relative times in the drafts rail.

/** The top bar's pace. (The site's own estimate uses 220; close enough to agree.) */
export const WORDS_PER_MINUTE = 200;

export function readingMinutes(words: number): number {
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

function utcDate(ymd: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const date = new Date(`${ymd}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "2026-03-17" -> "March 17, 2026", exactly like lib/contentText.ts. */
export function formatDate(ymd: string): string {
  const date = utcDate(ymd);
  if (!date) return ymd;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "2026-03-17" -> "March 2026", like the project page's eyebrow. */
export function formatMonthYear(ymd: string): string {
  const date = utcDate(ymd);
  if (!date) return ymd;
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Today as YYYY-MM-DD in the writer's own timezone (a calendar day, not UTC). */
export function todayYmd(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** "12:04" in local time. */
export function formatClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/** "just now", "4 min ago", "3 h ago", "yesterday", "Mar 3", "Mar 3, 2025". */
export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const time = date.getTime();
  if (Number.isNaN(time)) return "";
  const seconds = Math.round((now.getTime() - time) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (time >= startOfToday) return `${hours} h ago`;
  if (time >= startOfToday - 86_400_000) return "yesterday";
  const sameYear = date.getFullYear() === now.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

/** 1536 -> "1.5 KB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}
