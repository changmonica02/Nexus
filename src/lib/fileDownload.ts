/** 觸發?覽??載?份???檔?，? Markdown export ??Workspace Backup export 使用??*/
export function downloadTextFile(fileName: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** 將??中容???Windows / ??系統???????替?為安全字???*/
export function safeFileName(name: string): string {
  return (name || "Untitled").replace(/[\\/:*?"<>|]/g, "-").trim() || "Untitled";
}

/** 將任????????JSON 並觸??載??Workspace Backup export（Track E）使??*/
export function downloadJsonFile(fileName: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  downloadTextFile(fileName, json, "application/json;charset=utf-8");
}

/** ?? Workspace Backup ?出檔?，格式為 nexus-backup-YYYY-MM-DD-HHmm.json??*/
export function formatBackupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}`;
  return `nexus-backup-${stamp}.json`;
}
