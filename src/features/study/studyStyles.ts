import type { StudySettings } from "./studyFSRS";
export type ScheduleMethod = "fsrs" | "fixed";
/** Seconds, indexed by Again/Hard/Good/Easy. Independent New and Relearning groups. */
export type FixedIntervals = Record<
  "new" | "relearning" | "review",
  [number, number, number, number]
>;
export type IntervalSettings = Record<"general" | "forgotten", [number, number, number]>;
export const defaultIntervalSettings = ():IntervalSettings => ({general:[60,600,604800],forgotten:[60,600,86400]});
export interface StudyStyle {
  interval_version?: 1;
  intervals?: IntervalSettings;
  auto_speech?: boolean;
  speech_rate?: number;
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
    auto_speech: true,
    speech_rate: 0.9,
    study_mode: "scheduled",
    scheduling_method: "fixed",
    interval_version: 1,
    intervals: defaultIntervalSettings(),
    review_limit: 100,
    new_limit: 20,
    new_pause_threshold: 200,
    review_order: "due",
    card_order: "new-first",
    fixed_intervals: {
      new: [60, 600, 604800, 604800],
      relearning: [60, 600, 86400, 86400],
      review: [60, 600, 604800, 604800],
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
  if(style.auto_speech!==undefined&&typeof style.auto_speech!=='boolean')throw Error('Invalid auto speech setting');
  if(style.speech_rate!==undefined&&(!Number.isFinite(style.speech_rate)||style.speech_rate<0.5||style.speech_rate>2))throw Error('Speech rate must be 0.5–2');
  for (const [key, min] of [
    ["review_limit", 1],
    ["new_limit", 0],
    ["new_pause_threshold", 1],
  ] as const)
    if (!Number.isInteger(style[key]) || style[key] < min || style[key] > 10000)
      throw Error(`${key}:  ${min}–10000`);
  if(style.interval_version!==undefined){
    if(style.interval_version!==1)throw Error('Unsupported interval schedule version');
    for(const group of ['general','forgotten'] as const){const values=style.intervals?.[group];if(!Array.isArray(values)||values.length!==3||values.some(s=>!Number.isSafeInteger(s)||s<1||s>315360000))throw Error('Intervals must contain six positive durations');}
  }
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

/** Read-only normalization: old settings remain stored until the user saves this deck. */
export function unifiedStudyStyle(style:StudyStyle):StudyStyle {
 validateStudyStyle(style);
 return {...structuredClone(style),scheduling_method:'fixed',interval_version:1,intervals:structuredClone(style.intervals??defaultIntervalSettings()),review_order:style.review_order==='random'?'random':'due'};
}
