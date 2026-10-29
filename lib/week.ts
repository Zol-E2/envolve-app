/**
 * Calendar-week helpers for the home page's "This week" row. Days are
 * counted in Hungarian time, so a lesson at 23:30 counts for that evening,
 * not for the next day in UTC.
 */
const TIME_ZONE = "Europe/Budapest";

/** "2026-10-29" for the given moment, in Hungarian time */
const localDate = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(date);

/** 0 = Monday … 6 = Sunday, in Hungarian time */
const weekdayIndex = (date: Date) => {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: TIME_ZONE, weekday: "short" }).format(date);
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day);
};

/** The 7 dates (Monday to Sunday) of the current week, and today's position in it */
export const currentWeek = (now = new Date()) => {
  const today = weekdayIndex(now);
  const [y, m, d] = localDate(now).split("-").map(Number);
  const days = Array.from({ length: 7 }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - today + i)).toISOString().slice(0, 10)
  );
  // Start of the earliest possible Monday in any time zone, for the query
  const since = new Date(Date.UTC(y, m - 1, d - today) - 14 * 3600 * 1000);
  return { days, today, since };
};

/** Which days of the week (Monday first) had at least one lesson */
export const activeDays = (timestamps: string[], days: string[]) => {
  const active = new Set(timestamps.map((iso) => localDate(new Date(iso))));
  return days.map((day) => active.has(day));
};
