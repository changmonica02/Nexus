export const notationTypes=['numbered','staff','guitar'] as const;
export type NotationType=typeof notationTypes[number];
export const durations=['whole','half','quarter','eighth','sixteenth'] as const;
export type Duration=typeof durations[number];
export type Accidental='natural'|'sharp'|'flat';
export type Tone=({kind:'pitch';step:'C'|'D'|'E'|'F'|'G'|'A'|'B'}|{kind:'degree';value:1|2|3|4|5|6|7})&{octave:number;accidental:Accidental};
type EventBase={id:string;duration:Duration;tie?:{toEventId:string};extensions?:Record<string,unknown>};
export type MusicalEvent=(EventBase&{type:'note';tone:Tone})|(EventBase&{type:'rest'});
export interface Measure {id:string;events:MusicalEvent[];extensions?:Record<string,unknown>}
export interface Score {
  type:'nexus-score';version:1;
  metadata:{title:string;notationType:NotationType;tempo:number;timeSignature:{beats:number;beatUnit:2|4|8|16};keySignature:string;createdAt:number;updatedAt:number};
  tracks:{id:string;name:string;measures:Measure[];extensions?:Record<string,unknown>}[];
  // Reserved for versioned notation/export/playback additions, not three parallel models.
  extensions?:Record<string,unknown>;
}
const id=()=>crypto.randomUUID();
export function createScore(title='新樂譜',notationType:NotationType='numbered',now=Date.now()):Score{
  return {type:'nexus-score',version:1,metadata:{title,notationType,tempo:120,timeSignature:{beats:4,beatUnit:4},keySignature:'C major',createdAt:now,updatedAt:now},tracks:[{id:id(),name:'聲部 1',measures:[{id:id(),events:[]}]}]};
}
export function readScore(value:unknown):Score|null{
  if(!value||typeof value!=='object')return null;
  const s=value as Score,m=s.metadata;
  if(s.type!=='nexus-score'||s.version!==1||!m||typeof m.title!=='string'||!notationTypes.includes(m.notationType)||!Number.isFinite(m.tempo)||m.tempo<20||m.tempo>400||!Number.isInteger(m.timeSignature?.beats)||m.timeSignature.beats<1||m.timeSignature.beats>32||![2,4,8,16].includes(m.timeSignature.beatUnit)||typeof m.keySignature!=='string'||!Number.isFinite(m.createdAt)||!Number.isFinite(m.updatedAt)||!Array.isArray(s.tracks)||!s.tracks.length)return null;
  const ids=new Set<string>();const validId=(id:string)=>typeof id==='string'&&!!id&&!ids.has(id)&&!!ids.add(id);
  for(const t of s.tracks){if(!t||!validId(t.id)||typeof t.name!=='string'||!Array.isArray(t.measures)||!t.measures.length)return null;
    for(const bar of t.measures){if(!bar||!validId(bar.id)||!Array.isArray(bar.events))return null;
      for(const e of bar.events){if(!e||!validId(e.id)||!durations.includes(e.duration)||!['note','rest'].includes(e.type))return null;
        if(e.type==='note'){const p=e.tone;if(!p||!['natural','sharp','flat'].includes(p.accidental)||!Number.isInteger(p.octave)||p.octave<0||p.octave>8)return null;if(p.kind==='pitch'?!['C','D','E','F','G','A','B'].includes(p.step):p.kind==='degree'?![1,2,3,4,5,6,7].includes(p.value):true)return null;}
      }
    }
  }return s;
}
function edit(score:Score,change:(draft:Score)=>void):Score{const next=structuredClone(score);change(next);next.metadata.updatedAt=Math.max(Date.now(),score.metadata.updatedAt+1);if(!readScore(next))throw Error('樂譜資料無效');return next;}
export function updateMetadata(score:Score,patch:Partial<Omit<Score['metadata'],'createdAt'|'updatedAt'>>){return edit(score,s=>{s.metadata={...s.metadata,...patch};});}
export function addMeasure(score:Score,trackId:string){return edit(score,s=>{const track=s.tracks.find(t=>t.id===trackId);if(!track)throw Error('找不到聲部');track.measures.push({id:id(),events:[]});});}
export function editMeasure(score:Score,measureId:string,change:(bar:Measure)=>void){return edit(score,s=>{const bar=s.tracks.flatMap(t=>t.measures).find(m=>m.id===measureId);if(!bar)throw Error('找不到小節');change(bar);});}
export function addEvent(score:Score,measureId:string,type:'note'|'rest',duration:Duration,tone:Tone){return editMeasure(score,measureId,m=>m.events.push(type==='rest'?{id:id(),type,duration}:{id:id(),type,duration,tone:structuredClone(tone)}));}
export function deleteEvent(score:Score,measureId:string,eventId:string){return edit(score,s=>{const m=s.tracks.flatMap(t=>t.measures).find(m=>m.id===measureId);if(!m||!m.events.some(e=>e.id===eventId))throw Error('找不到音樂事件');m.events=m.events.filter(e=>e.id!==eventId);for(const e of s.tracks.flatMap(t=>t.measures).flatMap(m=>m.events))if(e.tie?.toEventId===eventId)delete e.tie;});}
export function setDuration(score:Score,measureId:string,eventId:string,duration:Duration){return editMeasure(score,measureId,m=>{const e=m.events.find(e=>e.id===eventId);if(!e)throw Error('找不到音樂事件');e.duration=duration;});}
