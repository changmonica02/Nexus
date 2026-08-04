"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { IndexedDBAdapter } from "../lib/IndexedDBAdapter";
import type { Page, Attachment } from "../lib/types";
import type { StorageAdapter } from "../lib/StorageAdapter";
import { getSupabase, isSupabaseConfigured } from "../lib/supabase";
import { SyncEngine, type SyncState } from "../lib/syncEngine";
import { detectDefaultLanguage, type Language } from "../lib/i18n";

/**
 * Phase B9: Extract pages storage logic from NexusApp (1198 lines)
 * This hook encapsulates init, pages, trash, attachments, sync
 * Currently used as reference, NexusApp still has its own states for backward compat
 * Future: NexusApp will use this hook directly to reduce size
 */

export function usePagesStorage(onLanguageLoaded: (lang: Language) => void, onThemeChange: (t: "light" | "dark") => void) {
  const storageRef = useRef<StorageAdapter | null>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pages, setPages] = useState<Page[]>([]);
  const [trashPages, setTrashPages] = useState<Page[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [syncState, setSyncState] = useState<SyncState>({ status: "idle", lastSyncAt: 0, error: null, pendingPushes: 0 });

  useEffect(() => {
    let cancelled = false;
    const adapter = new IndexedDBAdapter();
    async function init() {
      await adapter.init();
      if (cancelled) return;
      storageRef.current = adapter;
      let allPages = await adapter.listPages();
      let allAttachments = await adapter.listAttachments();
      setPages(allPages);
      setAttachments(allAttachments);
      const savedLanguage = await adapter.getLanguagePreference();
      if (savedLanguage === "en" || savedLanguage === "zh-TW") onLanguageLoaded(savedLanguage as any);
      else onLanguageLoaded(detectDefaultLanguage() as any);
      const savedTheme = await adapter.getThemePreference();
      if (savedTheme === "dark" || savedTheme === "light") onThemeChange(savedTheme as any);
      setIsReady(true);
      if (isSupabaseConfigured()) {
        const supabase = getSupabase();
        if (supabase) {
          const deviceId = await adapter.getDeviceId();
          const engine = new SyncEngine(supabase, adapter, deviceId);
          syncEngineRef.current = engine;
          engine.subscribe(setSyncState);
          engine.setOnRemoteChange(async () => {
            const syncedPages = await adapter.listPages();
            const syncedAttachments = await adapter.listAttachments();
            setPages(syncedPages);
            setAttachments(syncedAttachments);
          });
          await engine.fullSync();
          if (cancelled) return;
          allPages = await adapter.listPages();
          allAttachments = await adapter.listAttachments();
          setPages(allPages);
          setAttachments(allAttachments);
          engine.startRealtime();
        }
      }
    }
    init().catch((e) => { console.error(e); setIsReady(true); });
    return () => {
      cancelled = true;
      syncEngineRef.current?.destroy();
      adapter.close?.();
    };
  }, []);

  return {
    storageRef,
    syncEngineRef,
    isReady,
    pages,
    setPages,
    trashPages,
    setTrashPages,
    attachments,
    setAttachments,
    syncState,
  };
}