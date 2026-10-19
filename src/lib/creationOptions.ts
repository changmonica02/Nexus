import type { FeatureFilter } from "./featurePreferences";

export type CreateItemType = "score" | "note" | "note_flow" | "note_paged" | "document" | "study_set" | "folder" | "presentation" | "character" | "world" | "novel" | "web" | "counter" | "draw" | "quick_note" | "todo";
export const creationOptions: Record<FeatureFilter, { type: CreateItemType; label: string }[]> = {
  dictionary: [],
  tools: [{type:"counter",label:"新增計數項目"},{type:"draw",label:"新增抽選資料庫"}],
  score: [{type:"score",label:"新樂譜"}],
  all: [{type:"score",label:"樂譜"},{ type: "note", label: "筆記" }, { type: "document", label: "文檔" }, { type: "study_set", label: "字卡集" }, { type: "presentation", label: "簡報" }, { type: "character", label: "角色卡" }, { type: "world", label: "世界觀" }, { type: "novel", label: "小說" }, { type: "web", label: "網頁" }, { type: "counter", label: "計數" }, { type: "draw", label: "抽選" }, { type: "folder", label: "資料夾" }],
  notes: [{ type: "note_flow", label: "筆記" }],
  creative: [{ type: "world", label: "世界觀" }, { type: "character", label: "角色卡" }],
  novels: [{ type: "novel", label: "小說作品" }],
  documents: [{ type: "document", label: "文檔" }],
  presentations: [{ type: "presentation", label: "簡報" }],
  study: [{ type: "study_set", label: "字卡集" }],
  calendar: [{ type: "todo", label: "日曆事項" }],
  quicknotes: [{ type: "quick_note", label: "隨手記" }],
  web: [{ type: "web", label: "網頁" }],
  counter: [{ type: "counter", label: "計數項目" }],
  draw: [{ type: "draw", label: "抽選資料庫" }],
};
