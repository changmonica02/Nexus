export function englishFront(text:string,direction:string|undefined):string|null {
 const value=text.trim();return direction==='en-zh'&&/[A-Za-z]/.test(value)&&/^[A-Za-z\s'’.,!?()\-–]+$/u.test(value)?value:null;
}
export type SpeechNotice=''|'speech.preparing'|'speech.notReady'|'speech.noVoice'|'speech.englishUnavailable'|'speech.blocked'|'speech.retry'|'speech.unsupported';
let activePlayback:{owner:symbol;stop:()=>void}|null=null;
/** One bounded attempt, with no learning-data dependency and no text diagnostics. */
export class StudySpeechPlayer {
 private readonly owner=Symbol('speech');private generation=0;private timers=new Set<ReturnType<typeof setTimeout>>();private detach:()=>void=()=>{};private engine:SpeechSynthesis|null=null;private utterance:SpeechSynthesisUtterance|null=null;
 constructor(private environment:{engine:()=>SpeechSynthesis|undefined;utterance:(text:string)=>SpeechSynthesisUtterance;visible:()=>boolean;notify:(notice:SpeechNotice)=>void;activated?:()=>boolean}){}
 stop(){this.generation++;this.timers.forEach(clearTimeout);this.timers.clear();this.detach();this.detach=()=>{};if(activePlayback?.owner===this.owner){activePlayback=null;try{this.engine?.cancel();}catch{}}this.utterance=null;}
 play(text:string,rate:number,manual=false){
  activePlayback?.stop();this.stop();const token=this.generation,engine=this.environment.engine();this.engine=engine??null;
  if(!engine){this.environment.notify('speech.unsupported');return;}
  activePlayback={owner:this.owner,stop:()=>this.stop()};try{engine.cancel();}catch{}const current=()=>activePlayback?.owner===this.owner&&this.generation===token&&this.environment.visible();
  const later=(fn:()=>void,ms:number)=>{const timer=setTimeout(()=>{this.timers.delete(timer);if(current())fn();},ms);this.timers.add(timer);return timer;};
  const fail=(notice:SpeechNotice)=>{if(!current())return;this.stop();this.environment.notify(notice);};
  let begun=false;
  const begin=(voice:SpeechSynthesisVoice|undefined,recovery=false)=>{
   if((begun&&!recovery)||!current())return;begun=true;this.detach();this.environment.notify('');
   try{
    const next=this.environment.utterance(text);if(voice)next.voice=voice;next.lang=voice?.lang??'en-US';next.rate=rate;this.utterance=next;
    let started=false;const isCurrent=()=>current()&&this.utterance===next;
    // A listed voice may still be unusable by Android's TTS engine. Invalidate
    // the old utterance before cancel (which can emit synchronous late events),
    // then let the engine resolve en-US itself. Never replay partially spoken text.
    const recover=()=>{
     if(!voice||started||!isCurrent())return false;
     this.utterance=null;clearTimeout(startup);this.timers.delete(startup);
     try{engine.cancel();}catch{}
     if(current())begin(undefined,true);
     return true;
    };
    const startup=later(()=>{if(!isCurrent()||started||engine.speaking)return;if(!recover())fail(recovery?'speech.retry':'speech.notReady');},8000);
    next.onstart=()=>{if(isCurrent()){started=true;clearTimeout(startup);this.environment.notify('');}};
    next.onend=()=>{if(isCurrent()){this.timers.forEach(clearTimeout);this.timers.clear();this.utterance=null;activePlayback=null;this.environment.notify('');}};
    next.onerror=event=>{if(!isCurrent())return;const error=event?.error;if(error==='canceled'||error==='interrupted'){this.stop();this.environment.notify('');return;}if(['voice-unavailable','language-unavailable','synthesis-unavailable','synthesis-failed'].includes(error)&&recover())return;fail(error==='not-allowed'?'speech.blocked':error==='language-unavailable'?'speech.englishUnavailable':error==='voice-unavailable'?'speech.noVoice':'speech.retry');};
    // Bound silent/hung engines too; an omitted onstart alone does not prove failure.
    later(()=>{if(isCurrent())fail('speech.retry');},Math.max(15000,Math.min(90000,text.length*200/Math.max(.5,rate)+10000)));
    const speak=()=>{if(isCurrent()){try{engine.resume();engine.speak(next);}catch{fail('speech.retry');}}};
    if(manual||this.environment.activated?.())speak();else later(speak,50);
   }catch{fail('speech.retry');}
  };
  const voices=()=>{try{return engine.getVoices();}catch{return [];}};
  const choose=(list:SpeechSynthesisVoice[])=>list.filter(v=>/^en(?:[-_]|$)/i.test(v.lang)).sort((a,b)=>Number(b.localService)-Number(a.localService)||Number(/^en[-_]us$/i.test(b.lang))-Number(/^en[-_]us$/i.test(a.lang)))[0];
  const check=()=>{if(begun||!current())return;const list=voices(),voice=choose(list);if(voice)begin(voice);};
  try{engine.resume();}catch{/* Continue to the actual speak result. */}
  const list=voices(),voice=choose(list);

  // Android 測試：不指定 voice，交由系統選擇 en-US
  if (typeof navigator !== 'undefined' &&
      /Android/i.test(navigator.userAgent)) {
    begin(undefined);
    return;
  }
  
  if(voice){begin(voice);return;}
  // On Android getVoices() may initially list only the system-language voices.
  // A manual tap must keep its transient user activation: request en-US directly
  // without selecting a known non-English voice or waiting for voiceschanged.
  if(manual&&!voice){begin(undefined);return;}
  this.environment.notify('speech.preparing');engine.addEventListener?.('voiceschanged',check);this.detach=()=>engine.removeEventListener?.('voiceschanged',check);
  for(const ms of [100,400,1000])later(check,ms);
  later(()=>{if(begun)return;const available=voices(),english=choose(available);if(english)begin(english);else begin(undefined);},1800);
 }
}
