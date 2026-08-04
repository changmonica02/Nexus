import type { ID, Page, PageQuery, CreatePageInput, Attachment, WorkspaceBackup } from "./types";

export interface QuickNote {
  id: ID;
  title: string;
  content_text: string;
  content_json: object;
  color?: string | null;
  created_at: number;
  updated_at: number;
  device_id: ID;
}

export interface TodoItem {
  id: ID;
  title: string;
  completed: boolean;
  due_date: number | null;
  priority?: "low" | "medium" | "high" | null;
  created_at: number;
  updated_at: number;
  device_id: ID;
}

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
  // Quick Notes independent store (C5)
  listQuickNotes?(): Promise<QuickNote[]>;
  saveQuickNote?(note: QuickNote): Promise<QuickNote>;
  deleteQuickNote?(id: ID): Promise<void>;
  // Todos independent store (C5)
  listTodos?(): Promise<TodoItem[]>;
  saveTodo?(todo: TodoItem): Promise<TodoItem>;
  deleteTodo?(id: ID): Promise<void>;
  close?(): Promise<void>;
}