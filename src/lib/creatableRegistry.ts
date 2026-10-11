import type { PageKind, PageFormat } from "./types";

export interface CreatableDefinition {
  kind: PageKind;
  icon: string;
  label: string;
  labelZh: string;
  desc: string;
  descZh: string;
  defaultFormat: PageFormat;
  defaultFolder?: string | null;
  isCreatableFromSidebar: boolean;
  isProject: boolean; // 是否屬於項目（文檔、簡報、筆記、學習集）
}

export const CREATABLE_REGISTRY: Record<PageKind, CreatableDefinition> = {
  score: { kind:"score",icon:"♫",label:"Score",labelZh:"樂譜",desc:"Music score",descZh:"簡譜、五線譜與吉他共用樂曲",defaultFormat:"flow",isCreatableFromSidebar:true,isProject:true },
  novel_chapter: {
    kind: "novel_chapter", icon: "📖", label: "Novel chapter", labelZh: "小說章節",
    desc: "Chapter within a novel", descZh: "小說作品的獨立章節", defaultFormat: "flow",
    isCreatableFromSidebar: false, isProject: false,
  },
  note: {
    kind: "note",
    icon: "📝",
    label: "Note",
    labelZh: "筆記",
    desc: "Rich formatting",
    descZh: "豐富格式：字型、字級、顏色",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  document: {
    kind: "document",
    icon: "📄",
    label: "Document",
    labelZh: "文檔",
    desc: "Plain text-focused",
    descZh: "純文字為主，類似記事本",
    defaultFormat: "a4",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  study_set: {
    kind: "study_set",
    icon: "🗂️",
    label: "Study Set",
    labelZh: "學習集",
    desc: "Flashcards",
    descZh: "練習用字卡",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  presentation: {
    kind: "presentation",
    icon: "📊",
    label: "Presentation",
    labelZh: "簡報",
    desc: "Slides: charts, layout, timeline",
    descZh: "投影片：圖表、版面、時間軸",
    defaultFormat: "16:9",
    defaultFolder: null,
    isCreatableFromSidebar: true,
    isProject: true,
  },
  quick_note: {
    kind: "quick_note",
    icon: "📝",
    label: "Quick Note",
    labelZh: "隨手記",
    desc: "Google Keep style",
    descZh: "類似 Google 記事本，獨立於項目",
    defaultFormat: "flow",
    defaultFolder: "QuickNotes",
    isCreatableFromSidebar: false, // created via quick input, not via + menu? but we allow via + as well for now
    isProject: false,
  },
  todo: {
    kind: "todo",
    icon: "✅",
    label: "To-Do",
    labelZh: "待辦",
    desc: "Tasks with calendar",
    descZh: "日曆待辦，獨立於項目",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: false,
    isProject: false,
  },
  creative: {
    kind: "creative",
    icon: "✍️",
    label: "Creative",
    labelZh: "創作",
    desc: "Novel, character sheets",
    descZh: "小說閱讀格式、角色簡介表等",
    defaultFormat: "flow",
    defaultFolder: null,
    isCreatableFromSidebar: false,
    isProject: false,
  },
  web: { kind: "web", icon: "⌘", label: "Web", labelZh: "網頁", desc: "Link page", descZh: "個人連結與公開頁面", defaultFormat: "flow", isCreatableFromSidebar: false, isProject: false },
  counter: { kind: "counter", icon: "＋", label: "Counter", labelZh: "計數", desc: "Groups and totals", descZh: "群組、子項目與自動加總", defaultFormat: "flow", isCreatableFromSidebar: false, isProject: false },
  draw: { kind: "draw", icon: "⤨", label: "Draw", labelZh: "抽選", desc: "Tagged random picker", descZh: "含標籤的隨機抽選資料庫", defaultFormat: "flow", isCreatableFromSidebar: false, isProject: false },
};

export function isProjectKind(kind?: PageKind): boolean {
  if (!kind) return true; // legacy note considered project
  return CREATABLE_REGISTRY[kind]?.isProject ?? false;
}

export function getCreatable(kind: PageKind): CreatableDefinition {
  return CREATABLE_REGISTRY[kind];
}

export function getProjectKinds(): PageKind[] {
  return (Object.keys(CREATABLE_REGISTRY) as PageKind[]).filter((k) => CREATABLE_REGISTRY[k].isProject);
}

export function getAllCreatableKinds(): PageKind[] {
  return Object.keys(CREATABLE_REGISTRY) as PageKind[];
}
