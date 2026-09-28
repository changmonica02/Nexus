import { openDB } from "idb";

/** Remove only this account's cached records; keep other accounts and preferences. */
export async function clearAccountCache(ownerId: string): Promise<void> {
  const db = await openDB("nexus");
  try {
    const names = Array.from(db.objectStoreNames);
    if (!names.length) return;
    const tx = db.transaction(names, "readwrite");
    for (const name of names) {
      let cursor = await tx.objectStore(name).openCursor();
      while (cursor) {
        const record = cursor.value;
        if (record.owner_id === ownerId || record.workspace_owner_id === ownerId) {
          if (name === "attachments" && names.includes("binaries")) {
            await tx.objectStore("binaries").delete(record.id);
          }
          await cursor.delete();
        }
        cursor = await cursor.continue();
      }
    }
    await tx.done;
  } finally {
    db.close();
  }
}
