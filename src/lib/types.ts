export type ID = string;

export type BlockType =
  | "paragraph"
  | "heading"
  | "bulletList"
  | "orderedList"
  | "taskItem"
  | "blockquote"
  | "codeBlock"
  | "horizontalRule";

export type AttachmentKind = "pdf" | "image" | "file";

export interface Block {
  id: ID;
  type: BlockType;
  text?: string;
}

export interface Attachment {
  id: ID;
  kind: AttachmentKind;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  device_id: ID;
  page_count?: number;
}

export type PageKind = "note" | "document" | "study_set" | "presentation" | "quick_note" | "todo" | "creative";
export type PageFormat = "flow" | "paged" | "a4" | "16:9" | "4:3" | "custom";

/**
 * 筆記的版面模式（2026-08-11 定案）：
 * - "flow"  ：流動筆記（單一編輯器、無限捲動，原樣）
 * - "paged" ：分頁筆記（手動 A4 紙張頁，不自動分頁；建立時選擇，之後不可轉換）
 * 文檔一律流動；簡報維持 16:9 / 4:3。
 * 舊資料（a4 / 16:9 / 4:3 / custom 的筆記與文檔）開啟後以流動顯示並自動遷移。
 */
export function isPagedNoteFormat(format?: PageFormat | null): boolean {
  return format === "paged";
}

/** 頁面邊距（mm），用於 A4/分頁版面（可調整頁邊距） */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const DEFAULT_PAGE_MARGINS: PageMargins = { top: 20, right: 18, bottom: 20, left: 18 };

export interface StudyItem {
  id: ID;
  front: string;
  back: string;
  mastery: "new" | "learning" | "mastered";
  last_reviewed_at: number | null;
  review_count: number;
}

export type SlideLayout = "title" | "title_content" | "two_column" | "chart" | "image" | "toc" | "quote" | "blank" | "canvas";

export type ChartBaseType = "bar" | "line" | "pie" | "donut" | "gantt" | "pyramid" | "radar" | "timeline" | "text-columns" | "text-list" | "text-quote";
export type BarVariant = "single" | "category" | "grouped" | "stacked" | "stacked-percent";
export type ChartOrientation = "vertical" | "horizontal";

export interface ChartData {
  type: ChartBaseType;
  variant?: BarVariant; // for bar charts
  orientation?: ChartOrientation; // vertical / horizontal, one-click toggle
  data: { label: string; value: number; series?: string; start?: number; end?: number }[];
  sortOrder?: "desc" | "asc" | null; // 由高到低排序
  showDataLabels?: boolean; // 資料標籤
  showGrid?: boolean; // 格線
  showTitleNumber?: boolean; // 標題數字
}

export interface PresentationBlock {
  id: ID;
  type: "text" | "chart" | "image" | "diagram" | "shape";
  x: number; // 0-100 %
  y: number; // 0-100 %
  w: number; // 0-100 %
  h: number; // 0-100 % or auto
  z: number;
  rotation?: number;
  text?: string;
  content_json?: object; // for rich text block
  chart?: ChartData;
  diagramCode?: string;
  style?: {
    fontSize?: number;
    color?: string;
    background?: string;
    textAlign?: "left" | "center" | "right";
    bold?: boolean;
  };
}

export interface Slide {
  id: ID;
  layout: SlideLayout;
  title?: string;
  content_json?: object; // legacy Tiptap JSON for this slide's body (for backward compat)
  content_text?: string; // derived text
  chart?: ChartData;
  diagramCode?: string; // Mermaid code
  backgroundColor?: string;
  blocks?: PresentationBlock[]; // new canvas-like blocks for intuitive editing
}

export interface PresentationData {
  theme: "minimal" | "academic" | "business" | "dark";
  slides: Slide[];
  sourcePageId?: ID | null; // which Note it was converted from (weak linkage)
}

export interface Page {
  id: ID;
  title: string;
  content_json: object;
  content_text: string;
  /** @deprecated 已被 kind 取代，僅為向後相容保留，新程式碼不應讀寫此欄位 (C2決策，需徵詢) */
  default_mode: "note";
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
  revision: number;
  device_id: ID;
  tags?: string[];
  folder?: string | null;
  links?: string[];
  attachment_ids?: ID[];
  primary_attachment_id?: ID | null;
  kind?: PageKind;
  study_items?: StudyItem[];
  presentation_data?: PresentationData;
  is_favorite?: boolean;
  format?: PageFormat;
  sort_order?: number;
  parent_id?: ID | null;
  margins?: PageMargins;
  /** Attached expansion notes. They belong to this page and never open as pages. */
  assistant_blocks?: AssistantBlock[];
  // Todo specific
  due_date?: number | null;
  priority?: "low" | "medium" | "high" | null;
  completed?: boolean;
  color?: string | null; // for quick note
  // Creative specific
  creative_type?: "novel" | "character";
  character_data?: CharacterProfileData;
  novel_settings?: NovelSettings;
}

export interface AssistantBlock {
  id: ID;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export type CreativeType = "novel" | "character";

export interface NovelSettings {
  theme?: "parchment" | "cream" | "eye_care" | "dark" | "pure_white";
  fontSize?: number; // 14 ~ 26
  fontFamily?: "serif" | "sans" | "kai";
  lineHeight?: number; // 1.6 ~ 2.4
  paragraphIndent?: boolean; // default true (2em)
  showWordCount?: boolean;
}

export type CharacterComponentType = "key_value" | "rich_text" | "tags" | "stats" | "relations";

export interface CharacterKeyValueItem {
  key: string;
  value: string;
}

export interface CharacterStatItem {
  label: string;
  value: number; // 0 ~ 100
  max?: number;
}

export interface CharacterRelationItem {
  targetName: string;
  relationType: string;
  description: string;
}

export interface CharacterSection {
  id: string;
  type: CharacterComponentType;
  title: string;
  icon?: string;
  keyValues?: CharacterKeyValueItem[];
  richText?: string;
  tags?: string[];
  stats?: CharacterStatItem[];
  relations?: CharacterRelationItem[];
}

export interface CharacterProfileData {
  templateId?: "fantasy" | "modern" | "blank";
  basic: {
    name: string;
    alias?: string;
    avatarUrl?: string;
    gender?: string;
    age?: string;
    role?: string;
    affiliation?: string;
    quote?: string;
  };
  sections: CharacterSection[];
}

export interface PageQuery {
  includeDeleted?: boolean;
  limit?: number;
}

export interface CreatePageInput {
  title?: string;
  tags?: string[];
  folder?: string | null;
  attachment_ids?: ID[];
  primary_attachment_id?: ID | null;
  kind?: PageKind;
  format?: PageFormat;
  margins?: PageMargins;
  sort_order?: number;
  parent_id?: ID | null;
}

export interface WorkspaceBackupAttachmentEntry {
  attachment: Attachment;
  binary_base64: string | null;
}

export interface WorkspaceBackupSettingEntry {
  key: string;
  value: unknown;
}

export interface WorkspaceBackup {
  schema_version: number;
  exported_at: number;
  device_id: ID;
  pages: Page[];
  attachments: WorkspaceBackupAttachmentEntry[];
  settings: WorkspaceBackupSettingEntry[];
}
