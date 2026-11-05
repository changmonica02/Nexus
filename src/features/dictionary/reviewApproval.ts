import type {SupabaseClient} from '@supabase/supabase-js';
import type {DictionaryReview} from './revisionLifecycle';
export type ReviewFailureKind='permission'|'stale'|'conflict'|'invalid'|'network'|'unknown'|'refresh'|'busy'|'pending'|'changed';
export class ReviewFailure extends Error {
 readonly diagnostic:{rpc:string;message:string;code:string;details:string;hint:string};
 constructor(readonly kind:ReviewFailureKind,rpc:string,error:unknown){const e=error as {message?:unknown;code?:unknown;details?:unknown;hint?:unknown}|null;super(typeof e?.message==='string'?e.message:String(error));this.name='ReviewFailure';this.diagnostic={rpc,message:this.message,code:typeof e?.code==='string'?e.code:'',details:typeof e?.details==='string'?e.details:'',hint:typeof e?.hint==='string'?e.hint:''};}
}
export function reviewFailure(error:unknown,rpc='dictionary_review',override?:ReviewFailureKind):ReviewFailure {
 if(error instanceof ReviewFailure&&!override)return error;const e=error as {message?:string;code?:string;details?:string}|null,code=e?.code??'',message=e?.message??String(error);
 const kind=override??(/42501|PGRST30[123]/.test(code)||/admin required|permission denied|sign in|unauthorized/i.test(message)?'permission':/stale|revision conflict|preview changed/i.test(message)?'stale':/23503|23505/.test(code)||/identity|unpublished|target|conflict/i.test(message)?'conflict':/^22|23502|23514/.test(code)||/invalid|verification|inflection|sense|POS|content required/i.test(message)?'invalid':!code||/fetch|network|timeout|abort/i.test(message)?'network':'unknown');
 return new ReviewFailure(kind,rpc,error instanceof ReviewFailure?error.diagnostic:error);
}
export const reviewFailureText=(error:unknown,t:(key:string)=>string)=>t('approval.'+reviewFailure(error).kind);
/** The write receipt and uncertain attempt are local guards, never publishing authority. */
export class ReviewApproval {
 private attempt:{id:string;revision:number;entry_id:string;base_revision:number;committed:boolean}|null=null;
 private running=false;
 get blocked(){return this.attempt!==null;}
 async approve(client:Pick<SupabaseClient,'rpc'>,review:DictionaryReview){
  if(this.running)throw new ReviewFailure('busy','approve_dictionary_review','busy');if(this.attempt)throw new ReviewFailure('unknown','approve_dictionary_review','Check status before another write');
  this.running=true;this.attempt={id:review.id,revision:review.revision,entry_id:review.entry_id,base_revision:review.base_revision,committed:false};
  try{const {data,error}=await client.rpc('approve_dictionary_review',{review_uuid:review.id,expected_revision:review.revision,content_verified:true});if(error)throw error;this.attempt.committed=true;return data;}
  catch(error){const failure=reviewFailure(error,'approve_dictionary_review');if(!['network','unknown'].includes(failure.kind))this.attempt=null;throw failure;}
  finally{this.running=false;}
 }
 async check(client:Pick<SupabaseClient,'rpc'|'from'>):Promise<'committed'|'pending'|'changed'>{
  const attempt=this.attempt;if(!attempt)return 'pending';
  try{const [row,snapshot]=await Promise.all([client.from('dictionary_review_drafts').select('id,revision,state').eq('id',attempt.id).maybeSingle(),client.rpc('get_dictionary_ai_snapshot',{entry_uuid:attempt.entry_id})]);if(row.error)throw row.error;if(snapshot.error)throw snapshot.error;
   if(attempt.committed)return 'committed';
   if(row.data?.state==='active'&&row.data.revision===attempt.revision&&snapshot.data?.detail?.entry?.revision===attempt.base_revision){this.attempt=null;return 'pending';}
   // A missing Review alone cannot prove publication (it may have been discarded).
   return 'changed';
  }catch(error){throw reviewFailure(error,'get_dictionary_ai_snapshot','unknown');}
 }
}
