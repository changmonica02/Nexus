"use client";
import { useEffect, useState, type RefObject } from "react";
import type { Attachment } from "../lib/types";
import type { StorageAdapter } from "../infrastructure/storage/StorageAdapter";

/** Both panes own their URL; a late read must never replace the next attachment. */
export function useAttachmentPreview(attachment: Attachment | null, storage: RefObject<StorageAdapter | null>) {
  const [result, setResult] = useState<{ attachment: Attachment | null; url: string | null; error: string | null }>({ attachment: null, url: null, error: null });
  useEffect(() => {
    let cancelled = false, url: string | null = null;
    const publish = (error: string | null) => { if (!cancelled) setResult({ attachment, url, error }); };
    async function load() {
      publish(null);
      if (!attachment) return;
      if (attachment.kind !== "pdf") return publish("This attachment is not a PDF.");
      if (!storage.current) return publish("Storage is not ready.");
      const blob = await storage.current.readBinary(attachment.id);
      if (cancelled) return;
      if (!blob) return publish("PDF binary data was not found in local storage.");
      url = URL.createObjectURL(blob);
      publish(null);
    }
    void load().catch(() => publish("Failed to load PDF preview."));
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [attachment, storage]);
  return result.attachment === attachment ? result : { url: null, error: null };
}
