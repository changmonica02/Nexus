/**
 * Nexus Sync Engine ??Shared Workspace
 * All users share the same data. Realtime sync via Supabase.
 */

import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import type { Page, Attachment } from "./types";
import type { StorageAdapter } from "./StorageAdapter";

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
  private lastSyncAt: number = 0;
  private listeners: Set<SyncListener> = new Set();
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private state: SyncState = { status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 };
  private isSyncing: boolean = false;
  private realtimeChannel: RealtimeChannel | null = null;
  private onRemoteChange: (() => void) | null = null;

  constructor(supabase: SupabaseClient, storage: StorageAdapter, deviceId: string) {
    this.supabase = supabase;
    this.storage = storage;
    this.deviceId = deviceId;
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  private setState(partial: Partial<SyncState>): void {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l(this.state));
  }

  /** Set a callback for when remote data changes (to trigger UI refresh) */
  setOnRemoteChange(callback: () => void): void {
    this.onRemoteChange = callback;
  }

  /** Start realtime subscriptions + periodic sync */
  startRealtime(): void {
    // Subscribe to page changes
    this.realtimeChannel = this.supabase
      .channel("nexus-shared")
      .on("postgres_changes", { event: "*", schema: "public", table: "pages" }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote page change:", payload.eventType, data?.id);
        this.handleRemotePageChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attachments" }, (payload: Record<string, unknown>) => {
        const data = payload.new as Record<string, unknown> | null;
        console.log("[Sync] Remote attachment change:", payload.eventType, data?.id);
        this.handleRemoteAttachmentChange(payload as unknown as { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.setState({ status: "connected" });
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.setState({ status: "error", error: "Realtime connection failed" });
        }
      });

    // Also do periodic pull as backup (every 60 seconds)
    this.syncInterval = setInterval(() => { this.pullChanges(); }, 60000);
  }

  private async handleRemotePageChange(payload: { eventType: string; new: Record<string, unknown> | null; old: Record<string, unknown> | null }): Promise<void> {
    const data = payload.new;
    if (!data || !data.id) return;
    // Skip if this change came from this device
    if (data.device_id === this.deviceId) return;

    const localPages = await this.storage.listPages({ includeDeleted: true });
    const localPage = localPages.find((p) => p.id === data.id);

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

    const localAttachments = await this.storage.listAttachments();
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
      };
      await this.storage.saveAttachment(att);
      this.onRemoteChange?.();
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
    };
  }

  /** Initial full sync: pull everything from cloud */
  async fullSync(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;
    this.setState({ status: "syncing", error: null });

    try {
      const { data: cloudPages, error: pagesError } = await this.supabase.from("pages").select("*");
      if (pagesError) throw new Error(`Pages pull failed: ${pagesError.message}`);

      const { data: cloudAttachments, error: attachmentsError } = await this.supabase.from("attachments").select("*");
      if (attachmentsError) throw new Error(`Attachments pull failed: ${attachmentsError.message}`);

      const { data: cloudBinaries, error: binariesError } = await this.supabase.from("binaries").select("*");
      if (binariesError) throw new Error(`Binaries pull failed: ${binariesError.message}`);

      const localPages = await this.storage.listPages({ includeDeleted: true });
      const localAttachments = await this.storage.listAttachments();
      const localPageMap = new Map(localPages.map((p) => [p.id, p]));
      let maxUpdatedAt = this.lastSyncAt;

      // Pull cloud pages ??local (if cloud is newer)
      for (const cloudPage of (cloudPages || [])) {
        const localPage = localPageMap.get(cloudPage.id);
        if (!localPage || cloudPage.updated_at > localPage.updated_at) {
          await this.storage.savePage(this.cloudRowToPage(cloudPage as unknown as Record<string, unknown>));
        }
        if (cloudPage.updated_at > maxUpdatedAt) maxUpdatedAt = cloudPage.updated_at;
      }

      // Push local pages ??cloud (if local is newer or doesn't exist on cloud)
      for (const localPage of localPages) {
        const cloudPage = (cloudPages || []).find((cp: { id: string }) => cp.id === localPage.id);
        if (!cloudPage || localPage.updated_at > cloudPage.updated_at) {
          await this.pushPage(localPage);
        }
        if (localPage.updated_at > maxUpdatedAt) maxUpdatedAt = localPage.updated_at;
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

      this.lastSyncAt = maxUpdatedAt;
      this.setState({ status: "connected", lastSyncAt: maxUpdatedAt, error: null });
      this.onRemoteChange?.();
    } catch (err) {
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
      const { data: cloudPages } = await this.supabase.from("pages").select("*").gt("updated_at", this.lastSyncAt);
      let maxUpdatedAt = this.lastSyncAt;
      let changed = false;

      for (const cloudPage of (cloudPages || [])) {
        if (cloudPage.device_id === this.deviceId) continue; // Skip own changes
        const localPages = await this.storage.listPages({ includeDeleted: true });
        const localPage = localPages.find((p) => p.id === cloudPage.id);
        if (!localPage || cloudPage.updated_at > localPage.updated_at) {
          await this.storage.savePage(this.cloudRowToPage(cloudPage as unknown as Record<string, unknown>));
          changed = true;
        }
        if (cloudPage.updated_at > maxUpdatedAt) maxUpdatedAt = cloudPage.updated_at;
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
    try {
      await this.supabase.from("pages").upsert({
        id: page.id, title: page.title, content_json: page.content_json,
        content_text: page.content_text, default_mode: page.default_mode,
        created_at: page.created_at, updated_at: page.updated_at, deleted_at: page.deleted_at,
        revision: page.revision, device_id: this.deviceId,
        tags: page.tags || [], folder: page.folder || null, links: page.links || [],
        attachment_ids: page.attachment_ids || [], primary_attachment_id: page.primary_attachment_id || null,
        kind: page.kind || "note", study_items: page.study_items || null, presentation_data: page.presentation_data || null,
        is_favorite: page.is_favorite || false, format: page.format || "flow",
        sort_order: page.sort_order ?? null, parent_id: page.parent_id || null,
      }, { onConflict: "id" });

      if (page.updated_at > this.lastSyncAt) this.setState({ lastSyncAt: page.updated_at });
    } catch (err) {
      console.error("[SyncEngine] pushPage error:", err);
    }
  }

  async pushAttachment(attachment: Attachment): Promise<void> {
    try {
      await this.supabase.from("attachments").upsert({
        id: attachment.id, kind: attachment.kind, name: attachment.name,
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
    try {
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      const chunkSize = 0x8000;
      for (let i = 0; i < bytes.length; i += chunkSize) binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
      await this.supabase.from("binaries").upsert({
        id: attachmentId, data: btoa(binary), updated_at: Date.now(),
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
      await this.supabase.from("pages").delete().eq("id", pageId);
      await this.supabase.from("binaries").delete().eq("id", pageId);
    } catch (err) {
      console.error("[SyncEngine] pushPermanentDeletePage error:", err);
    }
  }

  destroy(): void {
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