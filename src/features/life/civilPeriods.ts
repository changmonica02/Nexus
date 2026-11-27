export function civilAdvance(date: string, unit: "day" | "week" | "month" | "year", interval: number, anchorDay = Number(date.slice(8, 10))) {
  const start = new Date(date + "T00:00:00Z");
  if (unit === "day" || unit === "week") start.setUTCDate(start.getUTCDate() + interval * (unit === "week" ? 7 : 1));
  else {
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() + interval * (unit === "year" ? 12 : 1));
    const lastDay = new Date(start);
    lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
    start.setUTCDate(Math.min(lastDay.getUTCDate(), anchorDay));
  }
  return start.toISOString().slice(0, 10);
}
