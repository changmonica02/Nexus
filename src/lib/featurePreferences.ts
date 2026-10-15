export type FeatureFilter =
  | "all"
  | "notes"
  | "documents"
  | "presentations"
  | "study"
  | "calendar"
  | "quicknotes"
  | "creative"
  | "novels"
  | "web"
  | "counter"
  | "draw"
  | "score"
  | "tools"
  | "dictionary";

export type FeatureOrderMode = "recent" | "default" | "custom";

export const DEFAULT_FEATURE_ITEMS: { id: FeatureFilter; label: string }[] = [
  { id: "notes", label: "筆記" },
  { id: "documents", label: "文檔" },
  { id: "presentations", label: "簡報" },
  { id: "study", label: "字卡" },
  { id: "quicknotes", label: "隨手記" },
  { id: "creative", label: "創作" },
  { id: "novels", label: "小說" },
  { id: "web", label: "網頁" },
  { id: "score", label: "製譜" },
  { id: "tools", label: "工具" },
  { id: "dictionary", label: "字典" },
];

export function getStoredFeatureOrderMode(): FeatureOrderMode {
  if (typeof window === "undefined") return "recent";
  try {
    const mode = window.localStorage.getItem("nexus-feature-order-mode");
    if (mode === "default" || mode === "recent" || mode === "custom") return mode;
  } catch {}
  return "recent";
}

export function setStoredFeatureOrderMode(mode: FeatureOrderMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("nexus-feature-order-mode", mode);
    window.dispatchEvent(new Event("nexus-feature-order-changed"));
  } catch {}
}

export function getStoredRecentFeatureIds(): FeatureFilter[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem("nexus-recent-features");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return [...new Set(parsed.filter((id): id is FeatureFilter => typeof id === "string").map(id=>TOOL_FEATURES.includes(id)?"tools" as const:id))];
    }
  } catch {}
  return [];
}

export function recordFeatureUsage(id: FeatureFilter): void {
  if (typeof window === "undefined" || id === "all" || id === "calendar") return;
  try {
    if(TOOL_FEATURES.includes(id))id="tools";
    const prev = getStoredRecentFeatureIds();
    const next = [id, ...prev.filter((item) => item !== id)].slice(0, 20);
    window.localStorage.setItem("nexus-recent-features", JSON.stringify(next));
  } catch {}
}

export function getStoredCustomFeatureOrder(): FeatureFilter[] {
  if (typeof window === "undefined") return DEFAULT_FEATURE_ITEMS.map((item) => item.id);
  try {
    const raw = window.localStorage.getItem("nexus-custom-feature-order");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const migrated = [...new Set(parsed.map((id: string) => TOOL_FEATURES.includes(id as FeatureFilter) ? "tools" : id))];
        const set = new Set(migrated);
        const valid = migrated.filter((id): id is FeatureFilter =>
          DEFAULT_FEATURE_ITEMS.some((item) => item.id === id)
        );
        DEFAULT_FEATURE_ITEMS.forEach((item) => {
          if (!set.has(item.id)) valid.push(item.id);
        });
        return valid;
      }
    }
  } catch {}
  return DEFAULT_FEATURE_ITEMS.map((item) => item.id);
}

export function setStoredCustomFeatureOrder(order: FeatureFilter[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem("nexus-custom-feature-order", JSON.stringify(order));
    window.dispatchEvent(new Event("nexus-feature-order-changed"));
  } catch {}
}


/** Navigation only: tools keep their existing direct destinations. */
export const TOOL_FEATURES: readonly FeatureFilter[]=["counter","draw"];

/** A separate key: filtering the drawer never changes the home launcher or ordering. */
export function getHiddenFeatures(): FeatureFilter[] {
  if(typeof window==='undefined')return [];
  try { const ids=JSON.parse(localStorage.getItem('nexus-hidden-features')??'[]');return Array.isArray(ids)?ids.filter(id=>DEFAULT_FEATURE_ITEMS.some(item=>item.id===id)):[]; } catch {return [];}
}
export function setHiddenFeatures(ids:FeatureFilter[]) {
  try {localStorage.setItem('nexus-hidden-features',JSON.stringify(ids));window.dispatchEvent(new Event('nexus-feature-order-changed'));} catch { /* Keep existing preferences if storage is unavailable. */ }
}
