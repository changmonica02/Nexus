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
  | "draw";

export type FeatureOrderMode = "recent" | "default" | "custom";

export const DEFAULT_FEATURE_ITEMS: { id: FeatureFilter; icon: string; label: string }[] = [
  { id: "notes", icon: "✎", label: "筆記" },
  { id: "documents", icon: "▱", label: "文檔" },
  { id: "presentations", icon: "▰", label: "簡報" },
  { id: "study", icon: "▤", label: "字卡" },
  { id: "quicknotes", icon: "▧", label: "隨手記" },
  { id: "creative", icon: "✦", label: "創作" },
  { id: "novels", icon: "◫", label: "小說" },
  { id: "web", icon: "⌘", label: "網頁" },
  { id: "counter", icon: "＋", label: "計數" },
  { id: "draw", icon: "⤨", label: "抽選" },
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
      if (Array.isArray(parsed)) return parsed.filter((id): id is FeatureFilter => typeof id === "string");
    }
  } catch {}
  return [];
}

export function recordFeatureUsage(id: FeatureFilter): void {
  if (typeof window === "undefined" || id === "all" || id === "calendar") return;
  try {
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
        const set = new Set(parsed);
        const valid = parsed.filter((id): id is FeatureFilter =>
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

