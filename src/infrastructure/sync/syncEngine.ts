import { syncStudy } from "../../features/study/studySync";
/**
 * Nexus Sync Engine ??Shared Workspace
 * Per-account workspace sync via Supabase.
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Page, Attachment } from "../../lib/types";
import type { StorageAdapter } from "../storage/StorageAdapter";

export type SyncStatus = "idle" | "syncing" | "error" | "offline" | "connected";

export interface SyncState {
  status: SyncStatus;
  lastSyncAt: number;
  error: string | null;
  pendingPushes: number;
}

type SyncListener = (state: SyncState) => void;

export class SyncEngine {
  private supabase: SupabaseClient;
  private storage: StorageAdapter;
  private deviceId: string;
  private userId: string;
  private lastSyncAt: number = 0;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = { status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 };
  private isSyncing: boolean = false;
  private studySync: Promise<void> | null = null;
  private studySyncTimer: ReturnType<typeof setTimeout> | null = null;
  private studyError: string | null = null;
  private studyOnline = () => { void this.syncStudyNow(); };
  private studyChanged = () => {
    if (this.destroyed || this.studySyncTimer) return;
    this.studySyncTimer = setTimeout(() => {
      this.studySyncTimer = null;
      void this.storage.getStudyRepository().pending().then(pending => {
        if (pending.length) void this.syncStudyNow();
        else void this.storage.getStudyRepository().getQuizRepository()?.pending().then(quiz=>{
          if(quiz.length)void this.syncStudyNow();
        });
      });
    }, 300);
  };
  async syncStudyNow(): Promise<void> {
    if (this.destroyed) return;
    if (this.studySync) return this.studySync;
    this.studySync = (async () => {
      try {
        await syncStudy(this.storage.getStudyRepository(), this.supabase, this.userId, () => !this.destroyed);
        if (!this.destroyed) {
          const previousError = this.studyError;
          this.studyError = null;
          const repository=this.storage.getStudyRepository();
          const pendingPushes = (await repository.pending()).length + (await repository.getQuizRepository()?.pending() ?? []).length;
          this.setState({ pendingPushes, ...(previousError && this.state.error === previousError ? { status: "connected" as const, error: null } : {}) });
          if (pendingPushes) this.studyChanged();
        }
      } catch (error) {
        this.storage.getStudyRepository().getQuizRepository()?.setReachable(false);
        if (!this.destroyed) {
          this.studyError = error instanceof Error ? error.message : String(error);
          const repository=this.storage.getStudyRepository();
          this.setState({ status: "error", error: this.studyError, pendingPushes: (await repository.pending()).length + (await repository.getQuizRepository()?.pending() ?? []).length });
        }
      }
    })();
    try { await this.studySync; } finally { this.studySync = null; }
  }
  private destroyed: boolean = false;
  private realtimeChannel: RealtimeChannel | null = null;
  private onRemoteChange: (() => void) | null = null;

  constructor(supabase: SupabaseClient, storage: StorageAdapter, deviceId: string, userId: string) {
    this.supabase = supabase;
    this.storage = storage;
    this.deviceId = deviceId;
    this.userId = userId;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private setState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    if (partial.status === "connected" && this.studyError) this.state = { ...this.state, status: "error", error: this.studyError };
    this.listeners.forEach((l) => l(this.state));
  }

  /** Set a callback for when remote data changes (to trigger UI refresh) */
  setOnRemoteChange(callback: () => void): void {
    this.onRemoteChange = callback;
  }

  /** Start realtime subscriptions + periodic sync */
  startRealtime(): void {
    if (typeof window !== "undefined") { window.addEventListener("nexus-study-changed", this.studyChanged); window.addEventListener("online", this.studyOnline); }
    // Subscribe to page changes
    this.realtimeChannel = this.supabase
      .channel(`nexus-${this.userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pages", filter: `owner_id=eq.${this.userId}` }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote page change:", payload.eventType, data?.id);
        this.handleRemotePageChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attachments", filter: `owner_id=eq.${this.userId}` }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote attachment change:", payload.eventType, data?.id);
        this.handleRemoteAttachmentChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "binaries", filter: `owner_id=eq.${this.userId}` }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote binary change:", payload.eventType, data?.id);
        this.handleRemoteBinaryChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.setState({ status: "connected" });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.setState({ status: "error", error: "Realtime connection failed" });
        }
      });

    // Also do periodic pull as backup (every 60 seconds)
    this.syncInterval = setInterval(() => { void this.pullChanges().then(() => this.syncStudyNow()); }, 60000);
  }

  private async handleRemotePageChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    // Skip if this change came from this device
    if (data.device_id === this.deviceId) return;

    const localPages = (await this.storage.listPages({ includeDeleted: true }))
      .filter((page) => page.workspace_owner_id === this.userId);
    const localPage = localPages.find((p) => p.id === data.id);

    // M4-1 fix: local soft-delete wins over a stale cloud copy (prevents resurrection)
    if (localPage?.deleted_at && !data.deleted_at && localPage.updated_at >= (data.updated_at as number)) {
      return;
    }
    if (!localPage || (data.updated_at as number) > localPage.updated_at) {
      const page: Page = this.cloudRowToPage(data);
      await this.storage.savePage(page);
      this.onRemoteChange?.();
    }
  }

  private async handleRemoteAttachmentChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    if (data.device_id === this.deviceId) return;

    const localAttachments = (await this.storage.listAttachments(true))
      .filter((attachment) => attachment.workspace_owner_id === this.userId);
    const localAtt = localAttachments.find((a) => a.id === data.id);

    if (!localAtt || (data.updated_at as number) > localAtt.updated_at) {
      const att: Attachment = {
        id: data.id as string,
        kind: ((data.kind as string) || "file") as Attachment["kind"],
        name: (data.name as string) || "",
        mime_type: (data.mime_type as string) || "application/octet-stream",
        size_bytes: (data.size_bytes as number) || 0,
        storage_key: (data.storage_key as string) || "",
        created_at: data.created_at as number,
        updated_at: data.updated_at as number,
        deleted_at: (data.deleted_at as number) || null,
        device_id: (data.device_id as string) || "",
        page_count: (data.page_count as number) ?? undefined,
        workspace_owner_id: this.userId,
      };
      await this.storage.saveAttachment(att);
      this.onRemoteChange?.();
    }
  }

  /**
   * M4-1: Realtime handler for binaries table.
   * When another device pushes a PDF/image binary, download it to local IndexedDB.
   * Note: binaries table has no device_id, so self-pushes also trigger this;
   * the `!localBin` guard makes it a no-op for binaries we already have (idempotent).
   */
  private async handleRemoteBinaryChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    if (payload.eventType === "DELETE") return;

    const localBin = await this.storage.readBinary(data.id as string);
    if (localBin) return; // already have it (own push or already synced)

    if (data.data) {
      try {
        const binary = atob(data.data as string);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const att = await this.storage.getAttachment(data.id as string);
        const blob = new Blob([bytes], { type: att?.mime_type || "application/octet-stream" });
        await this.storage.attachBinary(data.id as string, blob);
        this.onRemoteChange?.();
      } catch (err) {
        console.error("[SyncEngine] handleRemoteBinaryChange error:", err);
      }
    }
  }

  private cloudRowToPage(row: Record<string, unknown>): Page {
    return {
      id: row.id as string,
      title: (row.title as string) || "",
      content_json: (row.content_json as object) || {},
      content_text: (row.content_text as string) || "",
      default_mode: (row.default_mode as "note") || "note",
      created_at: row.created_at as number,
      updated_at: row.updated_at as number,
      deleted_at: (row.deleted_at as number) || null,
      revision: (row.revision as number) || 1,
      device_id: (row.device_id as string) || "",
      tags: (row.tags as string[]) || [],
      folder: (row.folder as string) || null,
      links: (row.links as string[]) || [],
      attachment_ids: (row.attachment_ids as string[]) || [],
      primary_attachment_id: (row.primary_attachment_id as string) || null,
      kind: (row.kind as string as Page["kind"]) || "note",
      study_items: (row.study_items as Page["study_items"]) || undefined,
      presentation_data: (row.presentation_data as Page["presentation_data"]) || undefined,
      is_favorite: (row.is_favorite as boolean) || false,
      format: (row.format as string as Page["format"]) || "flow",
      sort_order: (row.sort_order as number) ?? undefined,
      parent_id: (row.parent_id as string) || null,
      margins: (row.margins as Page["margins"]) || undefined,
      // M4-1: todo / quick_note fields
      due_date: (row.due_date as number) ?? null,
      priority: (row.priority as "low" | "medium" | "high" | null) || null,
      completed: (row.completed as boolean) || false,
      color: (row.color as string) || null,
      creative_type: (row.creative_type as Page["creative_type"]) || undefined,
      character_data: (row.character_data as Page["character_data"]) || undefined,
      novel_settings: (row.novel_settings as Page["novel_settings"]) || undefined,
      assistant_blocks: (row.assistant_blocks as Page["assistant_blocks"]) || undefined,
      workspace_owner_id: this.userId,
    };
  }

  /** Initial full sync: pull everything from cloud */
  async fullSync(): Promise<void> {
    if (this.isSyncing || this.destroyed) return;
    this.isSyncing = true;
    this.setState({ status: "syncing", error: null });

    try {
      const { data: cloudPages, error: pagesError } = await this.supabase.from("pages").select("*").eq("owner_id", this.userId);
      if (pagesError) throw new Error(`Pages pull failed: ${pagesError.message}`);

      const { data: cloudAttachments, error: attachmentsError } = await this.supabase.from("attachments").select("*").eq("owner_id", this.userId);
      if (attachmentsError) throw new Error(`Attachments pull failed: ${attachmentsError.message}`);

      const { data: cloudBinaries, error: binariesError } = await this.supabase.from("binaries").select("*").eq("owner_id", this.userId);
      if (binariesError) throw new Error(`Binaries pull failed: ${binariesError.message}`);

      const localPages = (await this.storage.listPages({ includeDeleted: true }))
        .filter((page) => page.workspace_owner_id === this.userId);
      const localAttachments = (await this.storage.listAttachments(true))
        .filter((attachment) => attachment.workspace_owner_id === this.userId);
      const localPageMap = new Map(localPages.map((p) => [p.id, p]));
      let maxUpdatedAt = this.lastSyncAt;

      // Pull cloud pages ??local (if cloud is newer)
      for (const cloudPage of (cloudPages || [])) {
        const localPage = localPageMap.get(cloudPage.id);
        // M4-1 fix: local soft-delete wins over a stale cloud copy (prevents resurrection)
        if (localPage?.deleted_at && !cloudPage.deleted_at && localPage.updated_at >= (cloudPage.updated_at as number)) {
          continue;
        }
        if (!localPage || cloudPage.updated_at > localPage.updated_at) {
          await this.storage.savePage(this.cloudRowToPage(cloudPage as unknown as Record<string, unknown>));
        }
        if (cloudPage.updated_at > maxUpdatedAt) maxUpdatedAt = cloudPage.updated_at;
      }

      // Push all pending page records together, including offline chapter activation.
      const pendingPages: Page[] = [];
      for (const localPage of localPages) {
        const cloudPage = (cloudPages || []).find((cp: { id: string }) => cp.id === localPage.id);
        if (!cloudPage || localPage.updated_at > cloudPage.updated_at) {
          pendingPages.push(localPage);
        }
        if (localPage.updated_at > maxUpdatedAt) maxUpdatedAt = localPage.updated_at;
      }

      await this.pushPages(pendingPages);

      // Push local attachments ??cloud (if local is newer or doesn't exist on cloud)
      // M4-1 fix: previously fullSync only pushed pages; attachments/binaries created
      // during offline periods never reached the cloud (PDFs missing on other devices).
      for (const localAtt of localAttachments) {
        const cloudAtt = (cloudAttachments || []).find((ca: { id: string }) => ca.id === localAtt.id);
        if (!cloudAtt || localAtt.updated_at > cloudAtt.updated_at) {
          await this.pushAttachment(localAtt);
        }
      }

      // Push local binaries ??cloud (if missing on cloud)
      for (const localAtt of localAttachments) {
        const cloudBin = (cloudBinaries || []).find((cb: { id: string }) => cb.id === localAtt.id);
        if (!cloudBin) {
          const bin = await this.storage.readBinary(localAtt.id);
          if (bin) await this.pushBinary(localAtt.id, bin);
        }
      }

      // Pull cloud attachments ??local
      const localAttMap = new Map(localAttachments.map((a) => [a.id, a]));
      for (const cloudAtt of (cloudAttachments || [])) {
        const localAtt = localAttMap.get(cloudAtt.id);
        if (!localAtt || cloudAtt.updated_at > localAtt.updated_at) {
          const att: Attachment = {
            id: cloudAtt.id, kind: cloudAtt.kind || "file", name: cloudAtt.name || "",
            mime_type: cloudAtt.mime_type || "application/octet-stream", size_bytes: cloudAtt.size_bytes || 0,
            storage_key: cloudAtt.storage_key || "", created_at: cloudAtt.created_at, updated_at: cloudAtt.updated_at,
            deleted_at: cloudAtt.deleted_at || null, device_id: cloudAtt.device_id || "",
            page_count: cloudAtt.page_count ?? undefined,
            workspace_owner_id: this.userId,
          };
          await this.storage.saveAttachment(att);
        }
      }

      // Pull cloud binaries ??local
      for (const cloudBin of (cloudBinaries || [])) {
        const localBin = await this.storage.readBinary(cloudBin.id);
        if (!localBin && cloudBin.data) {
          const binary = atob(cloudBin.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          const att = (cloudAttachments || []).find((a: { id: string }) => a.id === cloudBin.id);
          const blob = new Blob([bytes], { type: att?.mime_type || "application/octet-stream" });
          await this.storage.attachBinary(cloudBin.id, blob);
        }
      }

      if (this.destroyed) return;
      this.lastSyncAt = maxUpdatedAt;
      this.setState({ status: "connected", lastSyncAt: maxUpdatedAt, error: null });
      await this.syncStudyNow();
      this.onRemoteChange?.();
    } catch (err) {
      // A superseded login sync is intentionally abandoned. Do not surface its
      // teardown race as a user-facing synchronization failure.
      if (this.destroyed) return;
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[SyncEngine] fullSync error:", errorMsg);
      this.setState({ status: "error", error: errorMsg });
    } finally {
      this.isSyncing = false;
    }
  }

  /** Pull only changes since last sync */
  async pullChanges(): Promise<void> {
    if (this.isSyncing || this.lastSyncAt === 0) return;
    this.isSyncing = true;
    this.setState({ status: "syncing" });

    try {
      const { data: cloudPages } = await this.supabase.from("pages").select("*").eq("owner_id", this.userId).gt("updated_at", this.lastSyncAt);
      let maxUpdatedAt = this.lastSyncAt;
      let changed = false;

      for (const cloudPage of (cloudPages || [])) {
        if (cloudPage.device_id === this.deviceId) continue; // Skip own changes
        const localPages = (await this.storage.listPages({ includeDeleted: true }))
          .filter((page) => page.workspace_owner_id === this.userId);
        const localPage = localPages.find((p) => p.id === cloudPage.id);
        // M4-1 fix: local soft-delete wins over a stale cloud copy (prevents resurrection)
        if (localPage?.deleted_at && !cloudPage.deleted_at && localPage.updated_at >= (cloudPage.updated_at as number)) {
          continue;
        }
        if (!localPage || cloudPage.updated_at > localPage.updated_at) {
          await this.storage.savePage(this.cloudRowToPage(cloudPage as unknown as Record<string, unknown>));
          changed = true;
        }
        if (cloudPage.updated_at > maxUpdatedAt) maxUpdatedAt = cloudPage.updated_at;
      }

      // M7 fix: pullChanges 原本只拉 pages，Realtime 斷線期間他機新增的附件/PDF 不會同步。
      // 補上 attachments 與 binaries 的增量 pull。
      const { data: cloudAttachments } = await this.supabase.from("attachments").select("*").eq("owner_id", this.userId).gt("updated_at", this.lastSyncAt);
      for (const cloudAtt of (cloudAttachments || [])) {
        if (cloudAtt.device_id === this.deviceId) continue;
        const localAtt = (await this.storage.listAttachments(true))
          .filter((attachment) => attachment.workspace_owner_id === this.userId)
          .find((a) => a.id === cloudAtt.id);
        if (!localAtt || (cloudAtt.updated_at as number) > localAtt.updated_at) {
          await this.storage.saveAttachment({
            id: cloudAtt.id, kind: ((cloudAtt.kind as string) || "file") as Attachment["kind"],
            name: cloudAtt.name || "", mime_type: cloudAtt.mime_type || "application/octet-stream",
            size_bytes: cloudAtt.size_bytes || 0, storage_key: cloudAtt.storage_key || "",
            created_at: cloudAtt.created_at, updated_at: cloudAtt.updated_at,
            deleted_at: cloudAtt.deleted_at || null, device_id: cloudAtt.device_id || "",
            page_count: cloudAtt.page_count ?? undefined,
            workspace_owner_id: this.userId,
          });
          changed = true;
        }
        if ((cloudAtt.updated_at as number) > maxUpdatedAt) maxUpdatedAt = cloudAtt.updated_at as number;
      }

      const { data: cloudBinaries } = await this.supabase.from("binaries").select("*").eq("owner_id", this.userId).gt("updated_at", this.lastSyncAt);
      for (const cloudBin of (cloudBinaries || [])) {
        const localBin = await this.storage.readBinary(cloudBin.id);
        if (localBin) continue; // 本地已有（自己 push 或已同步）
        if (cloudBin.data) {
          try {
            const binary = atob(cloudBin.data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const att = (cloudAttachments || []).find((a: { id: string }) => a.id === cloudBin.id);
            const blob = new Blob([bytes], { type: att?.mime_type || "application/octet-stream" });
            await this.storage.attachBinary(cloudBin.id, blob);
            changed = true;
          } catch (err) { console.error("[SyncEngine] pullChanges binary error:", err); }
        }
      }

      this.lastSyncAt = maxUpdatedAt;
      this.setState({ status: "connected", lastSyncAt: maxUpdatedAt, error: null });
      if (changed) this.onRemoteChange?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      this.setState({ status: "error", error: errorMsg });
    } finally {
      this.isSyncing = false;
    }
  }

  /** Push a single page to cloud */
  async pushPage(page: Page): Promise<void> {
    return this.pushPages([page]);
  }

  /** One upsert keeps chapter activation and its parent change atomic remotely. */
  async pushPages(pages: Page[]): Promise<void> {
    if (this.destroyed || !pages.length || pages.some((page) => page.workspace_owner_id !== this.userId)) return;
    try {
      const { error: upErr } = await this.supabase.from("pages").upsert(pages.map((page) => ({
        id: page.id, owner_id: this.userId, title: page.title, content_json: page.content_json,
        content_text: page.content_text, default_mode: page.default_mode,
        created_at: page.created_at, updated_at: page.updated_at, deleted_at: page.deleted_at,
        revision: page.revision, device_id: this.deviceId,
        tags: page.tags || [], folder: page.folder || null, links: page.links || [],
        attachment_ids: page.attachment_ids || [], primary_attachment_id: page.primary_attachment_id || null,
        kind: page.kind || "note", study_items: page.study_items || null, presentation_data: page.presentation_data || null,
        is_favorite: page.is_favorite || false, format: page.format || "flow",
        sort_order: page.sort_order ?? null, parent_id: page.parent_id || null,
        margins: page.margins ?? null,
        // M4-1: todo / quick_note fields (were missing -> cross-device data loss)
        due_date: page.due_date ?? null,
        priority: page.priority ?? null,
        completed: page.completed ?? false,
        color: page.color ?? null,
        // Creative data must travel with the page; otherwise novels reopen as
        // generic creative pages and lose their overview/settings on another device.
        creative_type: page.creative_type ?? null,
        character_data: page.character_data ?? null,
        novel_settings: page.novel_settings ?? null,
        assistant_blocks: page.assistant_blocks ?? null,
      })), { onConflict: "id" });
      if (upErr) console.error("[SyncEngine] pushPage FAIL:", upErr.message, "| hint:", upErr.hint, "| code:", upErr.code);

      const updatedAt = Math.max(...pages.map((page) => page.updated_at));
      if (!upErr && updatedAt > this.lastSyncAt) this.setState({ lastSyncAt: updatedAt });
    } catch (err) {
      console.error("[SyncEngine] pushPage error:", err);
    }
  }

  async pushAttachment(attachment: Attachment): Promise<void> {
    if (this.destroyed || attachment.workspace_owner_id !== this.userId) return;
    try {
      await this.supabase.from("attachments").upsert({
        id: attachment.id, owner_id: this.userId, kind: attachment.kind, name: attachment.name,
        mime_type: attachment.mime_type, size_bytes: attachment.size_bytes,
        storage_key: attachment.storage_key, created_at: attachment.created_at,
        updated_at: attachment.updated_at, deleted_at: attachment.deleted_at,
        device_id: this.deviceId, page_count: attachment.page_count ?? null,
      }, { onConflict: "id" });
    } catch (err) {
      console.error("[SyncEngine] pushAttachment error:", err);
    }
  }

  async pushBinary(attachmentId: string, blob: Blob): Promise<void> {
    if (this.destroyed) return;
    const attachment = await this.storage.getAttachment(attachmentId);
    if (!attachment || attachment.workspace_owner_id !== this.userId) return;
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      await this.supabase.from("binaries").upsert({
        id: attachmentId, owner_id: this.userId, data: btoa(binary), updated_at: Date.now(),
      }, { onConflict: "id" });
    } catch (err) {
      console.error("[SyncEngine] pushBinary error:", err);
    }
  }

  async pushSetting(_key: string, _value: unknown): Promise<void> {
    // Settings are local-only in shared workspace mode
  }

  async pushPermanentDeletePage(pageId: string): Promise<void> {
    try {
      await this.supabase.from("pages").delete().eq("id", pageId).eq("owner_id", this.userId);
    } catch (err) {
      console.error("[SyncEngine] pushPermanentDeletePage error:", err);
    }
  }

  async pushPermanentDeleteAttachment(attachmentId: string): Promise<void> {
    try {
      await this.supabase.from("attachments").delete().eq("id", attachmentId).eq("owner_id", this.userId);
      await this.supabase.from("binaries").delete().eq("id", attachmentId).eq("owner_id", this.userId);
    } catch (err) {
      console.error("[SyncEngine] pushPermanentDeleteAttachment error:", err);
    }
  }

  destroy(): void {
    if (typeof window !== "undefined") { window.removeEventListener("nexus-study-changed", this.studyChanged); window.removeEventListener("online", this.studyOnline); }
    if (this.studySyncTimer) clearTimeout(this.studySyncTimer);
    this.destroyed = true;
    this.stopPeriodicSync();
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.listeners.clear();
  }

  private stopPeriodicSync(): void {
    if (this.syncInterval) { clearInterval(this.syncInterval); this.syncInterval = null; }
  }
}
