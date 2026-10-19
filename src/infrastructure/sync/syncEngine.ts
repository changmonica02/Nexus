import { flushWorkspace, pullWorkspace, remoteResult } from "./workspaceSync";
import type { EntityType } from "./workspacePersistence";
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
  private workspaceSync: Promise<void> | null = null;
  private workspaceAgain = false;
  private lastWorkspaceAttempt = 0;
  private studySync: Promise<void> | null = null;
  private studySyncTimer: ReturnType<typeof setTimeout> | null = null;
  private studyError: string | null = null;
  private studyOnline = () => { void this.syncStudyNow(); };
  private workspaceTimer: ReturnType<typeof setTimeout> | null = null;
  private workspaceChanged = () => {
    if (this.destroyed) return;
    if (this.isSyncing) { this.workspaceAgain = true; return; }
    if (this.workspaceTimer) return;
    this.workspaceTimer = setTimeout(() => { this.workspaceTimer = null; void this.fullSync(); },
      typeof document !== "undefined" && document.hidden ? 5000 : 300);
  };
  private workspaceVisible = () => {
    if (!document.hidden) {
      if (this.workspaceTimer) { clearTimeout(this.workspaceTimer); this.workspaceTimer = null; }
      this.workspaceChanged();
    }
  };
  private periodicWorkspace = () => {
    if (typeof document !== "undefined" && document.hidden && Date.now() - this.lastWorkspaceAttempt < 300000) return;
    void this.fullSync();
  };
  private studyChanged = () => {
    if (this.destroyed || this.studySyncTimer) return;
    this.studySyncTimer = setTimeout(() => {
      this.studySyncTimer = null;
      void this.storage.getStudyRepository().pending().then(pending => {
        if (pending.length) void this.syncStudyNow();
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
          const pendingPushes = (await repository.pending()).length;
          this.setState({ pendingPushes, ...(previousError && this.state.error === previousError ? { status: "connected" as const, error: null } : {}) });
          if (pendingPushes) this.studyChanged();
        }
      } catch (error) {
        if (!this.destroyed) {
          this.studyError = error instanceof Error ? error.message : String(error);
          const repository=this.storage.getStudyRepository();
          this.setState({ status: "error", error: this.studyError, pendingPushes: (await repository.pending()).length });
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

  /** Realtime starts after the initial tombstone/data/outbox pass. */
  startRealtime(): void {
    if (this.destroyed || this.realtimeChannel) return;
    if (typeof window !== "undefined") {
      window.addEventListener("nexus-study-changed", this.studyChanged);
      window.addEventListener("nexus-workspace-changed", this.workspaceChanged);
      window.addEventListener("online", this.studyOnline);
      window.addEventListener("online", this.workspaceChanged);
      document.addEventListener("visibilitychange", this.workspaceVisible);
    }
    this.realtimeChannel = this.supabase.channel(`nexus-${this.userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pages", filter: `owner_id=eq.${this.userId}` }, payload => {
        void this.handleRemoteChange("pages", payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "attachments", filter: `owner_id=eq.${this.userId}` }, payload => {
        void this.handleRemoteChange("attachments", payload);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "workspace_tombstones", filter: `owner_id=eq.${this.userId}` }, () => this.workspaceChanged())
      .on("postgres_changes", { event: "*", schema: "public", table: "binaries", filter: `owner_id=eq.${this.userId}` }, () => this.workspaceChanged())
      .subscribe(status => {
        if (status === "SUBSCRIBED") {
          // Catch changes between initial pull and subscription (also on reconnect).
          this.workspaceChanged();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          this.setState({ status: "error", error: "Realtime connection failed" });
        }
      });
    this.syncInterval = setInterval(this.periodicWorkspace, 60000);
  }

  private async handleRemoteChange(type: EntityType, payload: { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> }): Promise<void> {
    if (this.destroyed) return;
    const row = payload.eventType === "DELETE" ? payload.old : payload.new;
    if (!row?.id) return;
    try {
      if (payload.eventType === "DELETE") {
        // DELETE may only contain the primary key. Fetch authoritative, owner-scoped
        // tombstone rather than trusting a missing payload.new or a client timestamp.
        const { data, error } = await this.supabase.from("workspace_tombstones").select("*")
          .eq("owner_id", this.userId).eq("entity_type", type).eq("entity_id", row.id).maybeSingle();
        if (error) throw new Error(error.message);
        if (data && !this.destroyed) await this.storage.getWorkspacePersistence().merge(this.userId, [{
          entity_type: type, entity_id: String(row.id), revision: Number(data.revision), deleted_at: Number(data.deleted_at), hard_deleted: true,
        }]);
        // A legacy/admin DELETE without a tombstone is not evidence to invent one.
        // New server operations always create it atomically; periodic pull retries.
      } else if (row.owner_id === this.userId) {
        await this.storage.getWorkspacePersistence().merge(this.userId, [remoteResult(type, row)]);
      }
      if (!this.destroyed) this.onRemoteChange?.();
      this.workspaceChanged();
    } catch (error) {
      if (!this.destroyed) this.setState({ status: "error", error: String(error) });
    }
  }

  fullSync(): Promise<void> {
    if (this.destroyed) return Promise.resolve();
    if (this.workspaceSync) return this.workspaceSync;
    if (this.workspaceTimer) { clearTimeout(this.workspaceTimer); this.workspaceTimer = null; }
    this.workspaceSync = this.runFullSync().finally(() => {
      this.isSyncing = false;
      this.workspaceSync = null;
      if (this.workspaceAgain && !this.destroyed) { this.workspaceAgain = false; this.workspaceChanged(); }
    });
    return this.workspaceSync;
  }

  private async runFullSync(): Promise<void> {
    this.isSyncing = true;
    this.lastWorkspaceAttempt = Date.now();
    this.setState({ status: "syncing", error: null });
    const local = this.storage.getWorkspacePersistence();
    try {
      await pullWorkspace(this.supabase, local, this.userId, () => !this.destroyed);
      if (this.destroyed) return;
      await flushWorkspace(this.supabase, local, this.userId, () => !this.destroyed);
      if (this.destroyed) return;
      this.lastSyncAt = Date.now();
      this.setState({ status: "connected", lastSyncAt: this.lastSyncAt, error: null });
    } catch (error) {
      if (!this.destroyed) this.setState({ status: "error", error: error instanceof Error ? error.message : String(error) });
    } finally {
      if (!this.destroyed) {
        // A tombstone pull must refresh the UI even if a stale queued save conflicts.
        this.onRemoteChange?.();
        await this.syncStudyNow();
        this.setState({ pendingPushes: this.state.pendingPushes + (await local.pending(this.userId)).length });
      }
    }
  }

  async pullChanges(): Promise<void> { await this.fullSync(); }

  // Callers already persist their intent atomically through StorageAdapter. Never
  // reconstruct upload intent from UI snapshots or from cloud absence here.
  async pushPage(page: Page): Promise<void> { await this.pushPages([page]); }
  async pushPages(pages: Page[]): Promise<void> {
    if (pages.length && pages.every(page => page.workspace_owner_id === this.userId)) await this.fullSync();
  }
  async pushAttachment(attachment: Attachment): Promise<void> {
    if (attachment.workspace_owner_id === this.userId) await this.fullSync();
  }
  async pushBinary(_attachmentId: string, _blob: Blob): Promise<void> { await this.fullSync(); }
  async pushSetting(_key: string, _value: unknown): Promise<void> { /* Local-only settings. */ }
  async pushPermanentDeletePage(_pageId: string): Promise<void> { await this.fullSync(); }
  async pushPermanentDeleteAttachment(_attachmentId: string): Promise<void> { await this.fullSync(); }

  destroy(): void {
    if (typeof window !== "undefined") { window.removeEventListener("nexus-study-changed", this.studyChanged); window.removeEventListener("online", this.studyOnline); }
    if (this.studySyncTimer) clearTimeout(this.studySyncTimer);
    if (this.workspaceTimer) clearTimeout(this.workspaceTimer);
    if (typeof window !== "undefined") window.removeEventListener("nexus-workspace-changed", this.workspaceChanged);
    if (typeof window !== "undefined") window.removeEventListener("online", this.workspaceChanged);
    if (typeof document !== "undefined") document.removeEventListener("visibilitychange", this.workspaceVisible);
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
