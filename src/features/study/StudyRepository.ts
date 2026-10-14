import {defaultStudyStyle,defaultStyleId,validateStudyStyle,styleFromLegacy,hasLegacyOverrides,applyStyle,type StudyStyle} from './studyStyles';
import { makeScheduled, refreshScheduled, isUnintroduced, dailyNewUsed, dueAt, isShortStep, practiceCards } from "./scheduledStudy";
import type { IDBPDatabase, IDBPTransaction } from "idb";
import { QuizRepository, QUIZ_STORES } from "./quiz/quizPersistence";
import {cleanState, reliableEvent, type ScheduleCandidate} from "./studyReliability";
import type { Page } from "../../lib/types";
import { isLearned, isLegacyTestCard, makeSession, reconcileSession, selectSessionCards, type SessionMode, type StudySession } from "./studySessions";
import { localStudyDay, Rating } from "./studyFSRS";
import { createStudyEvent, emptyStudyState, migrateStudyDeck, nextDailyCard, sameStudyRecord,
  type Grade, type StudyBackup, type StudyCard, type StudyEvent, type StudyOperation,
  type StudySettings, type StudySnapshot, type StudyState } from "./studyFSRS";

export const STUDY_STORES = ["study_cards", "study_states", "study_events", "study_settings", "study_sessions", "study_outbox", "study_sync_meta"];
type Write = IDBPTransaction<unknown, string[], "readwrite">;
const newId = () => crypto.randomUUID();

/** Durable, account-scoped study operations. No React/debounce/page save dependency. */
export class StudyRepository {
  private quizRepository?: QuizRepository;
  getQuizRepository(): QuizRepository | null {
    if (!QUIZ_STORES.every(name=>this.db.objectStoreNames.contains(name))) return null;
    return this.quizRepository ??= new QuizRepository(this.db,this.owner);
  }
  constructor(private db: IDBPDatabase, private owner: () => string | null, private device: string) {}
  private owned(value: { owner_id: string | null } | undefined) {
    if (!value || value.owner_id !== this.owner()) throw new Error("字卡不存在或不屬於目前帳號。");
  }
  private async enqueue(tx: Write, operation: Omit<StudyOperation, "id">) {
    await tx.objectStore("study_outbox").put({ ...operation, id: newId() });
  }
  private changed() {
    if (typeof window !== "undefined") window.dispatchEvent(new Event("nexus-study-changed"));
  }
  async ensureDeck(page: Page): Promise<StudySnapshot> {
    if ((page.workspace_owner_id ?? null) !== this.owner()) throw new Error("學習集帳號不符。");
    const tx = this.db.transaction(STUDY_STORES, "readwrite", {durability:"strict"});
    try {
    const existing = await tx.objectStore("study_settings").get(page.id);
    if (!existing) {
      if(page.official_pack_id)throw new Error('正在同步官方學習集，請稍後再試。');
      const migrated = migrateStudyDeck(page, Date.now());
      for (const card of migrated.cards) {
        await tx.objectStore("study_cards").put(card);
        await this.enqueue(tx, { owner_id: this.owner(), kind: "card", value: card, initial: true });
      }
      for (const state of migrated.states) {
        await tx.objectStore("study_states").put(state);
        await this.enqueue(tx, { owner_id: this.owner(), kind: "seed", value: state });
      }
      await tx.objectStore("study_settings").put(migrated.settings);
      await this.enqueue(tx, { owner_id: this.owner(), kind: "settings", value: migrated.settings, initial: true });
    } else this.owned(existing);
    // Explicitly requested reset of four legacy test cards. Preserve content, snapshots and all history.
    const deckCards: StudyCard[] = await tx.objectStore("study_cards").index("deck").getAll(page.id);
    for (const card of deckCards.filter(isLegacyTestCard)) {
      const state: StudyState = await tx.objectStore("study_states").get(card.id);
      if (!state.legacy_test_reset) {
        const event = createStudyEvent(card, {...state,conflict:false}, "reset", Date.now(), this.device, newId());
        event.before = state; event.source = "legacy_test_reset";
        event.after.legacy_test_reset = true;
        await this.persistEvent(tx,event);
      }
    }
    await tx.done;
    return this.readDeck(page.id,false);
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  async readDeck(deckId: string, includeHistory = false): Promise<StudySnapshot> {
    const tx = this.db.transaction(STUDY_STORES, "readonly");
    const settings: StudySettings = await tx.objectStore("study_settings").get(deckId);
    this.owned(settings);
    const [cards, states, events, sessions] = await Promise.all([
      tx.objectStore("study_cards").index("deck").getAll(deckId),
      tx.objectStore("study_states").index("deck").getAll(deckId),
      includeHistory ? tx.objectStore("study_events").index("deck").getAll(deckId) : Promise.resolve([]),
      tx.objectStore("study_sessions").getAll(),
    ]);
    await tx.done;
    return { settings, sessions: sessions.filter(s=>s.owner_id===this.owner() && s.deck_id===deckId), cards: cards.filter(c => c.owner_id === this.owner()).sort((a,b) => a.sort_order - b.sort_order),
      states: states.filter(s => s.owner_id === this.owner()), events: events.filter(e => e.owner_id === this.owner()).sort((a,b) => a.at - b.at || a.id.localeCompare(b.id)) };
  }
  async addCards(deckId: string, pairs: {front: string; back: string; dictionary_entry_id?:string}[], requestId = newId()) {
    const tx = this.db.transaction(STUDY_STORES, "readwrite", {durability:"strict"});
    try {
    const settings=await tx.objectStore("study_settings").get(deckId);this.owned(settings);
    if(settings.official_pack_id)throw new Error('官方單字集不可直接新增或匯入字卡。');
    const receiptKey=JSON.stringify([this.owner(),"create",requestId]);
    const receipt=await tx.objectStore("study_sync_meta").get(receiptKey);
    if(receipt){if(receipt.deckId!==deckId || !sameStudyRecord(receipt.pairs,pairs))throw new Error("建立請求 ID 的內容不一致。");const result=await Promise.all(receipt.ids.map((id:string)=>tx.objectStore("study_cards").get(id)));if(result.some(c=>!c||c.deleted_at))throw new Error('此建立請求的字卡已刪除，請開始新的建立操作。');await tx.done;return result as StudyCard[];}
    const existing: StudyCard[] = await tx.objectStore("study_cards").index("deck").getAll(deckId);
    const first = Math.max(-1, ...existing.map(card => card.sort_order)) + 1;
    const added:StudyCard[]=[];
    for (const [i, pair] of pairs.entries()) {
      const now = Date.now();
      const card: StudyCard = { id: newId(), deck_id: deckId, owner_id: this.owner(), front: pair.front, back: pair.back,
        direction: "en-zh", sort_order: first + i, content_revision: 1, created_at: now, updated_at: now, deleted_at: null, ...(pair.dictionary_entry_id?{dictionary_entry_id:pair.dictionary_entry_id}:{}) };
      added.push(card);
      const state = emptyStudyState(card);
      await tx.objectStore("study_cards").add(card);
      await tx.objectStore("study_states").add(state);
      await this.enqueue(tx, {owner_id: this.owner(),kind:"card",value:card});
      await this.enqueue(tx, {owner_id: this.owner(),kind:"seed",value:state});
    }
    await tx.objectStore("study_sync_meta").put({id:receiptKey,owner_id:this.owner(),deckId,pairs,ids:added.map(c=>c.id)});
    await tx.done; this.changed();return added;
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  private async persistEvent(tx: Write, event: StudyEvent) {
    await tx.objectStore("study_events").add(event);
    await tx.objectStore("study_states").put(event.after);
    await this.enqueue(tx, {owner_id:this.owner(),kind:"event",value:event});
  }
  async updateCard(id: string, patch: Partial<Pick<StudyCard,"front"|"back"|"deleted_at"|"dictionary_entry_id">>, reset = false) {
    const tx = this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const card: StudyCard = await tx.objectStore("study_cards").get(id); this.owned(card);
    if(card.official_pack_id&&Object.keys(patch).some(k=>k!=='front'&&k!=='back'))throw new Error('官方字卡只能修改私人英文與中文內容。');
    const updated = {...card,...patch,migration_only:false,content_revision:card.content_revision+1,updated_at:Math.max(Date.now(),card.updated_at+1)};
    await tx.objectStore("study_cards").put(updated);
    await this.enqueue(tx,{owner_id:this.owner(),kind:"card",value:updated});
    if (reset) {
      const state: StudyState = await tx.objectStore("study_states").get(id);
      const event = createStudyEvent(updated, {...state,conflict:false}, "reset", Date.now(), this.device, newId());
      event.before = state;
      await this.persistEvent(tx,event);
    }
    await tx.done; this.changed();
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  async reorder(deckId: string, ids: string[]) {
    const tx = this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const setting: StudySettings = await tx.objectStore("study_settings").get(deckId); this.owned(setting);
    if (setting.sort_mode === "az") throw new Error("A–Z 模式不能手動排序。");
    const cards: StudyCard[] = await tx.objectStore("study_cards").index("deck").getAll(deckId);
    const active = cards.filter(c => !c.deleted_at);
    if (ids.length !== active.length || new Set(ids).size !== ids.length || active.some(c=>!ids.includes(c.id))) throw new Error("卡片清單已變更，請重新整理後排序。");
    for (const card of active) {
      this.owned(card);
      const updated = {...card,migration_only:false,sort_order:ids.indexOf(card.id),updated_at:Math.max(Date.now(),card.updated_at+1)};
      await tx.objectStore("study_cards").put(updated);
      await this.enqueue(tx,{owner_id:this.owner(),kind:"card",value:updated});
    }
    await tx.done; this.changed();
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  private async styleRecord(tx:Write,style:StudyStyle,initial=false){
    validateStudyStyle(style);
    const old:StudySettings|undefined=await tx.objectStore('study_settings').get(style.id);if(old){this.owned(old);if(old.record_type!=="style")throw Error("Style identity belongs to a study set");}
    const value:StudySettings={id:style.id,owner_id:this.owner(),schema:2,new_limit:20,direction_confirmed:true,configured:true,record_type:'style',style:structuredClone(style),updated_at:initial?0:Math.max(Date.now(),(old?.updated_at??0)+1)};
    await tx.objectStore('study_settings').put(value);await this.enqueue(tx,{owner_id:this.owner(),kind:'settings',value,...(initial?{initial:true}:{})});
  }
  private async effectiveStyle(tx:Write,settings:StudySettings):Promise<StudyStyle>{
    if(settings.record_type==='style')throw Error('Style record is not a study set');
    let defaultRecord:StudySettings|undefined=await tx.objectStore('study_settings').get(defaultStyleId(this.owner()));
    if(!defaultRecord){await this.styleRecord(tx,defaultStudyStyle(this.owner()),true);defaultRecord=await tx.objectStore('study_settings').get(defaultStyleId(this.owner()));}
    this.owned(defaultRecord);
    if(!settings.style_version&&hasLegacyOverrides(settings)){
      const migrated=styleFromLegacy(settings);const existing:StudySettings|undefined=await tx.objectStore('study_settings').get(migrated.id);
      if(!existing)await this.styleRecord(tx,migrated);else this.owned(existing);
      const updated={...settings,style_id:migrated.id,style_version:1 as const,style_migration_notice:true,configured:true,updated_at:Math.max(Date.now(),settings.updated_at+1)};
      await tx.objectStore('study_settings').put(updated);await this.enqueue(tx,{owner_id:this.owner(),kind:'settings',value:updated});Object.assign(settings,updated);
    }
    const selected:StudySettings|undefined=settings.style_id?await tx.objectStore('study_settings').get(settings.style_id):defaultRecord;
    if(!selected?.style)throw Error('Assigned study style is missing; sync or restore it before learning');
    this.owned(selected);validateStudyStyle(selected.style);return structuredClone(selected.style);
  }
  async listStyles():Promise<StudyStyle[]>{return this.sessionWrite(async tx=>{
    const id=defaultStyleId(this.owner());if(!await tx.objectStore('study_settings').get(id))await this.styleRecord(tx,defaultStudyStyle(this.owner()),true);
    return (await tx.objectStore('study_settings').getAll()).filter((s:StudySettings)=>s.owner_id===this.owner()&&s.record_type==='style').map((s:StudySettings)=>{validateStudyStyle(s.style!);return s.style!;});
  },false);}
  async saveStyle(style:StudyStyle){if(!style.id.startsWith('study-style:'))throw Error('Invalid style identity');return this.sessionWrite(tx=>this.styleRecord(tx,style));}
  async styleForDeck(deckId:string){return this.sessionWrite(async tx=>{const settings:StudySettings=await tx.objectStore('study_settings').get(deckId);this.owned(settings);return {style:await this.effectiveStyle(tx,settings),notice:settings.style_migration_notice??false};},false);}
  async assignStyle(deckId:string,styleId:string){return this.sessionWrite(async tx=>{
    const settings:StudySettings=await tx.objectStore('study_settings').get(deckId);this.owned(settings);
    const record:StudySettings=await tx.objectStore('study_settings').get(styleId);this.owned(record);validateStudyStyle(record.style!);
    const value={...settings,style_id:styleId,style_version:1 as const,style_migration_notice:false,configured:true,updated_at:Math.max(Date.now(),settings.updated_at+1)};
    await tx.objectStore('study_settings').put(value);await this.enqueue(tx,{owner_id:this.owner(),kind:'settings',value});
  });}
  async configure(deckId: string, patch: Partial<Pick<StudySettings,"new_limit"|"direction_confirmed"|"review_limit"|"new_pause_threshold"|"sort_mode"|"quiz_direction"|"study_mode"|"card_order"|"review_order">>) {
    if (patch.study_mode != null && !["scheduled","endless"].includes(patch.study_mode)) throw new Error("無效學習模式。");
    if (patch.card_order != null && !["new-first","mixed","review-first"].includes(patch.card_order)) throw new Error("無效出卡順序。");
    if (patch.review_order != null && !["due","retrievability","random"].includes(patch.review_order)) throw new Error("無效複習排序。");
    if (patch.quiz_direction != null && !["zh-en","en-zh"].includes(patch.quiz_direction)) throw new Error("無效測驗方向。");
    if (patch.new_limit != null && (!Number.isInteger(patch.new_limit) || patch.new_limit < 0 || patch.new_limit > 10000)) throw new Error("每日新字數須為 0–10000 的整數。");
    if (patch.new_pause_threshold != null && (!Number.isInteger(patch.new_pause_threshold) || patch.new_pause_threshold < 1 || patch.new_pause_threshold > 10000)) throw new Error("暫停新卡門檻須為 1–10000 的整數。");
    if (patch.review_limit != null && (!Number.isInteger(patch.review_limit) || patch.review_limit < 1 || patch.review_limit > 10000)) throw new Error("單次複習數量須為 1–10000 的整數。");
    if (patch.sort_mode != null && !["custom","az"].includes(patch.sort_mode)) throw new Error("無效排序模式。");
    const tx=this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const setting:StudySettings=await tx.objectStore("study_settings").get(deckId);this.owned(setting);
    const updated={...setting,...patch,configured:true,updated_at:Math.max(Date.now(),setting.updated_at+1)};
    if(['new_limit','review_limit','new_pause_threshold','study_mode','card_order','review_order'].some(k=>k in patch)){
      const current=await this.effectiveStyle(tx,setting);const preserved={...current,...Object.fromEntries(Object.entries(patch).filter(([k])=>['new_limit','review_limit','new_pause_threshold','study_mode','card_order','review_order'].includes(k))),id:styleFromLegacy(updated).id,name:`移轉設定 · ${deckId}`} as StudyStyle;
      await this.styleRecord(tx,preserved);Object.assign(updated,{style_id:preserved.id,style_version:1,style_migration_notice:true});
    }
    await tx.objectStore("study_settings").put(updated);
    await this.enqueue(tx,{owner_id:this.owner(),kind:"settings",value:updated});
    await tx.done;this.changed();
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  private async dayIntroductions(deckId:string,now:number,transaction?:Write):Promise<StudyEvent[]> {
    const tx=transaction??this.db.transaction(['study_events']);const store=tx.objectStore('study_events');
    const day=localStudyDay(now);
    if(store.indexNames.contains('deck_day'))return (await store.index('deck_day').getAll([deckId,day])).filter((e:StudyEvent)=>e.owner_id===this.owner()&&e.kind==='introduce');
    // Compatibility for old external/test adapters; current IndexedDB uses the day index.
    const values:StudyEvent[]=[];let cursor=await store.index('deck').openCursor(deckId);
    while(cursor){const e=cursor.value;if(e.owner_id===this.owner()&&e.local_day===day&&e.kind==='introduce')values.push(e);cursor=await cursor.continue();}
    return values;
  }
  async readScheduledDeck(deckId:string, now=Date.now()):Promise<StudySnapshot> {
    return this.sessionWrite(async tx=>{const snapshot=await this.snapshotIn(tx,deckId);snapshot.events=await this.dayIntroductions(deckId,now,tx);return snapshot;},false);
  }
  async peekNext(deckId:string,now:number):Promise<{card:StudyCard;state:StudyState}|null> {
    const snapshot=await this.readDeck(deckId,false);
    snapshot.events=await this.dayIntroductions(deckId,now);
    const card=nextDailyCard(snapshot,now);
    return card?{card,state:snapshot.states.find(state=>state.id===card.id)!}:null;
  }
  /** Confirm the rendered question. Merely selecting/preloading it cannot consume quota. */
  async presentNext(deckId: string, now: number, expectedId?:string): Promise<{card:StudyCard;state:StudyState}|null> {
    const tx=this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const settings:StudySettings=await tx.objectStore("study_settings").get(deckId);this.owned(settings);
    const cards=await tx.objectStore("study_cards").index("deck").getAll(deckId);
    const states=await tx.objectStore("study_states").index("deck").getAll(deckId);
    const events=await this.dayIntroductions(deckId,now,tx);
    const card=nextDailyCard({cards,states,events,settings},now);
    if(expectedId && card?.id!==expectedId) throw new Error("待練習清單已變更，請重新載入題目。");
    if (!card) {await tx.done;return null;}
    let state:StudyState=states.find(s=>s.id===card.id);
    const introduced=!state.fsrs && state.legacy_due_at == null && state.introduced_at == null;
    if (introduced) {
      const event=createStudyEvent(card,state,"introduce",now,this.device,newId());
      await this.persistEvent(tx,event);state=event.after;
    }
    await tx.done;if(introduced)this.changed();return {card,state};
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  async review(id: string, expectedHead: string|null, contentRevision: number, rating: Grade, eventId: string, now: number): Promise<StudyEvent> {
    const tx=this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const existing:StudyEvent|undefined=await tx.objectStore("study_events").get(eventId);
    if (existing) {
      this.owned(existing);
      if(existing.card_id!==id || existing.rating!==rating || existing.parent!==expectedHead || existing.content_revision!==contentRevision || existing.at!==now) throw new Error("重複事件 ID 的內容不一致。");
      await tx.done;return existing;
    }
    const card:StudyCard=await tx.objectStore("study_cards").get(id);this.owned(card);
    const state:StudyState=await tx.objectStore("study_states").get(id);
    if(card.deleted_at || card.content_revision!==contentRevision || state.head!==expectedHead) throw new Error("這張卡已在其他視窗變更；此作答尚未提交，請重新載入題目。");
    const event=createStudyEvent(card,state,"review",now,this.device,eventId,rating);
    await this.persistEvent(tx,event);
    await tx.done;this.changed();return event;
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  private async sessionWrite<T>(work: (tx: Write) => Promise<T>, notify = true): Promise<T> {
    const tx = this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try { const result=await work(tx); await tx.done; if(notify)this.changed(); return result; }
    catch(error) { try{tx.abort();}catch{} await tx.done.catch(()=>undefined); throw error; }
  }
  private async snapshotIn(tx: Write, deckId: string): Promise<StudySnapshot> {
    const settings:StudySettings=await tx.objectStore("study_settings").get(deckId); this.owned(settings);
    const [cards,states]=await Promise.all(["study_cards","study_states"].map(name=>tx.objectStore(name).index("deck").getAll(deckId)));
    const events:StudyEvent[]=[];
    return {settings:applyStyle(settings,await this.effectiveStyle(tx,settings)),cards,states,events};
  }
  private async saveSession(tx: Write, session: StudySession, event?: StudyEvent) {
    await tx.objectStore("study_sessions").put(session);
    if(event) await this.persistEvent(tx,event);
  }
  private async reconciled(tx: Write, session: StudySession, snapshot: StudySnapshot, now: number) {
    this.owned(session);
    if(session.conflict) throw new Error("此練習有跨裝置進度衝突，已保留本機進度，請先同步處理。");
    for(const target of session.targets) {
      if(target.official_rating===undefined && target.official_event_id) {
        const event=await tx.objectStore("study_events").get(target.official_event_id);
        if(event)snapshot.events.push(event);
      }
    }
    if(session.mode==="scheduled"){
      if(!session.settings_snapshot){const original:StudySettings=await tx.objectStore("study_settings").get(session.deck_id);session.settings_snapshot={...styleFromLegacy(original),review_limit:session.quota_limit??original.review_limit??50,study_mode:session.study_mode??original.study_mode??"scheduled",scheduling_method:"fsrs"};session.compatibility_notice=true;}
      validateStudyStyle(session.settings_snapshot);snapshot.settings=applyStyle(snapshot.settings,session.settings_snapshot);
    }
    if(session.mode==="scheduled") snapshot.events=await this.dayIntroductions(session.deck_id,now,tx);
    const next=session.mode==="scheduled"?refreshScheduled(session,snapshot,now):reconcileSession(session,snapshot,now);
    if(!sameStudyRecord(next,session)) {
      next.revision++; next.updated_at=Math.max(now,session.updated_at+1);
      await this.saveSession(tx,next);
    }
    return next;
  }
  async startSession(deckId: string, mode: SessionMode, now = Date.now()): Promise<StudySession> {
    return this.sessionWrite(async tx=>{
      const snapshot=await this.snapshotIn(tx,deckId);
      if(!snapshot.settings.direction_confirmed) throw new Error("請先確認字卡方向為英 → 中。");
      const sessions:StudySession[]=(await tx.objectStore("study_sessions").getAll()).filter(s=>s.owner_id===this.owner() && s.deck_id===deckId);
      const unfinished=sessions.filter(s=>s.mode===mode && s.completed_at==null).sort((a,b)=>a.started_at-b.started_at)[0];
      if(unfinished) return this.reconciled(tx,unfinished,snapshot,now);
      if(mode==="scheduled") {
        snapshot.events=await this.dayIntroductions(deckId,now,tx);
        const session=makeScheduled(snapshot,now,newId());session.settings_snapshot=structuredClone(snapshot.settings.style!);
        await this.saveSession(tx,session);
        return session;
      }
      let batch:StudySession|undefined;
      let cards:StudyCard[];
      if(mode==="daily") {
        const batchId=JSON.stringify(["daily-batch",deckId,localStudyDay(now)]);
        batch=sessions.find(s=>s.id===batchId);
        if(!batch) {
          batch=makeSession(snapshot,"batch",selectSessionCards(snapshot,"daily",now),now,batchId);
          await this.saveSession(tx,batch);
        }
        // The batch IDs are fixed. A new session binds to the current generation after a reset.
        cards=batch.targets.flatMap(t=>snapshot.cards.filter(c=>c.id===t.card_id && !c.deleted_at));
      } else cards=selectSessionCards(snapshot,"free",now);
      const session=makeSession(snapshot,mode,cards,now,newId(),batch?.id);
      await this.saveSession(tx,session);
      return session;
    });
  }
  async readSession(id:string,now=Date.now()):Promise<{session:StudySession;snapshot:StudySnapshot}> {
    return this.sessionWrite(async tx=>{
      const value:StudySession=await tx.objectStore("study_sessions").get(id);this.owned(value);
      const snapshot=await this.snapshotIn(tx,value.deck_id);
      const session=await this.reconciled(tx,value,snapshot,now);
      return {session,snapshot};
    },false);
  }
  async presentScheduled(sessionId:string, now=Date.now()):Promise<{session:StudySession;snapshot:StudySnapshot}> {
    let introduced=false;
    const result=await this.sessionWrite(async tx=>{
      const saved:StudySession=await tx.objectStore("study_sessions").get(sessionId);this.owned(saved);
      if(saved.mode!=="scheduled")throw new Error("非正式排程 Session。");
      const snapshot=await this.snapshotIn(tx,saved.deck_id);
      const session=await this.reconciled(tx,saved,snapshot,now);
      const id=session.queue[0];
      const card=snapshot.cards.find(c=>c.id===id), state=snapshot.states.find(s=>s.id===id);
      if(card && state && isUnintroduced(state)) {
        if(dailyNewUsed(snapshot,now)>=snapshot.settings.new_limit)throw new Error("今日新卡額度已用完。");
        const event=createStudyEvent(card,state,"introduce",now,this.device,newId(),null,"scheduled");
        event.session_id=session.id;
        await this.persistEvent(tx,event);introduced=true;
        snapshot.states=snapshot.states.map(s=>s.id===id?event.after:s);
        snapshot.events.push(event);
      }
      return {session,snapshot};
    },false);
    if(introduced)this.changed();
    return result;
  }
  async rateSession(input:{sessionId:string;cardId:string;revision:number;contentRevision:number;expectedHead:string|null;rating:Grade;actionId:string;now:number}):Promise<StudySession> {
    return this.sessionWrite(async tx=>{
      const {sessionId,cardId,rating,actionId,now}=input;
      if(![1,2,3,4].includes(rating)) throw new Error("無效評分。");
      const saved:StudySession=await tx.objectStore("study_sessions").get(sessionId);this.owned(saved);
      if(saved.last_action_id===actionId) return saved;
      const snapshot=await this.snapshotIn(tx,saved.deck_id);
      const session=await this.reconciled(tx,saved,snapshot,now);
      if((session.mode==="batch" || session.mode==="practice") || session.completed_at!=null || session.revision!==input.revision || session.queue[0]!==cardId) throw new Error("練習進度已變更，請重新載入本次練習。");
      const card=snapshot.cards.find(c=>c.id===cardId)!;
      const state=snapshot.states.find(s=>s.id===cardId)!;
      if(state.conflict || state.head!==input.expectedHead || card.content_revision!==input.contentRevision || !card.front.trim() || !card.back.trim()) throw new Error("字卡或排程已變更，請重新載入題目。");
      const target=session.targets.find(t=>t.card_id===cardId)!;
      target.attempts=(target.attempts??0)+1;
      let event:StudyEvent|undefined;
      if(session.mode==="scheduled") {
        if(isUnintroduced(state))throw new Error("請先正式呈現新卡。");
        if(dueAt(state,now)>now && !(session.study_mode==="endless" && target.early_review && !target.official_event_id))throw new Error("此卡尚未到期。");
        event=createStudyEvent(card,state,"review",now,this.device,newId(),rating,"scheduled",session.settings_snapshot);
        event.session_id=session.id;event.session_rating=rating;
        target.official_event_id=event.id;target.official_rating=rating;
        // Every genuine answer is scheduled; only a future non-intraday state finishes this target.
        if(!isShortStep(event.after,now))target.easy_at=now;
        session.answers++;session.revision++;session.last_action_id=actionId;
        session.updated_at=Math.max(now,session.updated_at+1);
        snapshot.states=snapshot.states.map(s=>s.id===cardId?event!.after:s);
        const next=refreshScheduled(session,snapshot,now);
        await this.saveSession(tx,next,event);
        return next;
      }
      if(session.mode==="free" && !isLearned(state)) throw new Error("此卡尚未學會，請先完成每日學習。");
      if(session.mode==="free" && !target.official_event_id) {
        event=createStudyEvent(card, state, "review", now, this.device, target.event_id, rating);
        event.before=structuredClone(state);
        event.session_id=session.id; event.source="free_review";
        event.session_rating=rating;
        target.official_event_id=event.id;
        target.official_rating=rating;
      } else if(session.mode==="daily" && rating===Rating.Easy && !isLearned(state)) {
        event=createStudyEvent(card, state, "introduce", now, this.device, target.event_id, null, "daily_learning");
        event.before=structuredClone(state);
        event.session_id=session.id; event.source="daily_learning";
        target.official_event_id=event.id;
      }
      const completed=rating===Rating.Easy || (session.mode==="free" && rating===Rating.Good);
      if(completed) target.easy_at=now;
      session.queue=session.queue.slice(1);
      if(!completed) session.queue.push(cardId);
      session.answers++; session.revision++; session.last_action_id=actionId;
      session.updated_at=Math.max(now,session.updated_at+1);
      if(!session.queue.length) session.completed_at=now;
      await this.saveSession(tx,session,event);
      return session;
    });
  }
  async startPractice(formalSessionId:string, now=Date.now()):Promise<StudySession> {
    return this.sessionWrite(async tx=>{
      const formal:StudySession=await tx.objectStore("study_sessions").get(formalSessionId);this.owned(formal);
      if(formal.mode!=="scheduled" || formal.completed_at==null || formal.study_mode!=="endless")throw new Error("請先完成無盡模式的正式學習批次。");
      const snapshot=await this.snapshotIn(tx,formal.deck_id);
      const existing:StudySession|undefined=(await tx.objectStore("study_sessions").getAll()).find(s=>s.owner_id===this.owner()&&s.deck_id===formal.deck_id&&s.mode==="practice"&&s.completed_at==null);
      if(existing)return this.reconciled(tx,existing,snapshot,now);
      const session=makeSession(snapshot,"practice",practiceCards(snapshot),now,newId());
      await this.saveSession(tx,session);return session;
    });
  }
  /** Isolated durable practice state: no event, state or outbox write. */
  async ratePractice(input:{sessionId:string;cardId:string;revision:number;contentRevision:number;rating:Grade;actionId:string;now:number}):Promise<StudySession> {
    return this.sessionWrite(async tx=>{
      const session:StudySession=await tx.objectStore("study_sessions").get(input.sessionId);this.owned(session);
      if(session.last_action_id===input.actionId)return session;
      if(session.mode!=="practice" || session.revision!==input.revision || session.queue[0]!==input.cardId || ![1,2,3,4].includes(input.rating))throw new Error("額外練習已變更，請重新載入。");
      const card:StudyCard=await tx.objectStore("study_cards").get(input.cardId);this.owned(card);
      if(card.deleted_at || card.content_revision!==input.contentRevision)throw new Error("字卡內容已變更，請重新載入。");
      session.targets.find(t=>t.card_id===input.cardId)!.attempts++;
      session.queue=[...session.queue.slice(1),input.cardId];session.answers++;session.revision++;
      session.last_action_id=input.actionId;session.updated_at=Math.max(input.now,session.updated_at+1);
      await this.saveSession(tx,session);return session;
    });
  }
  async syncCursor():Promise<number>{return (await this.db.get('study_sync_meta',JSON.stringify([this.owner(),'cursor'])))?.sequence??0;}
  async resolveSchedule(id:string,choice:'device'|'cloud'|'relearn') {
    return this.sessionWrite(async tx=>{
      const state:StudyState=await tx.objectStore('study_states').get(id);this.owned(state);
      const ambiguity=state.ambiguity;if(!ambiguity)throw new Error('請先同步取得最新候選排程。');
      const selected=choice==='device'?ambiguity.device:choice==='cloud'?ambiguity.cloud:null;
      if(choice!=='relearn'&&(!selected||!ambiguity.candidates.some(s=>sameStudyRecord(cleanState(s),cleanState(selected)))))throw new Error('此候選狀態尚未通過驗證。');
      await this.enqueue(tx,{owner_id:this.owner(),kind:'resolution',value:{id:newId(),owner_id:this.owner(),card_id:id,event_version:ambiguity.event_version,state_version:ambiguity.state_version,choice:selected,relearn:choice==='relearn'}});
      // Remain blocked until the guarded server transaction succeeds.
    });
  }
  async readHistory(deckId:string,limit=50):Promise<StudyEvent[]> {
    const setting=await this.db.get('study_settings',deckId);this.owned(setting);
    const tx=this.db.transaction('study_events');const store=tx.store;
    const indexed=store.indexNames.contains('deck_at');
    let cursor=await (indexed?store.index('deck_at'):store.index('deck')).openCursor(indexed?IDBKeyRange.bound([deckId,-Infinity],[deckId,Infinity]):IDBKeyRange.only(deckId),'prev');
    const events:StudyEvent[]=[];
    while(cursor&&events.length<limit){if(cursor.value.owner_id===this.owner()&&cursor.value.kind==='review')events.push(cursor.value);cursor=await cursor.continue();}
    await tx.done;return events;
  }
  async pending():Promise<StudyOperation[]> {
    return (await this.db.getAll("study_outbox")).filter(op=>op.owner_id===this.owner());
  }
  async acknowledge(id:string) { await this.db.delete("study_outbox",id); }
  async exportData():Promise<StudyBackup> {
    const tx=this.db.transaction(STUDY_STORES,"readonly");
    const [cards,states,events,settings,sessions]=await Promise.all(["study_cards","study_states","study_events","study_settings","study_sessions"].map(store=>tx.objectStore(store).getAll()));
    await tx.done;return {cards,states,events,settings,sessions};
  }
  /** Events are unioned by ID. Divergent heads are retained and marked, never overwritten silently. */
  async mergeRemote(data:StudyBackup, changes?:StudyChange[]) {
    const hasWorkspace=this.db.objectStoreNames.contains('workspace_sync_meta');
    const tx=this.db.transaction([...STUDY_STORES,...(hasWorkspace?['workspace_sync_meta']:[])],"readwrite",{durability:"strict"});
    try {
    const receivedCursor=changes?.length?Math.max(...changes.map(c=>c.sequence)):0;
    if(changes){
      const latest=new Map<string,StudyChange>();
      for(const change of changes){
        if(change.owner_id!==this.owner())throw new Error('同步帳號不符。');
        const key=JSON.stringify([this.owner(),change.entity,change.id]);
        if(!latest.has(key)||latest.get(key)!.sequence<change.sequence)latest.set(key,change);
      }
      const fresh:StudyChange[]=[];
      for(const [key,change] of latest){const known=await tx.objectStore('study_sync_meta').get(key);if(!known||known.sequence<change.sequence)fresh.push(change);}
      changes=fresh;
      const ids=(entity:string)=>new Set(fresh.filter(c=>c.entity===entity&&!c.deleted).map(c=>c.id));
      const cards=ids('study_cards'),states=ids('study_card_states'),events=ids('study_review_events'),settings=ids('study_deck_settings');
      data={...data,cards:data.cards.filter(c=>cards.has(c.id)),states:data.states.filter(c=>states.has(c.id)),events:data.events.filter(c=>events.has(c.id)),settings:data.settings.filter(c=>settings.has(c.id))};
    }
    if(hasWorkspace){
      const deleted=new Set<string>();
      const officialDecks=new Set([...data.cards.filter(c=>c.official_pack_id).map(c=>c.deck_id),...data.settings.filter(s=>s.official_pack_id).map(s=>s.id)]);
      for(const meta of await tx.objectStore('workspace_sync_meta').getAll())if(meta.owner_id===this.owner()&&meta.hard_deleted){const [,type,id]=JSON.parse(meta.id);if(type==='pages'&&(meta.official_deck_deleted||officialDecks.has(id)))deleted.add(id);}
      data={cards:data.cards.filter(c=>!deleted.has(c.deck_id)),states:data.states.filter(s=>!deleted.has(s.deck_id)),events:data.events.filter(e=>!deleted.has(e.deck_id)),settings:data.settings.filter(s=>!deleted.has(s.id)),sessions:data.sessions?.filter(s=>!deleted.has(s.deck_id))};
    }
    if(changes)for(const change of changes.filter(c=>c.deleted&&c.entity==='study_cards')){
      if(change.owner_id!==this.owner())throw new Error('同步帳號不符。');
      const card=await tx.objectStore('study_cards').get(change.id);
      if(card&&card.owner_id===this.owner())await tx.objectStore('study_cards').put({...card,deleted_at:card.deleted_at??Date.now()});
    }
    const affected=new Set(data.states.map(s=>s.id));
    for(const event of data.events) {
      this.owned(event);
      const existing=await tx.objectStore("study_events").get(event.id);
      if(existing && !sameStudyRecord(existing,event)) throw new Error("同一事件 ID 出現不同內容，已停止同步並保留本地紀錄。");
      if(!existing){await tx.objectStore("study_events").add(event);affected.add(event.card_id);}
    }
    for(const [store,values] of [["study_cards",data.cards],["study_settings",data.settings]] as const) {
      for(const value of values) {
        this.owned(value);
        if(store==='study_settings'&&(value as StudySettings).record_type==='style'){const record=value as StudySettings;validateStudyStyle(record.style!);if(record.style!.id!==record.id)throw Error('Style identity mismatch');}
        const local=await tx.objectStore(store).get(value.id);
        if(!local || local.updated_at<value.updated_at || (store==="study_cards" && local.migration_only) || (store==="study_settings" && !local.configured)) await tx.objectStore(store).put(value);
      }
    }
    const eventCache=new Map<string,StudyEvent|undefined>(data.events.map(e=>[e.id,e]));
    const findEvent=async(id:string)=>{if(!eventCache.has(id))eventCache.set(id,await tx.objectStore('study_events').get(id));return eventCache.get(id);};
    const descends = async (head:string|null, ancestor:string|null) => {
      const seen=new Set<string>();
      while(head && head!==ancestor && !seen.has(head)) {
        seen.add(head);const event=await findEvent(head);
        if(!event) return false;head=event.parent;
      }
      return head===ancestor;
    };
    if(changes)for(const change of changes){
      if(change.owner_id!==this.owner())throw new Error("同步帳號不符。");
      await tx.objectStore("study_sync_meta").put({id:JSON.stringify([this.owner(),change.entity,change.id]),owner_id:this.owner(),sequence:change.sequence,order_sequence:change.historical?0:change.sequence});
      if(change.decision)await tx.objectStore('study_sync_meta').put({id:JSON.stringify([this.owner(),'decision',change.decision.id]),owner_id:this.owner(),state:change.decision.state});
      if(change.entity==='study_review_events'){
        const key=JSON.stringify([this.owner(),'event-version',change.card_id]);
        const old=await tx.objectStore('study_sync_meta').get(key);
        await tx.objectStore('study_sync_meta').put({id:key,owner_id:this.owner(),sequence:Math.max(old?.sequence??0,change.sequence)});
      }
    }
    const unsent:StudyOperation[]=await tx.objectStore("study_outbox").getAll();
    for(const id of affected) {
      const remote=data.states.find(s=>s.id===id);
      if(remote)this.owned(remote);
      const local:StudyState|undefined=await tx.objectStore("study_states").get(id);
      const cardFacts=data.events.filter(e=>e.card_id===id);
      const parents=new Set(cardFacts.map(e=>e.parent));
      const facts=cardFacts.filter(e=>!parents.has(e.id));
      if(changes&&unsent.some(op=>op.kind==="event"&&op.value.card_id===id))continue;
      if(!changes){
        // Backup/legacy merge retains its conservative compatibility behavior.
        if(remote){if(!local || await descends(remote.head,local.head))await tx.objectStore('study_states').put(remote);
        else if(!await descends(local.head,remote.head)||remote.conflict)await tx.objectStore('study_states').put({...remote,conflict:true});}
        continue;
      }
      for(const head of [local?.head,remote?.head])if(head&&!facts.some(e=>e.id===head)){const event=await findEvent(head);if(event)facts.push(event);}
      const candidates:ScheduleCandidate[]=[];
      for(const [state,source] of [[local,'device'],[remote,'cloud'],...(local?.ambiguity?.candidates??[]).map(s=>[s,'event']),...facts.filter(e=>![local,remote].some(s=>s?.resolution_id&&s.head===e.id)).map(e=>[e.after,'event'])] as [StudyState|undefined,ScheduleCandidate['source']][]){
        if(!state)continue;
        const proof=state.resolution_id?await tx.objectStore('study_sync_meta').get(JSON.stringify([this.owner(),'decision',state.resolution_id])):null;
        const trustedDecision=proof?.state&&sameStudyRecord(cleanState(state),cleanState(proof.state));
        if(state.head&&!trustedDecision){const event=await findEvent(state.head);if(!event||!reliableEvent(event)||!sameStudyRecord(cleanState(state),cleanState(event.after)))continue;}
        const meta=state.head?await tx.objectStore('study_sync_meta').get(JSON.stringify([this.owner(),'study_review_events',state.head])):null;
        if(!candidates.some(c=>sameStudyRecord(cleanState(c.state),cleanState(state))))candidates.push({state:cleanState(state),sequence:meta?.order_sequence??0,source});
      }
      const tips:ScheduleCandidate[]=[];
      for(const c of candidates)if(!await Promise.all(candidates.map(d=>d.state.head!==c.state.head?descends(d.state.head,c.state.head):false)).then(r=>r.some(Boolean)))tips.push(c);
      // A recorded reset / guarded relearn begins an explicit epoch; old forks stay history,
      // not competing schedules. Never infer epochs from clocks or unproven generation numbers.
      if(new Set(tips.map(c=>c.state.generation)).size>1){
        let proven=-1;
        for(const candidate of tips){
          const state=candidate.state;
          const proof=state.resolution_id?await tx.objectStore('study_sync_meta').get(JSON.stringify([this.owner(),'decision',state.resolution_id])):null;
          if(proof?.state&&sameStudyRecord(cleanState(state),cleanState(proof.state)))proven=Math.max(proven,state.generation);
          let head=state.head;const seen=new Set<string>();
          while(head&&!seen.has(head)){seen.add(head);const e=await findEvent(head);if(!e||!reliableEvent(e))break;
            if(e.kind==='reset'&&e.after.generation===state.generation){proven=Math.max(proven,state.generation);break;}
            const prior=e.before.resolution_id?await tx.objectStore('study_sync_meta').get(JSON.stringify([this.owner(),'decision',e.before.resolution_id])):null;
            if(prior?.state&&prior.state.generation===state.generation&&sameStudyRecord(cleanState(e.before),cleanState(prior.state))){proven=Math.max(proven,state.generation);break;}
            head=e.parent;
          }
        }
        if(proven>=0)for(let n=tips.length-1;n>=0;n--)if(tips[n].state.generation<proven)tips.splice(n,1);
      }
      const evMeta=await tx.objectStore('study_sync_meta').get(JSON.stringify([this.owner(),'event-version',id]));
      const stateMeta=await tx.objectStore('study_sync_meta').get(JSON.stringify([this.owner(),'study_card_states',id]));
      // A non-conflicted server checkpoint can include a previous explicit decision.
      const decisionCheckpoint=remote && !remote.conflict && !!remote.resolution_id && candidates.some(c=>sameStudyRecord(c.state,cleanState(remote))) && (!local || local.head===remote.head || !await descends(local.head,remote.head));
      let next=decisionCheckpoint?cleanState(remote!):tips.length===1?cleanState(tips[0].state):null;
      const ambiguous=tips.length>1 && !decisionCheckpoint;

      if(ambiguous)next=null; // New SPEC: divergent facts require explicit recovery, never automatic policy selection.
      const decisionNeeded=!!next && (ambiguous || !!remote?.conflict || (!!remote&&!sameStudyRecord(cleanState(remote),next)));
      if(decisionNeeded){
        const value={id:newId(),owner_id:this.owner(),card_id:id,event_version:evMeta?.sequence??0,state_version:stateMeta?.sequence??0,choice:next,relearn:false};
        await this.enqueue(tx,{owner_id:this.owner(),kind:'resolution',value});
      }
      const base=next??local??remote;
      if(base)await tx.objectStore('study_states').put((next&&!decisionNeeded)?next:{...cleanState(base),conflict:true,ambiguity:{pending:decisionNeeded,device:local?cleanState(local):null,cloud:remote?cleanState(remote):null,candidates:tips.map(c=>c.state),event_version:evMeta?.sequence??0,state_version:stateMeta?.sequence??0}});
    }
    if(receivedCursor){const key=JSON.stringify([this.owner(),'cursor']);const previous=await tx.objectStore('study_sync_meta').get(key);await tx.objectStore('study_sync_meta').put({id:key,owner_id:this.owner(),sequence:Math.max(previous?.sequence??0,receivedCursor)});}
    const pending:StudyOperation[]=await tx.objectStore("study_outbox").getAll();
    for(const remote of data.sessions??[]) {
      this.owned(remote);
      // The REST tables are fetched in separate requests. Do not install a session checkpoint
      // from a newer cloud snapshot until its event AND scheduling state have also arrived.
      for(const target of remote.targets) {
        if(!target.official_event_id)continue;
        const event:StudyEvent|undefined=await tx.objectStore("study_events").get(target.official_event_id);
        const state:StudyState|undefined=await tx.objectStore("study_states").get(target.card_id);
        if(!event || event.session_id!==remote.id || event.card_id!==target.card_id || !state ||
          (!state.conflict && state.generation===target.generation && !await descends(state.head,event.id))) {
          throw new Error("雲端練習與排程正在更新，尚未套用不完整進度，請重新同步。");
        }
      }
      const local:StudySession|undefined=await tx.objectStore("study_sessions").get(remote.id);
      const unsynced=pending.some(op=>op.kind==="session"&&op.value.id===remote.id || op.session?.id===remote.id);
      if(!local || !unsynced && remote.revision>=local.revision) await tx.objectStore("study_sessions").put(remote);
      else if(!sameStudyRecord(local,remote) && remote.revision>=local.revision) await tx.objectStore("study_sessions").put({...local,conflict:true});
    }
    await tx.done;this.changed();
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
}

export interface StudyChange {owner_id:string;entity:string;id:string;card_id:string|null;sequence:number;deleted:boolean;historical?:boolean;decision?:{id:string;state:StudyState}|null;payload:unknown}
