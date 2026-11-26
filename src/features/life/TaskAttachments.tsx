import { useState } from "react";
import type { Attachment } from "../../lib/types";
import { downloadBlobFile, safeFileName } from "../../lib/fileDownload";
import { control } from "./dashboard/styles";

export default function TaskAttachments({ files, upload, download, detach }: {
  files: Attachment[];
  upload: (file: File) => Promise<void>;
  download: (id: string) => Promise<Blob | null>;
  detach: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <details className="min-w-0 basis-full">
    <summary className="cursor-pointer py-1">附件 · {files.length}</summary>
    <ul className="max-h-32 overflow-auto">{files.map(file => <li key={file.id} className="flex flex-wrap gap-2 py-1">
      <button type="button" className={control + " break-all"} onClick={async () => {
        setError("");
        try {
          const blob = await download(file.id);
          if (!blob) throw Error("此裝置目前沒有附件內容，請同步後重試。");
          downloadBlobFile(safeFileName(file.name), blob);
        } catch (error) { setError(error instanceof Error ? error.message : "附件無法下載"); }
      }}>{file.name}</button>
      <button type="button" className={control} aria-label={`解除連結 ${file.name}`} onClick={() => detach(file.id)}>解除連結</button>
    </li>)}</ul>
    <label className="grid max-w-sm gap-1">新增任務附件<input className={control} type="file" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;
      setError("");
      setBusy(true);
      try { await upload(file); }
      catch (error) { setError(error instanceof Error ? error.message : "附件無法儲存"); }
      finally { setBusy(false); }
    }}/></label>
    {error && <p role="alert">{error}</p>}
  </details>;
}
