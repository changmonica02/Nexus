import {cleanPronunciation} from './retiredPronunciation';
export type DraftSaveStatus='pending'|'saving'|'saved'|'failed';
/** Serializes complete snapshots. A response only checkpoints the snapshot it saved. */
export class DraftAutosaveQueue<T> {
  private active:Promise<boolean>|null=null;
  private requested=false;
  composing=false;
  constructor(private options:{read:()=>T;dirty:()=>boolean;valid:(value:T)=>boolean;save:(value:T)=>Promise<T>;checkpoint:(sent:T,ack:T)=>void;status:(value:DraftSaveStatus,error?:unknown)=>void}){}
  flush():Promise<boolean>{
    this.requested=true;
    if(this.active)return this.active;
    this.active=(async()=>{
      while(this.requested){
        this.requested=false;
        if(this.composing){this.options.status('pending');return false;}
        if(!this.options.dirty()){this.options.status('saved');return true;}
        const sent=structuredClone(this.options.read());
        try{if(!this.options.valid(sent)){this.options.status('pending');return false;}}
        catch(error){this.options.status('pending',error);return false;}
        this.options.status('saving');
        try{const ack=await this.options.save(sent);this.options.checkpoint(sent,ack);}
        catch(error){this.options.status('failed',error);return false;}
        this.options.status(this.options.dirty()?'pending':'saved');
      }
      return !this.options.dirty();
    })().finally(()=>{this.active=null;});
    return this.active;
  }
  get saving(){return this.active!==null;}
}
/** Acknowledgement refreshes technical revisions only; it cannot replace newer input. */
export function draftRevisions<T extends Record<string,Record<string,unknown>[]>>(live:T,ack:T):T {
  return Object.fromEntries(Object.entries(live).map(([table,rows])=>[table,rows.map(row=>{
    const saved=ack[table]?.find(r=>r.id===row.id);return saved?.revision!==undefined?{...row,revision:saved.revision}:row;
  })])) as T;
}
/** Only an identical full stored candidate can acknowledge an unknown write result. */
export function draftContentSignature(value:unknown):string {
  return JSON.stringify(value,(key,v)=>{
    if(['pronunciations','dictionary_pronunciations'].includes(key)&&Array.isArray(v))v=v.map(row=>row&&typeof row==='object'?cleanPronunciation(row):row);
    if(['revision','updated_at','published_at','status','origin','row','proposed_ids'].includes(key))return undefined;
    if(['semantic_domain','semantic_subdomain','variants'].includes(key)&&v==null)return undefined;
    if(key==='word_segments'&&v===null)return undefined;
    if(Array.isArray(v)&&key!=='word_segments'&&key!=='variants'&&v.every(r=>r&&typeof r==='object'&&typeof r.id==='string'))return [...v].sort((a,b)=>a.id.localeCompare(b.id));
    return v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))):v;
  });
}
