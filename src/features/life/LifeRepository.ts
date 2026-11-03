import type { IDBPDatabase } from "idb";
import { WorkspacePersistence } from "../../infrastructure/sync/workspacePersistence";
import { LIFE_STORES, emptyLife, type LifeData, type LifeRecord, type LifeStore } from "./lists";
/** Uses the workspace transaction/outbox, not a separate sync queue. */
export class LifeRepository {
  constructor(
    private db: IDBPDatabase,
    private owner: () => string | null,
  ) {}
  async read(): Promise<LifeData> {
    const owner = this.owner(),
      tx = this.db.transaction([...LIFE_STORES], "readonly"),
      data = emptyLife();
    await Promise.all(
      LIFE_STORES.map(async (s) => {
        (data[s] as LifeRecord[]) = (await tx.objectStore(s).getAll()).filter(
          (r: LifeRecord) => r.workspace_owner_id === owner,
        );
      }),
    );
    await tx.done;
    if (this.owner() !== owner) throw Error("帳號已切換");
    return data;
  }
  async save(type: LifeStore, value: LifeRecord) {
    if (value.workspace_owner_id !== this.owner()) throw Error("帳號已切換");
    await new WorkspacePersistence(this.db).mutate(this.owner(), [{ type, kind: "save", value }]);
  }
  async remove(type: LifeStore, value: LifeRecord) {
    const data = await this.read();
    if (
      type === "life_categories" &&
      (data.life_categories.some((r) => r.parent_id === value.id && r.deleted_at == null) ||
        data.life_items.some((r) => r.category_id === value.id && r.deleted_at == null))
    )
      throw Error("請先移動或刪除子分類與項目");
    const changes: {
      type: LifeStore;
      kind: "soft_delete";
      value: LifeRecord;
    }[] =
      type === "life_lists"
        ? [
            ...data.life_items
              .filter((r) => r.list_id === value.id && r.deleted_at == null)
              .map((value) => ({
                type: "life_items" as const,
                kind: "soft_delete" as const,
                value,
              })),
            ...data.life_categories
              .filter((r) => r.list_id === value.id && r.deleted_at == null)
              .map((value) => ({
                type: "life_categories" as const,
                kind: "soft_delete" as const,
                value,
              })),
          ]
        : [];
    changes.push({ type, kind: "soft_delete", value });
    await new WorkspacePersistence(this.db).mutate(this.owner(), changes);
  }
}
