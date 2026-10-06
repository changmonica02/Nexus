import type { IDBPDatabase, IDBPTransaction } from "idb";
import { QuizRepository, QUIZ_STORES } from "./quiz/quizPersistence";
import type { Page } from "../../lib/types";
import { isLearned, isLegacyTestCard, makeSession, reconcileSession, selectSessionCards, type SessionMode, type StudySession } from "./studySessions";
import { localStudyDay, Rating } from "./studyFSRS";
import { createStudyEvent, emptyStudyState, migrateStudyDeck, nextDailyCard, sameStudyRecord,
  type Grade, type StudyBackup, type StudyCard, type StudyEvent, type StudyOperation,
  type StudySettings, type StudySnapshot, type StudyState } from "./studyFSRS";

export const STUDY_STORES = ["study_cards", "study_states", "study_events", "study_settings", "study_sessions", "study_outbox"];
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
    return this.readDeck(page.id);
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  async readDeck(deckId: string): Promise<StudySnapshot> {
    const tx = this.db.transaction(STUDY_STORES, "readonly");
    const settings: StudySettings = await tx.objectStore("study_settings").get(deckId);
    this.owned(settings);
    const [cards, states, events, sessions] = await Promise.all([
      tx.objectStore("study_cards").index("deck").getAll(deckId),
      tx.objectStore("study_states").index("deck").getAll(deckId),
      tx.objectStore("study_events").index("deck").getAll(deckId),
      tx.objectStore("study_sessions").getAll(),
    ]);
    await tx.done;
    return { settings, sessions: sessions.filter(s=>s.owner_id===this.owner() && s.deck_id===deckId), cards: cards.filter(c => c.owner_id === this.owner()).sort((a,b) => a.sort_order - b.sort_order),
      states: states.filter(s => s.owner_id === this.owner()), events: events.filter(e => e.owner_id === this.owner()).sort((a,b) => a.at - b.at || a.id.localeCompare(b.id)) };
  }
  async addCards(deckId: string, pairs: {front: string; back: string}[]) {
    const tx = this.db.transaction(STUDY_STORES, "readwrite", {durability:"strict"});
    try {
    const settings=await tx.objectStore("study_settings").get(deckId);this.owned(settings);
    if(settings.official_pack_id)throw new Error('官方單字集不可直接新增或匯入字卡。');
    const existing: StudyCard[] = await tx.objectStore("study_cards").index("deck").getAll(deckId);
    const first = Math.max(-1, ...existing.map(card => card.sort_order)) + 1;
    for (const [i, pair] of pairs.entries()) {
      const now = Date.now();
      const card: StudyCard = { id: newId(), deck_id: deckId, owner_id: this.owner(), front: pair.front, back: pair.back,
        direction: "en-zh", sort_order: first + i, content_revision: 1, created_at: now, updated_at: now, deleted_at: null };
      const state = emptyStudyState(card);
      await tx.objectStore("study_cards").add(card);
      await tx.objectStore("study_states").add(state);
      await this.enqueue(tx, {owner_id: this.owner(),kind:"card",value:card});
      await this.enqueue(tx, {owner_id: this.owner(),kind:"seed",value:state});
    }
    await tx.done; this.changed();
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
  async updateCard(id: string, patch: Partial<Pick<StudyCard,"front"|"back"|"deleted_at">>, reset = false) {
    const tx = this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const card: StudyCard = await tx.objectStore("study_cards").get(id); this.owned(card);
    if(card.official_pack_id&&Object.keys(patch).length)throw new Error('官方字卡內容不可直接編輯。');
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
  async configure(deckId: string, patch: Partial<Pick<StudySettings,"new_limit"|"direction_confirmed"|"review_limit"|"sort_mode"|"quiz_direction">>) {
    if (patch.quiz_direction != null && !["zh-en","en-zh"].includes(patch.quiz_direction)) throw new Error("無效測驗方向。");
    if (patch.new_limit != null && (!Number.isInteger(patch.new_limit) || patch.new_limit < 0 || patch.new_limit > 10000)) throw new Error("每日新字數須為 0–10000 的整數。");
    if (patch.review_limit != null && (!Number.isInteger(patch.review_limit) || patch.review_limit < 1 || patch.review_limit > 10000)) throw new Error("自由複習數量須為 1–10000 的整數。");
    if (patch.sort_mode != null && !["custom","az"].includes(patch.sort_mode)) throw new Error("無效排序模式。");
    const tx=this.db.transaction(STUDY_STORES,"readwrite",{durability:"strict"});
    try {
    const setting:StudySettings=await tx.objectStore("study_settings").get(deckId);this.owned(setting);
    const updated={...setting,...patch,configured:true,updated_at:Math.max(Date.now(),setting.updated_at+1)};
    await tx.objectStore("study_settings").put(updated);
    await this.enqueue(tx,{owner_id:this.owner(),kind:"settings",value:updated});
    await tx.done;this.changed();
    } catch (error) {
      try { tx.abort(); } catch {}
      await tx.done.catch(() => undefined);
      throw error;
    }
  }
  async peekNext(deckId:string,now:number):Promise<{card:StudyCard;state:StudyState}|null> {
    const snapshot=await this.readDeck(deckId);
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
    const events=await tx.objectStore("study_events").index("deck").getAll(deckId);
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
      if(existing.card_id!==id || existing.rating!==rating) throw new Error("重複事件 ID 的內容不一致。");
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
    const [cards,states,events]=await Promise.all(["study_cards","study_states","study_events"].map(name=>tx.objectStore(name).index("deck").getAll(deckId)));
    return {settings,cards,states,events};
  }
  private async saveSession(tx: Write, session: StudySession, event?: StudyEvent) {
    await tx.objectStore("study_sessions").put(session);
    if(event) await this.persistEvent(tx,event);
  }
  private async reconciled(tx: Write, session: StudySession, snapshot: StudySnapshot, now: number) {
    this.owned(session);
    if(session.conflict) throw new Error("此練習有跨裝置進度衝突，已保留本機進度，請先同步處理。");
    const next=reconcileSession(session,snapshot,now);
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
  async rateSession(input:{sessionId:string;cardId:string;revision:number;contentRevision:number;expectedHead:string|null;rating:Grade;actionId:string;now:number}):Promise<StudySession> {
    return this.sessionWrite(async tx=>{
      const {sessionId,cardId,rating,actionId,now}=input;
      if(![1,2,3,4].includes(rating)) throw new Error("無效評分。");
      const saved:StudySession=await tx.objectStore("study_sessions").get(sessionId);this.owned(saved);
      if(saved.last_action_id===actionId) return saved;
      const snapshot=await this.snapshotIn(tx,saved.deck_id);
      const session=await this.reconciled(tx,saved,snapshot,now);
      if(session.mode==="batch" || session.completed_at!=null || session.revision!==input.revision || session.queue[0]!==cardId) throw new Error("練習進度已變更，請重新載入本次練習。");
      const card=snapshot.cards.find(c=>c.id===cardId)!;
      const state=snapshot.states.find(s=>s.id===cardId)!;
      if(state.conflict || state.head!==input.expectedHead || card.content_revision!==input.contentRevision || !card.front.trim() || !card.back.trim()) throw new Error("字卡或排程已變更，請重新載入題目。");
      const target=session.targets.find(t=>t.card_id===cardId)!;
      target.attempts=(target.attempts??0)+1;
      let event:StudyEvent|undefined;
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
  async mergeRemote(data:StudyBackup) {
    const hasWorkspace=this.db.objectStoreNames.contains('workspace_sync_meta');
    const tx=this.db.transaction([...STUDY_STORES,...(hasWorkspace?['workspace_sync_meta']:[])],"readwrite",{durability:"strict"});
    try {
    if(hasWorkspace){
      const deleted=new Set<string>();
      const officialDecks=new Set([...data.cards.filter(c=>c.official_pack_id).map(c=>c.deck_id),...data.settings.filter(s=>s.official_pack_id).map(s=>s.id)]);
      for(const meta of await tx.objectStore('workspace_sync_meta').getAll())if(meta.owner_id===this.owner()&&meta.hard_deleted){const [,type,id]=JSON.parse(meta.id);if(type==='pages'&&(meta.official_deck_deleted||officialDecks.has(id)))deleted.add(id);}
      data={cards:data.cards.filter(c=>!deleted.has(c.deck_id)),states:data.states.filter(s=>!deleted.has(s.deck_id)),events:data.events.filter(e=>!deleted.has(e.deck_id)),settings:data.settings.filter(s=>!deleted.has(s.id)),sessions:data.sessions?.filter(s=>!deleted.has(s.deck_id))};
    }
    for(const event of data.events) {
      this.owned(event);
      const existing=await tx.objectStore("study_events").get(event.id);
      if(existing && !sameStudyRecord(existing,event)) throw new Error("同一事件 ID 出現不同內容，已停止同步並保留本地紀錄。");
      if(!existing) await tx.objectStore("study_events").add(event);
    }
    for(const [store,values] of [["study_cards",data.cards],["study_settings",data.settings]] as const) {
      for(const value of values) {
        this.owned(value);
        const local=await tx.objectStore(store).get(value.id);
        if(!local || local.updated_at<value.updated_at || (store==="study_cards" && local.migration_only) || (store==="study_settings" && !local.configured)) await tx.objectStore(store).put(value);
      }
    }
    const descends = async (head:string|null, ancestor:string|null) => {
      const seen=new Set<string>();
      while(head && head!==ancestor && !seen.has(head)) {
        seen.add(head);const event:StudyEvent|undefined=await tx.objectStore("study_events").get(head);
        if(!event) return false;head=event.parent;
      }
      return head===ancestor;
    };
    for(const remote of data.states) {
      this.owned(remote);
      const local:StudyState|undefined=await tx.objectStore("study_states").get(remote.id);
      if(!local || await descends(remote.head,local.head)) await tx.objectStore("study_states").put(remote);
      else if(!await descends(local.head,remote.head) || remote.conflict) await tx.objectStore("study_states").put({...remote,conflict:true});
    }
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
