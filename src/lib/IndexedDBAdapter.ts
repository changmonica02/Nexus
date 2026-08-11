import { openDB, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type {
  ID, Page, PageQuery, CreatePageInput, Attachment,
  WorkspaceBackup, WorkspaceBackupAttachmentEntry, WorkspaceBackupSettingEntry,
} from "./types";
import type { StorageAdapter } from "./StorageAdapter";

const DB_NAME = "nexus";
const DB_VERSION = 3;
const BACKUP_SCHEMA_VERSION = 1;

function newPageId(): ID { return `page_${nanoid()}`; }
function newBlockId(): ID { return `blk_${nanoid()}`; }
function newAttachmentId(): ID { return `att_${nanoid()}`; }
function newQuickNoteId(): ID { return `qn_${nanoid()}`; }
function newTodoId(): ID { return `todo_${nanoid()}`; }

async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

export class IndexedDBAdapter implements StorageAdapter {
  private db: IDBPDatabase | null = null;
  private deviceId: ID = `dev_${nanoid()}`;

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains("pages")) {
          const store = db.createObjectStore("pages", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
          store.createIndex("by_deleted", "deleted_at");
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("attachments")) {
          const store = db.createObjectStore("attachments", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
          store.createIndex("by_deleted", "deleted_at");
          store.createIndex("by_kind", "kind");
        }
        if (!db.objectStoreNames.contains("binaries")) {
          db.createObjectStore("binaries", { keyPath: "id" });
        }
        // Phase C5: independent stores for quick notes and todos
        if (!db.objectStoreNames.contains("quick_notes")) {
          const store = db.createObjectStore("quick_notes", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
        }
        if (!db.objectStoreNames.contains("todos")) {
          const store = db.createObjectStore("todos", { keyPath: "id" });
          store.createIndex("by_updated", "updated_at");
          store.createIndex("by_due", "due_date");
        }
      },
    });

    // Migration: move quick_note and todo kind pages from pages store to new stores (once)
    try {
      const allPages = await this.db.getAll("pages");
      const quickNotesToMigrate = allPages.filter((p: any) => p.kind === "quick_note" || p.folder === "QuickNotes");
      const todosToMigrate = allPages.filter((p: any) => p.kind === "todo");
      if (quickNotesToMigrate.length > 0 || todosToMigrate.length > 0) {
        const tx = this.db.transaction(["pages", "quick_notes", "todos"], "readwrite");
        for (const qn of quickNotesToMigrate) {
          // Only migrate if not already in quick_notes
          const existing = await tx.objectStore("quick_notes").get(qn.id);
          if (!existing) {
            await tx.objectStore("quick_notes").put({
              id: qn.id,
              title: qn.title,
              content_text: qn.content_text || "",
              content_json: qn.content_json || { type: "doc", content: [{ type: "paragraph" }] },
              color: (qn as any).color || null,
              created_at: qn.created_at,
              updated_at: qn.updated_at,
              device_id: qn.device_id,
            });
            // Optionally keep in pages for backward compat or delete? We keep for now but mark? We will leave pages as is for safety, but new code will use quick_notes store primarily.
          }
        }
        for (const td of todosToMigrate) {
          const existing = await tx.objectStore("todos").get(td.id);
          if (!existing) {
            await tx.objectStore("todos").put({
              id: td.id,
              title: td.title,
              completed: (td as any).completed || false,
              due_date: (td as any).due_date || null,
              priority: (td as any).priority || null,
              created_at: td.created_at,
              updated_at: td.updated_at,
              device_id: td.device_id,
            });
          }
        }
        await tx.done;
      }
    } catch (e) {
      console.warn("Quick notes / todos migration warning", e);
    }
  }

  async getPage(id: ID): Promise<Page | null> {
    if (!this.db) throw new Error("DB not initialized");
    return (await this.db.get("pages", id)) ?? null;
  }

  async listPages(query?: PageQuery): Promise<Page[]> {
    if (!this.db) throw new Error("DB not initialized");
    const all = await this.db.getAllFromIndex("pages", "by_updated");
    const visible = all.reverse();
    if (!query?.includeDeleted) return visible.filter((p) => p.deleted_at === null);
    return visible;
  }

  async savePage(page: Page): Promise<Page> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("pages", page);
    return page;
  }

  async createPage(input?: CreatePageInput): Promise<Page> {
    if (!this.db) throw new Error("DB not initialized");
    const now = Date.now();
    const page: Page = {
      id: newPageId(),
      title: input?.title ?? "Untitled",
      content_json: { type: "doc", content: [{ type: "paragraph", attrs: { id: newBlockId() } }] },
      content_text: "",
      tags: input?.tags ?? [],
      folder: input?.folder ?? null,
      links: [],
      attachment_ids: input?.attachment_ids ?? [],
      primary_attachment_id: input?.primary_attachment_id ?? null,
      default_mode: "note",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      revision: 1,
      device_id: this.deviceId,
      kind: input?.kind ?? "note",
      study_items: input?.kind === "study_set" ? [] : undefined,
      presentation_data: input?.kind === "presentation" ? { theme: "minimal", slides: [] } : undefined,
      format: input?.format ?? (input?.kind === "presentation" ? "16:9" : "flow"),
      sort_order: input?.sort_order,
      parent_id: input?.parent_id ?? null,
    };
    await this.db.put("pages", page);
    return page;
  }

  async deletePage(id: ID): Promise<void> {
    const page = await this.getPage(id);
    if (!page) return;
    page.deleted_at = Date.now();
    page.updated_at = Date.now();
    page.revision += 1;
    page.device_id = this.deviceId;
    await this.savePage(page);
  }

  async restorePage(id: ID): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) throw new Error("Page not found");
    page.deleted_at = null;
    page.updated_at = Date.now();
    page.revision += 1;
    page.device_id = this.deviceId;
    await this.savePage(page);
    return page;
  }

  async permanentDeletePage(id: ID): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.delete("pages", id);
    const activeId = await this.getActivePageId();
    if (activeId === id) await this.setActivePageId(null);
  }

  async getActivePageId(): Promise<ID | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "active_page_id");
    return record?.value ?? null;
  }

  async setActivePageId(id: ID | null): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (id === null) await this.db.delete("settings", "active_page_id");
    else await this.db.put("settings", { key: "active_page_id", value: id });
  }

  async getDeviceId(): Promise<ID> { return this.deviceId; }

  async getLanguagePreference(): Promise<string | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "language_preference");
    return record?.value ?? null;
  }

  async setLanguagePreference(language: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("settings", { key: "language_preference", value: language });
  }

  async getThemePreference(): Promise<string | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "theme_preference");
    return record?.value ?? null;
  }

  async setThemePreference(theme: string): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("settings", { key: "theme_preference", value: theme });
  }

  async getPageNightAdaptPreference(): Promise<boolean | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("settings", "page_night_adapt");
    return record?.value ?? null;
  }

  async setPageNightAdaptPreference(adapt: boolean): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("settings", { key: "page_night_adapt", value: adapt });
  }

  async listAttachments(): Promise<Attachment[]> {
    if (!this.db) throw new Error("DB not initialized");
    const all = await this.db.getAllFromIndex("attachments", "by_updated");
    return all.reverse().filter((a) => a.deleted_at === null);
  }

  async getAttachment(id: ID): Promise<Attachment | null> {
    if (!this.db) throw new Error("DB not initialized");
    return (await this.db.get("attachments", id)) ?? null;
  }

  async saveAttachment(attachment: Attachment): Promise<Attachment> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("attachments", attachment);
    return attachment;
  }

  async deleteAttachment(id: ID): Promise<void> {
    const attachment = await this.getAttachment(id);
    if (!attachment) return;
    attachment.deleted_at = Date.now();
    attachment.updated_at = Date.now();
    attachment.device_id = this.deviceId;
    await this.saveAttachment(attachment);
  }

  async attachBinary(attachmentId: ID, blob: Blob): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("binaries", { id: attachmentId, blob, updated_at: Date.now() });
  }

  async readBinary(attachmentId: ID): Promise<Blob | null> {
    if (!this.db) throw new Error("DB not initialized");
    const record = await this.db.get("binaries", attachmentId);
    return record?.blob ?? null;
  }

  async createAttachment(input: { kind: Attachment["kind"]; name: string; mime_type: string; size_bytes: number; page_count?: number }): Promise<Attachment> {
    if (!this.db) throw new Error("DB not initialized");
    const now = Date.now();
    const attachment: Attachment = {
      id: newAttachmentId(),
      kind: input.kind,
      name: input.name,
      mime_type: input.mime_type,
      size_bytes: input.size_bytes,
      storage_key: `bin_${nanoid()}`,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      device_id: this.deviceId,
      page_count: input.page_count,
    };
    await this.db.put("attachments", attachment);
    return attachment;
  }

  // Quick Notes independent store
  async listQuickNotes(): Promise<any[]> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("quick_notes")) return [];
    const all = await this.db.getAllFromIndex("quick_notes", "by_updated");
    return all.reverse();
  }

  async saveQuickNote(note: any): Promise<any> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("quick_notes", note);
    return note;
  }

  async deleteQuickNote(id: any): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("quick_notes")) return;
    await this.db.delete("quick_notes", id);
  }

  // Todos independent store
  async listTodos(): Promise<any[]> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("todos")) return [];
    const all = await this.db.getAllFromIndex("todos", "by_updated");
    return all.reverse();
  }

  async saveTodo(todo: any): Promise<any> {
    if (!this.db) throw new Error("DB not initialized");
    await this.db.put("todos", todo);
    return todo;
  }

  async deleteTodo(id: any): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.db.objectStoreNames.contains("todos")) return;
    await this.db.delete("todos", id);
  }

  async exportWorkspaceBackup(): Promise<WorkspaceBackup> {
    if (!this.db) throw new Error("DB not initialized");
    const allPages = await this.db.getAll("pages");
    const allAttachments = await this.db.getAll("attachments");
    const allSettingsRecords: WorkspaceBackupSettingEntry[] = await this.db.getAll("settings");
    const attachmentEntries: WorkspaceBackupAttachmentEntry[] = [];
    for (const attachment of allAttachments) {
      const binaryRecord = await this.db.get("binaries", attachment.id);
      const binaryBase64 = binaryRecord?.blob ? await blobToBase64(binaryRecord.blob) : null;
      attachmentEntries.push({ attachment, binary_base64: binaryBase64 });
    }
    return {
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: Date.now(),
      device_id: this.deviceId,
      pages: allPages,
      attachments: attachmentEntries,
      settings: allSettingsRecords,
    };
  }

  async importWorkspaceBackup(backup: WorkspaceBackup): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!backup || typeof backup.schema_version !== "number") throw new Error("Invalid backup file.");
    if (backup.schema_version > BACKUP_SCHEMA_VERSION) throw new Error(`Backup schema_version (${backup.schema_version}) is newer than supported (${BACKUP_SCHEMA_VERSION}).`);
    const tx = this.db.transaction(["pages", "attachments", "binaries", "settings"], "readwrite");
    await tx.objectStore("pages").clear();
    await tx.objectStore("attachments").clear();
    await tx.objectStore("binaries").clear();
    await tx.objectStore("settings").clear();
    for (const page of backup.pages) await tx.objectStore("pages").put(page);
    for (const entry of backup.attachments) {
      await tx.objectStore("attachments").put(entry.attachment);
      if (entry.binary_base64) {
        const blob = base64ToBlob(entry.binary_base64, entry.attachment.mime_type || "application/octet-stream");
        await tx.objectStore("binaries").put({ id: entry.attachment.id, blob, updated_at: Date.now() });
      }
    }
    for (const setting of backup.settings) await tx.objectStore("settings").put(setting);
    await tx.done;
  }

  async close(): Promise<void> { this.db?.close(); }
}
