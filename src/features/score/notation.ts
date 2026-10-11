import type {MusicalEvent,NotationType,Score,Tone} from './score';
export interface NotationAdapter {
  type:NotationType;label:string;defaultTone:Tone;
  describeEvent(event:MusicalEvent,metadata:Score['metadata']):string;
  // A future renderer can consume the same score without changing persistence.
  renderModel(score:Score):{trackId:string;measures:{id:string;events:{id:string;text:string}[]}[]}[];
}
const describe=(e:MusicalEvent)=>e.type==='rest'?'休止符':`${e.tone.kind==='degree'?`級數 ${e.tone.value}`:e.tone.step}${e.tone.accidental==='sharp'?'♯':e.tone.accidental==='flat'?'♭':''} · 音域 ${e.tone.octave}`;
function adapter(type:NotationType,label:string):NotationAdapter{return {type,label,defaultTone:type==='numbered'?{kind:'degree',value:1,octave:4,accidental:'natural'}:{kind:'pitch',step:'C',octave:4,accidental:'natural'},describeEvent:describe,renderModel:score=>score.tracks.map(t=>({trackId:t.id,measures:t.measures.map(m=>({id:m.id,events:m.events.map(e=>({id:e.id,text:describe(e)}))}))}))};}
export const notationAdapters:Record<NotationType,NotationAdapter>={numbered:adapter('numbered','簡譜'),staff:adapter('staff','五線譜'),guitar:adapter('guitar','吉他')};
