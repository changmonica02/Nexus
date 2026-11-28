import { civilAdvance } from "./civilPeriods";
import { convertHabit, makeExecution, sameTaskData, type TaskExecution, type TaskSlot, type TaskStatus } from "./taskPlan";
import { automationRunId, automationScheduleId, validAutomationAction, type Reminder, type ReminderRule, type AutomationRun, type AutomationRunStatus } from "./reminderModel";
import { previewFieldConversion } from "./listConfiguration";
import type { HealthRecord } from "./health/model";
import { financeRow, type FinanceRecord } from "./finance/model";
import { minorUnits } from "./finance/money";
import { recurringTerms, subscriptionNext } from "./finance/ledger";
import type { IDBPDatabase } from "idb";
import { WorkspacePersistence, type WorkspaceChange } from "../../infrastructure/sync/workspacePersistence";
import { LIFE_STORES, emptyLife, lifeBase, type LifeData, type LifeItem, type LifeList, type LifeRecord, type LifeStore } from "./lists";
import { dashboardSettingsKey, isDashboardConfig, sameConfig, type LifeDashboardConfig } from "./dashboard/model";

import type { Page } from "../../lib/types";
import { dashboardId, type DashboardRecord, type ScheduleEvent, type Habit, type TimerResult, type AutomationRunRecord } from "./syncRecords";

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

  async readAutomationRuns():Promise<AutomationRunStatus[]> {
    const owner=this.owner();
    const legacyKey="life-automation-runs:"+JSON.stringify(owner);
    const legacy=await this.db.get("settings",legacyKey);
    const previous:AutomationRun[]=legacy?.owner_id===owner&&Array.isArray(legacy.value)?legacy.value:[];
    if(owner&&previous.length){
      const changes=await Promise.all(previous.map(async run=>{
        const hash=(await automationScheduleId(JSON.stringify([owner,"automation-history",run]))).slice("automation:".length);
        const id=[hash.slice(0,8),hash.slice(8,12),hash.slice(12,16),hash.slice(16,20),hash.slice(20,32)].join("-");
        return {...this.automationRunChange(owner,run,id),createOnce:true};
      }));
      if(this.owner()!==owner)throw Error("帳號已切換");
      await new WorkspacePersistence(this.db).mutate(owner,changes);
      await this.db.delete("settings",legacyKey);
    }
    const [records,queued]=await Promise.all([
      this.db.getAll("life_automation_runs") as Promise<AutomationRunRecord[]>,
      owner?new WorkspacePersistence(this.db).pending(owner):[],
    ]);
    if(this.owner()!==owner)throw Error("帳號已切換");
    const status=new Map(queued.flatMap(batch=>batch.operations.filter(op=>op.entity_type==="life_automation_runs")
      .map(op=>[op.entity_id,{pending:true,syncError:batch.error}] as const)));
    const attempts=[...(owner?[]:previous),...records.filter(row=>row.workspace_owner_id===owner&&row.deleted_at==null)
      .map(row=>({...row.run,...status.get(row.id)}))].sort((a,b)=>b.at-a.at);
    const byOccurrence=new Map<string,AutomationRunStatus>();
    for(const run of attempts){
      const prior=byOccurrence.get(run.id);
      const preferred=!prior||(prior.error&&!run.error)?run:prior;
      byOccurrence.set(run.id,{...preferred,attempts:(prior?.attempts??0)+1,previousError:prior?.previousError??run.error,
        history:[...(prior?.history??[]),run]});
    }
    return [...byOccurrence.values()].sort((a,b)=>b.at-a.at);
  }

  private automationRunChange(owner:string|null,run:AutomationRun,id=crypto.randomUUID()):WorkspaceChange {
    const value:AutomationRunRecord={id,workspace_owner_id:owner,revision:0,
      created_at:run.at,updated_at:run.at,deleted_at:null,run};
    return {type:"life_automation_runs",kind:"save",value};
  }

  executeScheduleRule(occurrence:Reminder) {
    return this.executeAutomation(occurrence,receipt=>this.runScheduleAutomation(occurrence,receipt));
  }

  executeTaskRule(occurrence:Reminder) {
    return this.executeAutomation({...occurrence,id:"task:"+occurrence.id},receipt=>this.runTaskAutomation(occurrence,receipt));
  }

  executeRule(occurrence:Reminder,rule:ReminderRule) {
    if(!validAutomationAction(rule))throw Error("自動化動作設定無效");
    return this.executeAutomation({...occurrence,id:automationRunId(rule.action,occurrence.id)},async receipt=>{
      switch(rule.action){
        case "schedule": return this.runScheduleAutomation(occurrence,receipt);
        case "task": return this.runTaskAutomation(occurrence,receipt);
        case "estimate": return this.runEstimateAutomation(occurrence,rule,receipt);
        case "relation": return this.runRelationAutomation(occurrence,rule,receipt);
        case "update-task": return this.runTaskUpdateAutomation(rule,receipt);
        default: throw Error("此規則不需要寫入工作區");
      }
    });
  }

  private async runEstimateAutomation(occurrence:Reminder,rule:ReminderRule,receipt:WorkspaceChange) {
    const owner=this.owner(), currency=rule.currency!;
    const hash=await automationScheduleId(JSON.stringify([owner,"estimate",occurrence.id]));
    if(this.owner()!==owner)throw Error("帳號已切換");
    const value=financeRow(owner,"estimate",{
      title:occurrence.title,date:occurrence.day,amount:minorUnits(rule.amount!,currency).toString(),
      currency,category:"",notes:"",
    },"automation_estimate_"+hash.slice("automation:".length));
    await new WorkspacePersistence(this.db).mutate(owner,[{type:"life_finance_records",kind:"save",value,createOnce:true},receipt]);
  }

  private async runRelationAutomation(occurrence:Reminder,rule:ReminderRule,receipt:WorkspaceChange) {
    const owner=this.owner();
    const hash=await automationScheduleId(JSON.stringify([owner,"relation",occurrence.id]));
    const list=await this.db.get("life_lists",rule.destinationList!) as LifeList|undefined;
    const field=list?.fields.find(field=>field.id===rule.relationField&&!field.archived&&field.relation);
    if(!list||list.workspace_owner_id!==owner||list.deleted_at!=null||!field)throw Error("找不到清單或關聯欄位");
    const from=field.relation==="task"?"pages":"life_schedule_events";
    const source=await this.db.get(from,rule.relationId!) as Page|ScheduleEvent|undefined;
    if(this.owner()!==owner)throw Error("帳號已切換");
    if(!source||source.workspace_owner_id!==owner||source.deleted_at!=null
      ||(from==="pages"? (source as Page).kind!=="todo":!!(source as ScheduleEvent).milestone!==(field.relation==="milestone"))){
      throw Error("關聯來源不存在或已刪除");
    }
    const values=Object.fromEntries(list.fields.filter(item=>!item.archived&&!item.relation&&item.defaultValue!==undefined)
      .map(item=>[item.id,item.defaultValue]));
    values[field.id]=source.id;
    const value:LifeItem={...lifeBase(owner,occurrence.title),id:"automation_relation_"+hash.slice("automation:".length),
      list_id:list.id,category_id:null,values,attachment_ids:[],schema_version:list.schema_version};
    await new WorkspacePersistence(this.db).mutate(owner,[{type:"life_items",kind:"save",value,createOnce:true},receipt],
      [{type:from,id:source.id,revision:source.revision}]);
  }

  private async runTaskUpdateAutomation(rule:ReminderRule,receipt:WorkspaceChange) {
    const owner=this.owner();
    const task=await this.db.get("pages",rule.updateTask!) as Page|undefined;
    if(this.owner()!==owner)throw Error("帳號已切換");
    if(!task||task.workspace_owner_id!==owner||task.deleted_at!=null||task.kind!=="todo")throw Error("待辦不存在或已刪除");
    const field=rule.updateField!;
    if(field==="completed"&&(task.task_repeat||task.task_plan))throw Error("週期待辦的完成狀態須手動更新");
    const desired=field==="completed"?rule.updateValue==="true":rule.updateValue!.trim();
    const persistence=new WorkspacePersistence(this.db);
    const value:Page={...task,[field]:desired,revision:task.revision+1,updated_at:Date.now()};
    await persistence.mutate(owner,[{type:"pages",kind:"save",value,automationField:field},receipt],
      [{type:"pages",id:task.id,revision:task.revision}]);
  }

  private async executeAutomation(occurrence:Reminder, action:(receipt:WorkspaceChange)=>Promise<void>) {
    const owner=this.owner();
    const previous=(await this.readAutomationRuns()).find(run=>run.id===occurrence.id);
    if(this.owner()!==owner)throw Error("帳號已切換");
    if(previous&&!previous.error)return;
    const data={id:occurrence.id,title:occurrence.title.slice(0,100),day:occurrence.day,at:Date.now()};
    try{
      await action(this.automationRunChange(owner,data));
    }catch(error){
      if(this.owner()!==owner)throw Error("帳號已切換");
      await new WorkspacePersistence(this.db).mutate(owner,[this.automationRunChange(owner,{
        ...data,at:Date.now(),error:(error instanceof Error?error.message.slice(0,240):"")||"執行失敗",
      })]);
      throw error;
    }
  }

  private async runTaskAutomation(occurrence:Reminder,receipt:WorkspaceChange) {
    const owner=this.owner();
    const hash=await automationScheduleId(JSON.stringify([owner,"task",occurrence.id]));
    if(this.owner()!==owner)throw Error("帳號已切換");
    if(!occurrence.title.trim()||occurrence.title.length>100)throw Error("請確認待辦名稱");
    const due=new Date(occurrence.day+"T00:00:00").getTime();
    if(!Number.isFinite(due))throw Error("請確認待辦日期");
    const now=Date.now();
    const id="automation_task_"+hash.slice("automation:".length);
    const value:Page={
      id,kind:"todo",title:occurrence.title,due_date:due,completed:false,format:"flow",
      content_json:{type:"doc",content:[{type:"paragraph",attrs:{id:"blk_"+id}}]},content_text:"",
      created_at:now,updated_at:now,deleted_at:null,revision:1,device_id:"automation",workspace_owner_id:owner,
    };
    await new WorkspacePersistence(this.db).mutate(owner,[{type:"pages",kind:"save",value,createOnce:true},receipt]);
  }

  async runScheduleAutomation(occurrence:Reminder,receipt?:WorkspaceChange) {
    const owner=this.owner();
    // Keep existing occurrence identifiers so rules created before this change remain deduplicated.
    const id=await automationScheduleId(occurrence.id);
    if(this.owner()!==owner)throw Error("帳號已切換");
    const date=Date.parse(occurrence.day+"T00:00:00Z");
    const value:ScheduleEvent={id,workspace_owner_id:owner,revision:0,created_at:date,updated_at:date,
      deleted_at:null,title:occurrence.title,starts_at:date,ends_at:date,all_day:true,category:"自動化",notes:""};
    await new WorkspacePersistence(this.db).mutate(owner,[
      {type:"life_schedule_events",kind:"save",value,createOnce:true},
      ...(receipt?[receipt]:[]),
    ]);
  }

  async readTaskExecutions(): Promise<TaskExecution[]> {
    const owner = this.owner();
    const rows = await this.db.getAll("life_task_executions") as TaskExecution[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return rows.filter(row => row.workspace_owner_id === owner && row.deleted_at == null);
  }

  async saveTaskExecution(task: Page, slot: TaskSlot, status: TaskStatus, amount: number, completedAt?:number) {
    const owner = this.owner();
    if (!task.task_plan || (task.workspace_owner_id ?? null) !== owner) throw Error("找不到此任務");
    const value = makeExecution(task, slot, status, amount, Date.now(), completedAt);
    if (slot.record?.status === status && slot.record.amount === value.amount && (completedAt==null||slot.record.completed_at===value.completed_at)) return;
    const saved = await this.db.get("pages",task.id) as Page | undefined;
    if (!saved || (saved.workspace_owner_id??null)!==owner || this.owner()!==owner || saved.deleted_at!=null
      || !sameTaskData(saved.task_plan,task.task_plan)) throw Error("任務設定已變更，請重新開啟");
    await new WorkspacePersistence(this.db).mutate(owner,[{type:"life_task_executions",kind:"save",value}],
      [{type:"pages",id:task.id,revision:saved.revision}]);
  }

  async readHabits(): Promise<Habit[]> {
    const owner = this.owner();
    const habits = await this.db.getAll("life_habits") as Habit[];
    if (this.owner() !== owner) throw Error("帳號已切換");
    return habits.filter(habit => habit.workspace_owner_id === owner && habit.deleted_at == null)
      .sort((a, b) => a.created_at - b.created_at || a.id.localeCompare(b.id));
  }

  async adoptHabit(habit: Habit): Promise<Page> {
    const owner=this.owner();
    if (habit.workspace_owner_id!==owner) throw Error("帳號已切換");
    const existing=await this.db.get("pages",habit.id) as Page|undefined;
    if (existing?.task_plan?.legacyHabitId===habit.id && (existing.workspace_owner_id??null)===owner) return existing;
    if (existing) throw Error("原有習慣的識別碼已被另一筆任務使用");
    const {plan,records}=convertHabit(habit);
    const value:Page={
      id:habit.id,kind:"todo",title:habit.title,format:"flow",content_json:{type:"doc",content:[{type:"paragraph"}]},content_text:"",
      created_at:habit.created_at,updated_at:Date.now(),deleted_at:null,revision:1,device_id:"life",
      workspace_owner_id:owner,completed:false,task_plan:plan,
    };
    const changes:WorkspaceChange[]=[{type:"pages",kind:"save",value,createOnce:true},
      ...records.map(row=>({type:"life_task_executions" as const,kind:"save" as const,value:row,createOnce:true}))];
    if (this.owner()!==owner) throw Error("帳號已切換");
    await new WorkspacePersistence(this.db).mutate(owner,changes,[{type:"life_habits",id:habit.id,revision:habit.revision}]);
    return await this.db.get("pages",habit.id) as Page;
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

  async editRecurringFinance(series: FinanceRecord<"subscription">, payload: FinanceRecord<"subscription">["payload"],
    date: string, scope: "single" | "future" | "all") {
    const owner = this.owner();
    if (series.workspace_owner_id !== owner || date < series.payload.next || series.payload.until && date > series.payload.until) {
      throw Error("此期週期交易已處理或超出系列");
    }
    if (scope === "single") {
      const { title, notes, currency, amount, account, category, type, target, targetAmount } = payload;
      await this.saveFinance({ ...series, payload: {
        ...series.payload, overrides: { ...series.payload.overrides, [date]: { title, notes, currency, amount, account, category, type, target, targetAmount } },
      } });
      return;
    }
    if (scope === "all" || date === series.payload.next) {
      await this.saveFinance({ ...series, payload: { ...payload, skipped: series.payload.skipped, overrides: series.payload.overrides } });
      return;
    }
    const earlier = Object.entries(series.payload.overrides ?? {}).filter(([key]) => key < date);
    const later = Object.entries(series.payload.overrides ?? {}).filter(([key]) => key >= date);
    const previous = { ...series, updated_at: Date.now(), payload: {
      ...series.payload, until: civilAdvance(date, "day", -1), skipped: series.payload.skipped?.filter(day => day < date), overrides: Object.fromEntries(earlier),
    } };
    const next = financeRow(owner, "subscription", {
      ...payload, skipped: series.payload.skipped?.filter(day => day >= date), overrides: Object.fromEntries(later),
    });
    await new WorkspacePersistence(this.db).mutate(owner, [
      { type: "life_finance_records", kind: "save", value: previous },
      { type: "life_finance_records", kind: "save", value: next, createOnce: true },
    ]);
  }

  async confirmSubscription(row: FinanceRecord<"subscription">, paidDate: string) {
    return this.resolveRecurringFinance(row, paidDate);
  }

  async skipRecurringFinance(row: FinanceRecord<"subscription">, date: string) {
    if (date === row.payload.next) return this.resolveRecurringFinance(row);
    if (date < row.payload.next || row.payload.state !== "active" || row.payload.until && date > row.payload.until) {
      throw Error("這筆週期交易目前無法跳過");
    }
    await this.saveFinance({ ...row, payload: { ...row.payload, skipped: [...new Set([...(row.payload.skipped ?? []), date])] } });
  }

  async resolveRecurringFinance(row: FinanceRecord<"subscription">, paidDate?: string) {
    const owner = this.owner();
    if (row.workspace_owner_id !== owner || row.payload.state !== "active" || row.payload.until && row.payload.next > row.payload.until) {
      throw Error("這筆週期交易目前無法處理");
    }
    const p = row.payload;
    const source = row.id + "|" + p.next;
    const txId = "subscription:" + source;
    const existing = await this.db.get("life_finance_records", txId);
    if (existing) throw Error("本期已入帳");
    if (this.owner() !== owner) throw Error("帳號已切換");
    let next = subscriptionNext(p);
    const alreadySkipped = new Set(p.skipped);
    while (alreadySkipped.has(next)) next = subscriptionNext({ ...p, next });
    const updated: FinanceRecord<"subscription"> = { ...row, updated_at: Date.now(), payload: {
      ...p, next, state: p.until && next > p.until ? "cancelled" : p.state,
      ...(!paidDate ? { skipped: [...new Set([...(p.skipped ?? []), p.next])] } : {}),
    } };
    const persistence = new WorkspacePersistence(this.db);
    if (!paidDate) {
      await persistence.mutate(owner, [{ type: "life_finance_records", kind: "save", value: updated }]);
      return;
    }
    const terms = recurringTerms(p, p.next);
    const transaction = financeRow(owner, "transaction", {
      title: terms.title, notes: terms.notes, type: terms.type ?? "expense", date: paidDate, amount: terms.amount, account: terms.account,
      target: terms.target ?? "", targetAmount: terms.targetAmount ?? "0", category: terms.category, source, attachment: "",
    }, txId);
    await persistence.mutate(owner, [
      { type: "life_finance_records", kind: "save", value: transaction, createOnce: true },
      { type: "life_finance_records", kind: "save", value: updated },
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
