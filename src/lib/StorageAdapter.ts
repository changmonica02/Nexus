import type { ID, Page, PageQuery, CreatePageInput, Attachment, WorkspaceBackup } from "./types";

// H3 fix (方案 A): QuickNote/TodoItem 獨立 store 介面已廢棄；
// quick_note/todo 統一為 pages store 的 kind（Page.kind），不再需要獨立 store 型別。

export interface StorageAdapter {
  init(): Promise<void>;
  getPage(id: ID): Promise<Page | null>;
  listPages(query?: PageQuery): Promise<Page[]>;
  savePage(page: Page): Promise<Page>;
  createPage(input?: CreatePageInput): Promise<Page>;
  deletePage(id: ID): Promise<void>;
  restorePage(id: ID): Promise<Page>;
  permanentDeletePage(id: ID): Promise<void>;
  createAttachment?(input: {
    kind: Attachment["kind"];
    name: string;
    mime_type: string;
    size_bytes: number;
    page_count?: number;
  }): Promise<Attachment>;
  getActivePageId(): Promise<ID | null>;
  setActivePageId(id: ID | null): Promise<void>;
  getDeviceId(): Promise<ID>;
  getLanguagePreference(): Promise<string | null>;
  setLanguagePreference(language: string): Promise<void>;
  getThemePreference(): Promise<string | null>;
  setThemePreference(theme: string): Promise<void>;
  getPageNightAdaptPreference?(): Promise<boolean | null>;
  setPageNightAdaptPreference?(adapt: boolean): Promise<void>;
  listAttachments(): Promise<Attachment[]>;
  getAttachment(id: ID): Promise<Attachment | null>;
  saveAttachment(attachment: Attachment): Promise<Attachment>;
  deleteAttachment(id: ID): Promise<void>;
  attachBinary(attachmentId: ID, blob: Blob): Promise<void>;
  readBinary(attachmentId: ID): Promise<Blob | null>;
  exportWorkspaceBackup?(): Promise<WorkspaceBackup>;
  importWorkspaceBackup?(backup: WorkspaceBackup): Promise<void>;
  close?(): Promise<void>;
}
