import type { StudySettings } from "./studyFSRS";
export type ScheduleMethod = "fsrs" | "fixed";
/** Seconds, indexed by Again/Hard/Good/Easy. Independent New and Relearning groups. */
export type FixedIntervals = Record<
  "new" | "relearning" | "review",
  [number, number, number, number]
>;
export interface StudyStyle {
  id: string;
  name: string;
  study_mode: "scheduled" | "endless";
  scheduling_method: ScheduleMethod;
  review_limit: number;
  new_limit: number;
  new_pause_threshold: number;
  review_order: "due" | "retrievability" | "random";
  card_order: "new-first" | "mixed" | "review-first";
  fixed_intervals: FixedIntervals;
}
export const defaultStyleId = (owner: string | null) =>
  `study-style:default:${owner ?? "local"}`;
export function defaultStudyStyle(owner: string | null): StudyStyle {
  return {
    id: defaultStyleId(owner),
    name: "預設字卡樣式",
    study_mode: "scheduled",
    scheduling_method: "fsrs",
    review_limit: 100,
    new_limit: 20,
    new_pause_threshold: 200,
    review_order: "due",
    card_order: "new-first",
    fixed_intervals: {
      new: [60, 600, 86400, 345600],
      relearning: [60, 600, 86400, 345600],
      review: [300, 3600, 259200, 604800],
    },
  };
}
export function validateStudyStyle(style: StudyStyle) {
  if (
    !style ||
    typeof style.id !== "string" ||
    !style.id.startsWith("study-style:") ||
    typeof style.name !== "string" ||
    !style.name.trim() ||
    !["scheduled", "endless"].includes(style.study_mode) ||
    !["fixed", "fsrs"].includes(style.scheduling_method) ||
    !["due", "retrievability", "random"].includes(style.review_order) ||
    !["new-first", "mixed", "review-first"].includes(style.card_order)
  )
    throw Error("Invalid study style");
  for (const [key, min] of [
    ["review_limit", 1],
    ["new_limit", 0],
    ["new_pause_threshold", 1],
  ] as const)
    if (!Number.isInteger(style[key]) || style[key] < min || style[key] > 10000)
      throw Error(`${key}:  ${min}–10000`);
  for (const kind of ["new", "relearning", "review"] as const) {
    const times = style.fixed_intervals?.[kind];
    if (
      !Array.isArray(times) ||
      times.length !== 4 ||
      times.some((s) => !Number.isSafeInteger(s) || s < 1 || s > 315360000)
    )
      throw Error("Fixed intervals must be positive seconds (up to 10 years)");
  }
}
export function styleFromLegacy(settings: StudySettings): StudyStyle {
  const style = {
    ...defaultStudyStyle(settings.owner_id),
    id: `study-style:legacy:${settings.owner_id ?? "local"}:${settings.id}`,
    name: `移轉設定 · ${settings.id}`,
    study_mode: settings.study_mode ?? "scheduled",
    review_limit: settings.review_limit ?? 100,
    new_limit: settings.new_limit,
    new_pause_threshold: settings.new_pause_threshold ?? 200,
    card_order: settings.card_order ?? "new-first",
    review_order: settings.review_order ?? "due",
  };
  validateStudyStyle(style);
  return style;
}
export function hasLegacyOverrides(s: StudySettings) {
  return (
    s.review_limit !== undefined ||
    s.new_limit !== 20 ||
    s.study_mode === "endless" ||
    s.new_pause_threshold !== undefined ||
    s.card_order !== undefined ||
    s.review_order !== undefined
  );
}
export function applyStyle(
  settings: StudySettings,
  style: StudyStyle,
): StudySettings {
  return {
    ...settings,
    ...structuredClone(style),
    id: settings.id,
    owner_id: settings.owner_id,
    style_id: style.id,
    style: structuredClone(style),
  };
}
