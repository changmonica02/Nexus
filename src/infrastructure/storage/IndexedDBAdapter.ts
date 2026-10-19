import {validateStudyStyle} from '../../features/study/studyStyles';
import {createScore} from "../../features/score/score";
import { sameStudyRecord } from "../../features/study/studyFSRS";
import { QUIZ_STORES } from "../../features/study/legacyQuiz";
import { StudyRepository, STUDY_STORES } from "../../features/study/StudyRepository";
import { openDB, type IDBPDatabase } from "idb";
import { nanoid } from "nanoid";
import type {
  ID, Page, PageQuery, CreatePageInput, Attachment,
  WorkspaceBackup, WorkspaceBackupAttachmentEntry,
} from "../../lib/types";
import type { StorageAdapter } from "./StorageAdapter";
import { WorkspacePersistence, WORKSPACE_STORES, type WorkspaceBatch } from "../sync/workspacePersistence";

const DB_NAME = "nexus";
const DB_VERSION = 8;
const BACKUP_SCHEMA_VERSION = 3;

function newPageId(): ID { return `page_${nanoid()}`; }
function newBlockId(): ID { return `blk_${nanoid()}`; }
function newAttachmentId(): ID { return `att_${nanoid()}`; }

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
  getWorkspacePersistence(): WorkspacePersistence {
    if (!this.db) throw new Error("DB not initialized");
    return new WorkspacePersistence(this.db);
  }
  private studyRepository: StudyRepository | null = null;
  private studyRepositoryOwner: string | null | undefined;
  getStudyRepository(): StudyRepository {
    if (!this.db) throw new Error("DB not initialized");
    if (!this.studyRepository || this.studyRepositoryOwner !== this.workspaceOwnerId) {
      const owner = this.workspaceOwnerId;
      this.studyRepositoryOwner = owner;
      this.studyRepository = new StudyRepository(this.db, () => owner, this.deviceId);
    }
    return this.studyRepository;
  }
  private deviceId: ID = `dev_${nanoid()}`;
  // IndexedDB is shared by browser profiles, unlike Supabase. Keep its records
  // explicitly partitioned so changing accounts never exposes another account's
  // cached pages or attachments.
  private workspaceOwnerId: ID | null = null;

  getWorkspaceOwner(): ID | null { return this.workspaceOwnerId; }

  setWorkspaceOwner(ownerId: ID | null): void {
    this.workspaceOwnerId = ownerId;
  }

  async claimAnonymousWorkspace(ownerId: ID): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    const claimKey = "anonymous_workspace_claimed_owner";
    if (await this.db.get("settings", claimKey)) return;

    // This is intentionally a one-time, explicit migration: the user asked
    // for all current local data to belong to their account. Later anonymous
    // workspaces must not be silently claimed by whichever account signs in.
    const tx = this.db.transaction(["pages", "attachments", "settings", ...STUDY_STORES, ...WORKSPACE_STORES], "readwrite");
    const pages = await tx.objectStore("pages").getAll();
    const attachments = await tx.objectStore("attachments").getAll();
    for (const page of pages) {
      if ((page.workspace_owner_id ?? null) === null) {
        await tx.objectStore("pages").put({ ...page, workspace_owner_id: ownerId });
      }
    }
    for (const attachment of attachments) {
      if ((attachment.workspace_owner_id ?? null) === null) {
        await tx.objectStore("attachments").put({ ...attachment, workspace_owner_id: ownerId });
      }
    }
    // Only explicit, post-upgrade offline intents are claimed for upload. Old cached
    // rows without an outbox record never become inferred cloud creations.
    for (const batch of await tx.objectStore("workspace_outbox").getAll() as WorkspaceBatch[]) {
      if (batch.owner_id == null) await tx.objectStore("workspace_outbox").put({ ...batch, owner_id: ownerId,
        operations: batch.operations.map(op => ({ ...op, ...(op.value ? { value: { ...op.value, workspace_owner_id: ownerId } } : {}) })) });
    }
    for (const meta of await tx.objectStore("workspace_sync_meta").getAll()) {
      if (meta.id !== "sequence" && meta.owner_id == null) {
        const [, type, id] = JSON.parse(meta.id);
        await tx.objectStore("workspace_sync_meta").delete(meta.id);
        await tx.objectStore("workspace_sync_meta").put({ ...meta, id: JSON.stringify([ownerId, type, id]), owner_id: ownerId });
      }
    }
    const claimStudy = (record: Record<string, unknown>): Record<string, unknown> => {
      const claimed: Record<string, unknown> = { ...record, owner_id: ownerId };
      for (const field of ["value", "before", "after", "session"]) {
        if (record[field] && typeof record[field] === "object") claimed[field] = claimStudy(record[field] as Record<string, unknown>);
      }
      return claimed;
    };
    for (const name of STUDY_STORES) {
      for (const record of await tx.objectStore(name).getAll()) {
        if (record.owner_id == null) {
          const claimed=claimStudy(record);
          if(name==='study_sync_meta'){
            const key=JSON.parse(record.id);key[0]=ownerId;claimed.id=JSON.stringify(key);
            await tx.objectStore(name).delete(record.id);
          }
          await tx.objectStore(name).put(claimed);
        }
      }
    }
    await tx.objectStore("settings").put({ key: claimKey, value: ownerId });
    await tx.done;
  }

  async init(): Promise<void> {
    this.db = await openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        for (const name of [...STUDY_STORES,...QUIZ_STORES,...WORKSPACE_STORES]) {
          if (!db.objectStoreNames.contains(name)) {
            const store = db.createObjectStore(name, { keyPath: "id" });
            if (name === "study_cards" || name === "study_states" || name === "study_events") store.createIndex("deck", "deck_id");
          }
        }
        const events=transaction.objectStore('study_events');
        if(!events.indexNames.contains('deck_at'))events.createIndex('deck_at',['deck_id','at']);
        if(!events.indexNames.contains('deck_day'))events.createIndex('deck_day',['deck_id','local_day']);
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
        // H3 fix (方案 A): quick_note/todo 統一為 pages store 的 kind，不再建立獨立 store。
        // 既有 DB 若已存在 quick_notes/todos store（舊版建立），upgrade 不會移除它們，
        // 但程式碼不再讀寫；未來可在 DB_VERSION 4 的 upgrade 中清理。
      },
    });
  }

  async getPage(id: ID): Promise<Page | null> {
    if (!this.db) throw new Error("DB not initialized");
    return (await this.db.get("pages", id)) ?? null;
  }

  async listPages(query?: PageQuery): Promise<Page[]> {
    if (!this.db) throw new Error("DB not initialized");
    const all = await this.db.getAllFromIndex("pages", "by_updated");
    const visible = all.reverse();
    const workspacePages = visible.filter((p) => (p.workspace_owner_id ?? null) === this.workspaceOwnerId);
    if (!query?.includeDeleted) return workspacePages.filter((p) => p.deleted_at === null);
    return workspacePages;
  }

  async savePage(page: Page): Promise<Page> {
    const current=await this.getPage(page.id);
    if(current?.official_pack_id&&page.title!==current.title)throw new Error('官方單字集標題不可編輯。');
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "pages", kind: "save", value: page }]);
    return page;
  }

  async savePageChecked(page:Page,expectedRevision:number,source?:{id:string;revision:number}):Promise<Page>{
    const current=await this.getPage(page.id);if(current?.official_pack_id && current.title!==page.title)throw Error("官方單字集標題不可編輯。");
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId,[{type:"pages",kind:"save",value:page}],
      [{type:"pages",id:page.id,revision:expectedRevision},...(source?[{type:"pages" as const,id:source.id,revision:source.revision}]:[])]);
    return page;
  }

  async savePages(pages: Page[]): Promise<void> {
    if (pages.length) await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, pages.map(value => ({ type: "pages", kind: "save", value })));
  }

  async createPage(input?: CreatePageInput): Promise<Page> {
    if (!this.db) throw new Error("DB not initialized");
    const now = Date.now();
    const page: Page = {
      id: newPageId(),
      title: input?.title ?? (input?.kind === "score" ? "新樂譜" : "Untitled"),
      content_json: input?.kind === "score" ? createScore(input.title ?? "新樂譜", "numbered", now) : { type: "doc", content: [{ type: "paragraph", attrs: { id: newBlockId() } }] },
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
      workspace_owner_id: this.workspaceOwnerId,
    };
    await this.savePage(page);
    return page;
  }

  async deletePage(id: ID): Promise<void> {
    const page = await this.getPage(id);
    if (!page) return;
    if(page.official_pack_id)throw new Error('請從官方單字集選單刪除，以一併移除學習進度。');
    page.deleted_at = Date.now();
    page.updated_at = Date.now();
    page.revision += 1;
    page.device_id = this.deviceId;
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "pages", kind: "soft_delete", value: page }]);
  }

  async restorePage(id: ID): Promise<Page> {
    const page = await this.getPage(id);
    if (!page) throw new Error("Page not found");
    page.deleted_at = null;
    page.updated_at = Date.now();
    page.revision += 1;
    page.device_id = this.deviceId;
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "pages", kind: "restore", value: page }]);
    return (await this.getPage(id))!;
  }

  async permanentDeletePage(id: ID): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    const page = await this.getPage(id);
    if (page) await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "pages", kind: "hard_delete", value: page }]);
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

  async listAttachments(includeDeleted = false): Promise<Attachment[]> {
    if (!this.db) throw new Error("DB not initialized");
    const all = await this.db.getAllFromIndex("attachments", "by_updated");
    return all.reverse().filter((a) => (includeDeleted || a.deleted_at === null) && (a.workspace_owner_id ?? null) === this.workspaceOwnerId);
  }

  async getAttachment(id: ID): Promise<Attachment | null> {
    if (!this.db) throw new Error("DB not initialized");
    const attachment = await this.db.get("attachments", id);
    return attachment && (attachment.workspace_owner_id ?? null) === this.workspaceOwnerId ? attachment : null;
  }

  async saveAttachment(attachment: Attachment): Promise<Attachment> {
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "attachments", kind: "save", value: attachment }]);
    return attachment;
  }

  async deleteAttachment(id: ID): Promise<void> {
    const attachment = await this.getAttachment(id);
    if (!attachment) return;
    attachment.deleted_at = Date.now();
    attachment.updated_at = Date.now();
    attachment.device_id = this.deviceId;
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "attachments", kind: "soft_delete", value: attachment }]);
  }

  async restoreAttachment(id: ID): Promise<Attachment> {
    const attachment = await this.getAttachment(id);
    if (!attachment) throw new Error("Attachment not found");
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "attachments", kind: "restore", value: attachment }]);
    return (await this.getAttachment(id))!;
  }

  async permanentDeleteAttachment(id: ID): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    const attachment = await this.getAttachment(id);
    if (attachment) await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "attachments", kind: "hard_delete", value: attachment }]);
  }

  async attachBinary(attachmentId: ID, blob: Blob): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    const attachment = await this.getAttachment(attachmentId);
    if (!attachment) throw new Error("Attachment not found");
    const data = await blobToBase64(blob);
    await this.getWorkspacePersistence().mutate(this.workspaceOwnerId, [{ type: "attachments", kind: "binary", value: attachment, data, blob }]);
  }

  async readBinary(attachmentId: ID): Promise<Blob | null> {
    if (!this.db) throw new Error("DB not initialized");
    const owner = this.workspaceOwnerId;
    const attachment = await this.getAttachment(attachmentId);
    if (!attachment || attachment.deleted_at != null) return null;
    const record = await this.db.get("binaries", attachmentId);
    if (this.workspaceOwnerId !== owner || (record?.owner_id != null && record.owner_id !== owner)) return null;
    if (!(record?.blob instanceof Blob)) return null;
    if (record.server_revision != null) {
      const meta = await this.db.get("workspace_sync_meta", JSON.stringify([owner, "attachments", attachmentId]));
      if (record.server_revision !== meta?.revision || record.blob.size !== record.verified_size) {
        // An offline user edit remains readable; an obsolete remote cache does not.
        const pending = (await this.db.getAll("workspace_outbox") as WorkspaceBatch[]).some(batch => batch.owner_id === owner
          && batch.operations.some(op => op.entity_type === "attachments" && op.entity_id === attachmentId && op.kind === "binary"));
        if (!pending) return null;
      }
    }
    if (this.workspaceOwnerId !== owner) return null;
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
      workspace_owner_id: this.workspaceOwnerId,
    };
    await this.saveAttachment(attachment);
    return attachment;
  }

  async exportWorkspaceBackup(): Promise<WorkspaceBackup> {
    if (!this.db) throw new Error("DB not initialized");
    const snapshotTime = Date.now();
    const tx = this.db.transaction(["pages", "attachments", "settings", ...STUDY_STORES], "readonly");
    const [allPages, allAttachments, allSettingsRecords, cards, states, events, settings, sessions] = await Promise.all(
      ["pages", "attachments", "settings", "study_cards", "study_states", "study_events", "study_settings", "study_sessions"].map(name => tx.objectStore(name).getAll())
    );
    await tx.done;
    const study = { cards, states, events, settings, sessions };
    const attachmentEntries: WorkspaceBackupAttachmentEntry[] = [];
    for (const attachment of allAttachments) {
      const binaryRecord = await this.db.get("binaries", attachment.id);
      const binaryBase64 = binaryRecord?.blob ? await blobToBase64(binaryRecord.blob) : null;
      attachmentEntries.push({ attachment, binary_base64: binaryBase64 });
    }
    return {
      schema_version: BACKUP_SCHEMA_VERSION,
      exported_at: snapshotTime,
      device_id: this.deviceId,
      pages: allPages,
      attachments: attachmentEntries,
      settings: allSettingsRecords,
      study,
    };
  }

  async importWorkspaceBackup(backup: WorkspaceBackup): Promise<void> {
    if (!this.db) throw new Error("DB not initialized");
    if (!backup || typeof backup.schema_version !== "number") throw new Error("Invalid backup file.");
    if (backup.schema_version > BACKUP_SCHEMA_VERSION) throw new Error(`Backup schema_version (${backup.schema_version}) is newer than supported (${BACKUP_SCHEMA_VERSION}).`);
    if (backup.schema_version >= 2 && !backup.study) throw new Error("新版備份缺少字卡資料，還原已停止。");
    if (backup.schema_version >= 3 && !Array.isArray(backup.study?.sessions)) throw new Error("新版備份缺少 session 資料。");
    if (backup.study) {
      const study = backup.study;
      if (![study.cards, study.states, study.events, study.settings].every(Array.isArray)) throw new Error("字卡備份格式不完整。");
      for(const setting of study.settings){if(setting.record_type==='style'){validateStudyStyle(setting.style!);if(setting.id!==setting.style!.id)throw Error('Style identity mismatch');}}
      const styles=new Set(study.settings.filter(s=>s.record_type==='style').map(s=>s.id));
      for(const setting of study.settings)if(setting.style_id&&!styles.has(setting.style_id))throw Error('Backup is missing assigned study style');
      for(const session of study.sessions??[])if(session.settings_snapshot)validateStudyStyle(session.settings_snapshot);
      const cards = new Map(study.cards.map(card => [card.id, card]));
      const events = new Map(study.events.map(event => [event.id, event]));
      if (events.size !== study.events.length || cards.size !== study.cards.length) throw new Error("備份有重複 ID。");
      for (const event of study.events) {
        if (!cards.has(event.card_id) || (event.parent && !events.has(event.parent))) throw new Error("備份缺少卡片或前序作答，還原已停止。");
      }
      for (const state of study.states) {
        if (!cards.has(state.id) || (state.head && !events.has(state.head))) throw new Error("備份排程缺少對應的歷史，還原已停止。");
      }
      for(const session of study.sessions??[]) {
        if(!Array.isArray(session.targets) || !Array.isArray(session.queue) || !Number.isInteger(session.revision)) throw new Error("練習備份格式錯誤。");
        for(const target of session.targets) {
          const event=target.official_event_id ? events.get(target.official_event_id) : null;
          if(!cards.has(target.card_id) || target.official_event_id && (!event || event.session_id!==session.id || event.card_id!==target.card_id)) throw new Error("練習備份缺少對應正式評分。");
        }
      }
    }
    const tx = this.db.transaction(["pages", "attachments", "binaries", "settings", ...STUDY_STORES, ...WORKSPACE_STORES], "readwrite", { durability: "strict" });
    try {
    // Never erase review history when importing an older or partial backup.
    if (backup.study) {
      for (const event of backup.study.events) {
        const existing = await tx.objectStore("study_events").get(event.id);
        if (existing && !sameStudyRecord(existing, event)) throw new Error("備份中的事件 ID 與既有內容衝突，還原已停止。");
        if (!existing) await tx.objectStore("study_events").add(event);
      }
      for (const [store, records] of [["study_cards", backup.study.cards], ["study_settings", backup.study.settings]] as const) {
        for (const record of records) {
          const local = await tx.objectStore(store).get(record.id);
          if (!local || local.updated_at < record.updated_at) await tx.objectStore(store).put(record);
        }
      }
      for (const state of backup.study.states) {
        const local = await tx.objectStore("study_states").get(state.id);
        if (!local) await tx.objectStore("study_states").put(state);
        else if (local.head !== state.head) await tx.objectStore("study_states").put({ ...local, conflict: true });
      }
      for (const card of backup.study.cards) await tx.objectStore("study_outbox").put({ id: crypto.randomUUID(), owner_id: card.owner_id, kind: "card", value: card });
      for (const setting of backup.study.settings) await tx.objectStore("study_outbox").put({ id: crypto.randomUUID(), owner_id: setting.owner_id, kind: "settings", value: setting });
      for (const state of backup.study.states) {
        const first = backup.study.events.filter(event => event.card_id === state.id).sort((a,b) => a.at-b.at).find(event => event.parent === null);
        const seed = first?.before ?? state;
        await tx.objectStore("study_outbox").put({ id: crypto.randomUUID(), owner_id: seed.owner_id, kind: "seed", value: seed });
      }
      for (const event of backup.study.events) await tx.objectStore("study_outbox").put({ id: crypto.randomUUID(), owner_id: event.owner_id, kind: "event", value: event, restore:true });
      for (const session of backup.study.sessions??[]) {
        const local=await tx.objectStore("study_sessions").get(session.id);
        if(local && !sameStudyRecord(local,session)) {
          await tx.objectStore("study_sessions").put({...local,conflict:true});
        } else {
          await tx.objectStore("study_sessions").put(session);
          await tx.objectStore("study_outbox").put({id:crypto.randomUUID(),owner_id:session.owner_id,kind:"session",value:session,restore:true});
        }
      }
    }
    // A backup is not an explicit restore of a deleted cloud object. Preserve
    // delete barriers and unacknowledged local work even when replacing the cache.
    const queued = (await tx.objectStore("workspace_outbox").getAll() as WorkspaceBatch[]).flatMap(batch => batch.operations);
    const preservedPages = (await tx.objectStore("pages").getAll()).filter(row => row.deleted_at != null || queued.some(op => op.entity_type === "pages" && op.entity_id === row.id));
    const preservedAttachments = (await tx.objectStore("attachments").getAll()).filter(row => row.deleted_at != null || queued.some(op => op.entity_type === "attachments" && op.entity_id === row.id));
    const preservedBinaries = (await tx.objectStore("binaries").getAll()).filter(row => preservedAttachments.some(att => att.id === row.id));
    const isHardDeleted = async (type: string, row: Page | Attachment) =>
      (await tx.objectStore("workspace_sync_meta").get(JSON.stringify([row.workspace_owner_id ?? null, type, row.id])))?.hard_deleted;
    await tx.objectStore("pages").clear();
    await tx.objectStore("attachments").clear();
    await tx.objectStore("binaries").clear();
    await tx.objectStore("settings").clear();
    for (const page of backup.pages) if (!await isHardDeleted("pages", page)) await tx.objectStore("pages").put(page);
    for (const entry of backup.attachments) {
      if (await isHardDeleted("attachments", entry.attachment)) continue;
      await tx.objectStore("attachments").put(entry.attachment);
      if (entry.binary_base64) {
        const blob = base64ToBlob(entry.binary_base64, entry.attachment.mime_type || "application/octet-stream");
        await tx.objectStore("binaries").put({ id: entry.attachment.id, blob, updated_at: Date.now() });
      }
    }
    for (const page of preservedPages) await tx.objectStore("pages").put(page);
    for (const attachment of preservedAttachments) await tx.objectStore("attachments").put(attachment);
    for (const binary of preservedBinaries) await tx.objectStore("binaries").put(binary);
    for (const setting of backup.settings) await tx.objectStore("settings").put(setting);
    await tx.done;
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }

  async close(): Promise<void> { this.db?.close(); }
}
