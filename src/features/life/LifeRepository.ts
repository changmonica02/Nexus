import { previewFieldConversion } from "./listConfiguration";
import type { HealthRecord } from "./health/model";
import { financeRow, type FinanceRecord } from "./finance/model";
import { subscriptionNext } from "./finance/ledger";
import type { IDBPDatabase } from "idb";
import { WorkspacePersistence } from "../../infrastructure/sync/workspacePersistence";
import { LIFE_STORES, emptyLife, type LifeData, type LifeItem, type LifeList, type LifeRecord, type LifeStore } from "./lists";
import { dashboardSettingsKey, isDashboardConfig, sameConfig, type LifeDashboardConfig } from "./dashboard/model";

import { dashboardId, type DashboardRecord, type ScheduleEvent, type Habit, type TimerResult } from "./syncRecords";

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

  async saveScheduleSplit(previous: ScheduleEvent, next?: ScheduleEvent) {
    const owner = this.owner();
    if (previous.workspace_owner_id !== owner || next && next.workspace_owner_id !== owner) throw Error("帳號已切換");
    await new WorkspacePersistence(this.db).mutate(owner, [
      { type: "life_schedule_events", kind: "save", value: previous },
      ...(next ? [{ type: "life_schedule_events" as const, kind: "save" as const, value: next }] : []),
    ]);
  }

  async readHealth() {
    const owner=this.owner();
    const records=await this.db.getAll("life_health_records") as HealthRecord[];
    if(this.owner()!==owner)throw Error("帳號已切換");
    return records.filter(row=>row.workspace_owner_id===owner&&row.deleted_at==null);
  }

  async saveHealth(row:HealthRecord,remove=false) {
    const owner=this.owner();
    if(row.workspace_owner_id!==owner)throw Error("帳號已切換");
    await new WorkspacePersistence(this.db).mutate(owner,[{type:"life_health_records",kind:remove?"hard_delete":"save",
      value:{...row,updated_at:Date.now()}}]);
  }

  async readFinance() {
    const owner = this.owner();
    const rows = await this.db.getAll("life_finance_records") as FinanceRecord[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return rows.filter(row => row.workspace_owner_id === owner && row.deleted_at == null);
  }

  async saveFinance(row: FinanceRecord, remove = false) {
    const owner = this.owner();
    if (row.workspace_owner_id !== owner) throw Error("帳號已切換");
    const stored = await this.db.get("life_finance_records", row.id) as FinanceRecord | undefined;
    if (this.owner() !== owner) throw Error("帳號已切換");
    if (stored && stored.kind !== row.kind) throw Error("財務資料類型不可變更");
    if (stored?.kind === "account" && row.kind === "account" && stored.payload.currency !== row.payload.currency) {
      throw Error("既有帳戶幣別不可變更，請建立新帳戶");
    }
    await new WorkspacePersistence(this.db).mutate(owner, [{
      type: "life_finance_records", kind: remove ? "soft_delete" : "save", value: { ...row, updated_at: Date.now() },
    }]);
  }

  async confirmSubscription(row: FinanceRecord<"subscription">, paidDate: string) {
    const owner = this.owner();
    if (row.workspace_owner_id !== owner || row.payload.state !== "active") throw Error("此訂閱無法確認扣款");
    const p = row.payload;
    const source = row.id + "|" + p.next;
    const txId = "subscription:" + source;
    const existing = await this.db.get("life_finance_records", txId);
    if (existing) throw Error("此期訂閱已有交易");
    if (this.owner() !== owner) throw Error("帳號已切換");
    const transaction = financeRow(owner, "transaction", {
      title: p.title, notes: p.notes, type: "expense", date: paidDate, amount: p.amount, account: p.account,
      target: "", targetAmount: "0", category: p.category, source, attachment: "",
    }, txId);
    await new WorkspacePersistence(this.db).mutate(owner, [
      { type: "life_finance_records", kind: "save", value: transaction },
      { type: "life_finance_records", kind: "save", value: { ...row, payload: { ...p, next: subscriptionNext(p) }, updated_at: Date.now() } },
    ]);
  }

  async readTimerStudySessions() {
    const owner = this.owner();
    const rows = await this.db.getAll("study_sessions") as import("../study/studySessions").StudySession[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return rows.filter(row => row.owner_id === owner && (row.ended_at != null || row.completed_at != null))
      .sort((a,b)=>(b.ended_at??b.completed_at??0)-(a.ended_at??a.completed_at??0)).slice(0,50);
  }

  async readTimerHistory() {
    const owner = this.owner();
    const rows = await this.db.getAll("life_timer_results") as TimerResult[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return rows.filter(row => row.workspace_owner_id === owner && row.deleted_at == null).sort((a, b) => b.ended_at - a.ended_at);
  }

  async saveTimerResult(result: TimerResult) {
    const owner = this.owner();
    if (result.workspace_owner_id !== owner) throw Error("帳號已切換");
    const existing = await this.db.get("life_timer_results", result.id);
    if (existing) return;
    if (this.owner() !== owner) throw Error("帳號已切換");
    try {
      await new WorkspacePersistence(this.db).mutate(owner, [{ type: "life_timer_results", kind: "save", value: result }]);
    } catch (error) {
      const saved = await this.db.get("life_timer_results", result.id);
      if (saved?.workspace_owner_id !== owner) throw error;
    }
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
  async convertField(list:LifeList,fieldId:string,target:"text"|"number",items:LifeItem[]) {
    const owner=this.owner();
    if(list.workspace_owner_id!==owner)throw Error("帳號已切換");
    const original=list.fields.find(field=>field.id===fieldId&&!field.archived&&!field.formula);
    if(!original||!(target==="text"?original.type==="number":["text","longtext"].includes(original.type)))throw Error("不支援這組型別轉換");
    const current=(await this.read()).life_items.filter(item=>item.list_id===list.id&&item.deleted_at==null);
    const revisions=new Map(items.map(item=>[item.id,item.revision]));
    if(current.length!==items.length||current.some(item=>revisions.get(item.id)!==item.revision)||this.owner()!==owner)throw Error("項目已更新，請重新預覽");
    const preview=previewFieldConversion(current,fieldId,target);
    if(preview.rejected.length)throw Error("仍有內容無法轉換");
    const id=crypto.randomUUID(), version=list.schema_version+1, stamp=Date.now();
    const updated={...list,schema_version:version,updated_at:stamp,fields:list.fields.flatMap(field=>field.id===fieldId?
      [{...field,archived:true},{id,name:field.name,type:target}]:[field])};
    await new WorkspacePersistence(this.db).mutate(owner,[
      {type:"life_lists",kind:"save",value:updated},
      ...current.filter(item=>Object.hasOwn(preview.converted,item.id)).map(item=>({
        type:"life_items" as const, kind:"save" as const,
        value:{...item,schema_version:version,updated_at:stamp,values:{...item.values,[id]:preview.converted[item.id]}},
      })),
    ]);
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
