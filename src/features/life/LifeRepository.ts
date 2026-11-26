import type { IDBPDatabase } from "idb";
import { WorkspacePersistence } from "../../infrastructure/sync/workspacePersistence";
import { LIFE_STORES, emptyLife, type LifeData, type LifeRecord, type LifeStore } from "./lists";
import { dashboardSettingsKey, isDashboardConfig, sameConfig, type LifeDashboardConfig } from "./dashboard/model";

import { dashboardId, type DashboardRecord, type ScheduleEvent, type Habit } from "./syncRecords";

/** Uses the workspace transaction/outbox, not a separate sync queue. */
export class LifeRepository {
  constructor(
    private db: IDBPDatabase,
    private owner: () => string | null,
  ) {}
  async readDashboard(): Promise<LifeDashboardConfig | undefined> {
    const owner = this.owner();
    const synced = owner ? await this.db.get("life_dashboard_configs", dashboardId(owner)) as DashboardRecord | undefined : undefined;
    const legacy = synced ? undefined : await this.db.get("settings", dashboardSettingsKey(owner));
    if (this.owner() !== owner) throw Error("帳號已切換");
    const config = synced?.config ?? legacy?.value;
    if (config === undefined) return;
    if (!isDashboardConfig(config)) throw Error("儀表板設定格式無效");
    return config;
  }

  async saveDashboard(config: LifeDashboardConfig, baseline?: LifeDashboardConfig) {
    const owner = this.owner();
    if (!isDashboardConfig(config)) throw Error("儀表板設定格式無效");
    const id = dashboardSettingsKey(owner);
    const current = owner ? await this.db.get("life_dashboard_configs", id) as DashboardRecord | undefined : undefined;
    if (this.owner() !== owner) throw Error("帳號已切換");
    const checkBaseline = (saved: unknown) => {
      if (baseline && isDashboardConfig(saved) && !sameConfig(saved, baseline)) {
        throw Error("配置已在其他裝置更新，請取消編輯後重新開啟自訂。");
      }
    };
    if (current) {
      checkBaseline(current.config);
      await new WorkspacePersistence(this.db).mutate(owner, [{
        type: "life_dashboard_configs", kind: "save", value: { ...current, config, updated_at: Date.now() },
      }]);
    } else {
      // Keep the pre-sync snapshot until a successful cloud pull determines its base revision.
      const tx = this.db.transaction(["settings", "life_dashboard_configs"], "readwrite");
      const importedDuringSave = owner && await tx.objectStore("life_dashboard_configs").get(id);
      if (importedDuringSave) {
        await tx.done;
        throw Error("配置已同步，請重新確認後再儲存");
      }
      const previous = await tx.objectStore("settings").get(id);
      checkBaseline(previous?.value);
      await tx.objectStore("settings").put({ key: id, value: config, owner_id: owner });
      await tx.done;
      if (owner && typeof window !== "undefined") window.dispatchEvent(new Event("nexus-workspace-refresh-request"));
    }
  }

  async dashboardConflict() {
    const owner = this.owner();
    return !!owner && await new WorkspacePersistence(this.db).hasDashboardConflict(owner);
  }

  async resolveDashboard(preferLocal: boolean) {
    const owner = this.owner();
    if (!owner || !await new WorkspacePersistence(this.db).resolveDashboard(owner, preferLocal)) {
      throw Error("請先重新同步以取得雲端版本，再處理衝突。");
    }
  }

  async readSchedule(): Promise<ScheduleEvent[]> {
    const owner = this.owner();
    const rows = await this.db.getAll("life_schedule_events") as ScheduleEvent[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return rows.filter(row => row.workspace_owner_id === owner && row.deleted_at == null)
      .sort((a, b) => a.starts_at - b.starts_at || a.title.localeCompare(b.title));
  }

  async saveSchedule(event: ScheduleEvent, remove = false) {
    const owner = this.owner();
    if (owner !== event.workspace_owner_id) throw Error("帳號已切換");
    await new WorkspacePersistence(this.db).mutate(owner, [{
      type: "life_schedule_events", kind: remove ? "soft_delete" : "save", value: event,
    }]);
  }

  async readHabits(): Promise<Habit[]> {
    const owner = this.owner();
    const habits = await this.db.getAll("life_habits") as Habit[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return habits.filter(habit => habit.workspace_owner_id === owner && habit.deleted_at == null)
      .sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
  }

  async saveHabit(habit: Habit, remove = false) {
    const owner = this.owner();
    if (owner !== habit.workspace_owner_id) throw Error("帳號已切換");
    await new WorkspacePersistence(this.db).mutate(owner, [{
      type: "life_habits", kind: remove ? "soft_delete" : "save", value: { ...habit, updated_at: Date.now() },
    }]);
  }

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
