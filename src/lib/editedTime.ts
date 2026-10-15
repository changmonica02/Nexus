import { translate, type Language } from "./i18n";
export function localDate(timestamp: number) {
  const date = new Date(timestamp);
  return Number.isFinite(date.getTime())
    ? `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
    : "—";
}
const localDay = (timestamp: number) => {
  const d = new Date(timestamp);
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000;
};
/** Local calendar days define the three-day boundary, independent of DST day length. */
export function formatEditedTime(
  timestamp: number,
  now: number,
  language: Language,
) {
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return "—";
  const elapsed = Math.max(0, now - timestamp),
    days = localDay(now) - localDay(timestamp);
  if (days > 3 || timestamp > now + 60000) return localDate(timestamp);
  if (elapsed < 60000) return translate(language, "time.justNow");
  if (elapsed < 3600000)
    return translate(language, "time.minutesAgo", {
      n: Math.floor(elapsed / 60000),
    });
  if (elapsed < 86400000)
    return translate(language, "time.hoursAgo", {
      n: Math.floor(elapsed / 3600000),
    });
  return translate(language, "time.daysAgo", { n: Math.max(1, days) });
}
