import type { StudyBackup } from "../features/study/studyFSRS";
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
  /** Local-only workspace boundary. Cloud ownership is stored in Supabase owner_id. */
  workspace_owner_id?: ID | null;
}

export type PageKind = "score" | "note" | "document" | "study_set" | "presentation" | "quick_note" | "todo" | "creative" | "novel_chapter" | "web" | "counter" | "draw";
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
  /** Daily scheduling is independent of cram practice and quiz results. */
  daily_introduced_at?: number;
  daily_due_at?: number;
  daily_interval_days?: number;
  daily_phase?: "learning" | "review";

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
  official_pack_id?: string | null;
  official_pack_version?: number | null;
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
  creative_type?: "novel" | "character" | "world";
  character_data?: CharacterProfileData;
  novel_settings?: NovelSettings;
  /** Local-only workspace boundary. Cloud ownership is stored in Supabase owner_id. */
  workspace_owner_id?: ID | null;
}

export interface AssistantBlock {
  id: ID;
  title: string;
  content: string;
  created_at: number;
  updated_at: number;
}

export type CreativeType = "novel" | "character" | "world";

/**
 * Early novels were saved before `creative_type` existed. Characters are the
 * only creative pages with character data, so all remaining creative pages
 * belong to the independent Novel entrance.
 */
export function isCreativeCharacterPage(page: Page): boolean {
  return page.kind === "creative" && (page.creative_type === "character" || page.creative_type === "world" || (!page.creative_type && !!page.character_data));
}

export function isNovelPage(page: Page): boolean {
  return page.kind === "creative" && !isCreativeCharacterPage(page);
}

export interface NovelSettings {
  /** Set only by explicit, transactional chapter activation. */
  chaptersEnabled?: boolean;
  /** Independent work overview shown before entering the reader. */
  synopsis?: string;
  /** Image attachment used only as the novel cover. */
  coverAttachmentId?: ID | null;
  theme?: "parchment" | "cream" | "eye_care" | "dark" | "pure_white";
  fontSize?: number; // 14 ~ 26
  fontFamily?: "serif" | "sans" | "kai";
  lineHeight?: number; // 1.6 ~ 2.4
  paragraphIndent?: boolean; // default true (2em)
  showWordCount?: boolean;
}

/** An independent record in the pages store, synced and backed up as a page. */
export interface NovelChapter extends Page {
  kind: "novel_chapter";
  parent_id: ID;
  sort_order: number;
}

export type CharacterComponentType = "group" | "key_value" | "rich_text" | "tags" | "stats" | "rating" | "relations" | "radar" | "palette" | "tendency" | "statistics" | "gallery" | "links" | "music";

export interface CharacterKeyValueItem {
  key: string;
  value: string;
}

export interface CharacterStatItem {
  label: string;
  value: number;
  max?: number;
}

export interface CharacterRatingItem {
  label: string;
  value: number; // 1 ~ 5
}

export interface CharacterRelationItem {
  targetName: string;
  relationType: string;
  description: string;
}
export interface CharacterPaletteItem { label: string; color: string; }
export interface CharacterStatisticItem {
  label: string;
  description: string;
  value?: number;
  count?: number;
  unitWeight?: number;
  unit?: string;
}
export interface CharacterExternalLink { label: string; url: string; }

export interface CharacterSection {
  size?: { span: number; height?: number };
  legacy_id?: string;
  template_node_id?: string;
  id: string;
  type: CharacterComponentType;
  title: string;
  icon?: string;
  /** Mixed content belonging to one user-defined block. */
  contents?: CharacterSection[];
  /** Example text shown as placeholders, never as filled-in data. */
  example?: CharacterSection;
  statisticHeaders?: { label: string; description: string; value: string; unit: string };
  keyValues?: CharacterKeyValueItem[];
  richText?: string;
  tags?: string[];
  stats?: CharacterStatItem[];
  ratings?: CharacterRatingItem[];
  relations?: CharacterRelationItem[];
  palette?: CharacterPaletteItem[];
  tendency?: { left: string; right: string; value: number }[];
  statistics?: CharacterStatisticItem[];
  gallery?: string[];
  galleryAttachmentIds?: ID[];
  externalLinks?: CharacterExternalLink[];
  music?: CharacterExternalLink[];
}

export interface CharacterPageTab {
  template_node_id?: string;
  id: ID;
  title: string;
  sections: CharacterSection[];
}

export interface CharacterProfileData {
  blocks_version?: 1;
  basicBlock?: { id: string; enabled: boolean };
  legacyCharacterSnapshot?: unknown;
  templateBinding?: { sourceId: string; baseline: CharacterProfileData };
  isTemplate?: boolean;
  templateSourceId?: ID;
  basicExamples?: Partial<CharacterProfileData["basic"]>;
  templateId?: "fantasy" | "modern" | "blank" | "dnd5e" | "coc7e";
  layout?: "single" | "two_column";
  basic: {
    name: string;
    alias?: string;
    avatarUrl?: string;
    gender?: string;
    age?: string;
    race?: string;
    role?: string;
    affiliation?: string;
    quote?: string;
    customFields?: { id: string; key: string; value: string }[];
  };
  /** Optional creative-world membership. Empty means an independent character. */
  world_id?: ID | null;
  /** Extra spreadsheet-like pages. The original sections remain the 基本資料 tab. */
  tabs?: CharacterPageTab[];
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
  study?: StudyBackup;
  schema_version: number;
  exported_at: number;
  device_id: ID;
  pages: Page[];
  attachments: WorkspaceBackupAttachmentEntry[];
  settings: WorkspaceBackupSettingEntry[];
}
