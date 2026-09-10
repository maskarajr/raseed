// Asia/Karachi day math. Pakistan is UTC+5 year-round (no DST), so a fixed
// offset is correct — no timezone database needed for the boundary math.
//
// "Today" everywhere in the app means the local Karachi calendar day, expressed
// as a half-open UTC window [startOfTodayKarachi(), +24h).

const KARACHI_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC+5

// UTC instant of 00:00 PKT for today's Karachi calendar date.
export function startOfTodayKarachi(now: Date = new Date()): Date {
  // Shift into PKT, read the calendar date from the shifted UTC fields, then
  // shift the resulting midnight back to a true UTC instant.
  const shifted = new Date(now.getTime() + KARACHI_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = shifted.getUTCMonth();
  const d = shifted.getUTCDate();
  return new Date(Date.UTC(y, m, d) - KARACHI_OFFSET_MS);
}

// End of the Today window (exclusive): start + 24h.
export function endOfTodayKarachi(now: Date = new Date()): Date {
  return new Date(startOfTodayKarachi(now).getTime() + 24 * 60 * 60 * 1000);
}

// Start of a rolling 7-day "this week" window aligned to Karachi day
// boundaries (today plus the previous 6 Karachi days).
export function startOfWeekKarachi(now: Date = new Date()): Date {
  return new Date(startOfTodayKarachi(now).getTime() - 6 * 24 * 60 * 60 * 1000);
}

// Human date label for the Today header, always rendered in Karachi time.
export function formatTodayKarachi(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Karachi",
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);
}

/** Calendar date in Asia/Karachi as YYYY-MM-DD. */
export function karachiDateKey(d: Date): string {
  const shifted = new Date(d.getTime() + KARACHI_OFFSET_MS);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startDaysAgoKarachi(days: number, now: Date = new Date()): Date {
  return new Date(startOfTodayKarachi(now).getTime() - days * 24 * 60 * 60 * 1000);
}
