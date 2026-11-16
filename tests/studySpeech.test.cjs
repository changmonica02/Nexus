require('./loadStudy.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict');
const {StudySpeechPlayer,englishFront}=require('../src/features/study/studySpeech.ts');
const en={lang:'en-US',localService:true},zh={lang:'zh-TW',localService:true,default:true};
function setup(t,voices=[]){t.mock.timers.enable({apis:['setTimeout']});const notices=[],calls=[],engine=new EventTarget();let list=voices;Object.assign(engine,{getVoices:()=>list,resume:()=>calls.push('resume'),cancel:()=>calls.push('cancel'),speak:u=>calls.push(u),speaking:false});const player=new StudySpeechPlayer({engine:()=>engine,utterance:text=>({text}),visible:()=>true,notify:n=>notices.push(n)});t.after(()=>player.stop());return {player,engine,notices,calls,setVoices:v=>list=v,spoken:()=>calls.filter(x=>typeof x==='object')};}
test('English eligibility uses card text, never IPA, and English/local selection preserves rate',t=>{const f=setup(t,[zh,{lang:'en-GB',localService:false},en]);assert.equal(englishFront(' hello ','en-zh'),'hello');for(const pair of [['中文','en-zh'],['hello','zh-en'],['bonjour é','en-zh']])assert.equal(englishFront(...pair),null);f.player.play('hello',1.2,true);assert.equal(f.spoken()[0].voice,en);assert.equal(f.spoken()[0].rate,1.2);assert.equal(f.spoken()[0].lang,'en-US');f.spoken()[0].onstart();f.spoken()[0].onend();assert.equal(f.notices.at(-1),'');});
test('delayed voiceschanged and bounded polling both discover English exactly once',t=>{const f=setup(t);f.player.play('hello',.9);assert.equal(f.notices.at(-1),'speech.preparing');f.setVoices([en]);f.engine.dispatchEvent(new Event('voiceschanged'));t.mock.timers.tick(50);assert.equal(f.spoken().length,1);f.engine.dispatchEvent(new Event('voiceschanged'));t.mock.timers.tick(1800);assert.equal(f.spoken().length,1);f.spoken()[0].onend();f.setVoices([]);f.player.play('next',.9);f.setVoices([en]);t.mock.timers.tick(100);t.mock.timers.tick(50);assert.equal(f.spoken().length,2);});
test('empty inventory uses en-US without assigning voice; manual keeps activation and auto has bounded wait',t=>{const f=setup(t);f.player.play('hello',.9,true);assert.equal(f.spoken().length,1);assert.equal(f.spoken()[0].voice,undefined);assert.equal(f.spoken()[0].lang,'en-US');f.player.stop();f.player.play('next',.9);t.mock.timers.tick(1800);t.mock.timers.tick(50);assert.equal(f.spoken().length,2);f.spoken()[1].onstart();f.spoken()[1].onend();assert.equal(f.notices.at(-1),'');});
test('Android voice inventory with no English keeps manual tap and requests en-US fallback',t=>{const f=setup(t,[zh]);f.player.play('hello',.9,true);assert.equal(f.spoken().length,1);assert.equal(f.spoken()[0].voice,undefined);assert.equal(f.spoken()[0].lang,'en-US');f.spoken()[0].onerror({error:'language-unavailable'});assert.equal(f.notices.at(-1),'speech.englishUnavailable');f.player.play('auto',.9);t.mock.timers.tick(1800);t.mock.timers.tick(50);assert.equal(f.spoken().length,2);assert.equal(f.spoken()[1].lang,'en-US');assert.equal(f.spoken()[1].voice,undefined);});
test('browser restrictions, network failures, silent startup and hung playback have distinct bounded outcomes',t=>{const f=setup(t,[en]);for(const [error,key] of [['not-allowed','speech.blocked'],['network','speech.retry'],['audio-busy','speech.retry'],['audio-hardware','speech.retry'],['canceled',''],['interrupted','']]){f.player.play('word',.9,true);f.spoken().at(-1).onerror({error});assert.equal(f.notices.at(-1),key);}f.player.play('word',.9,true);const beforeFallback=f.spoken().length;t.mock.timers.tick(8000);assert.equal(f.spoken().length,beforeFallback+1);assert.equal(f.spoken().at(-1).voice,undefined);assert.equal(f.notices.at(-1),'');t.mock.timers.tick(8000);assert.equal(f.notices.at(-1),'speech.notReady');f.setVoices([]);f.player.play('word',.9,true);t.mock.timers.tick(8000);assert.equal(f.notices.at(-1),'speech.notReady');f.setVoices([en]);f.player.play('word',.9,true);f.engine.speaking=true;t.mock.timers.tick(8000);assert.equal(f.notices.at(-1),'');t.mock.timers.tick(90000);assert.equal(f.notices.at(-1),'speech.retry');});
test('rapid replay, cancellation, unmount and late events cannot overlap or restart an old card',t=>{const f=setup(t,[en]);f.player.play('old',.9,true);const old=f.spoken()[0];f.player.play('new',.9,true);old.onend();old.onerror({error:'network'});assert.equal(f.notices.at(-1),'');const count=f.spoken().length;f.player.stop();f.engine.dispatchEvent(new Event('voiceschanged'));t.mock.timers.tick(100000);assert.equal(f.spoken().length,count);assert.equal(f.calls.at(-1),'cancel');});

test('missing browser API is distinguished from an engine that failed to construct speech',t=>{const notices=[],player=new StudySpeechPlayer({engine:()=>undefined,utterance:()=>({}),visible:()=>true,notify:n=>notices.push(n)});player.play('word',.9,true);assert.equal(notices.at(-1),'speech.unsupported');const f=setup(t,[en]);const bad=new StudySpeechPlayer({engine:()=>f.engine,utterance:()=>{throw Error('engine failure');},visible:()=>true,notify:n=>notices.push(n)});bad.play('word',.9,true);assert.equal(notices.at(-1),'speech.retry');bad.stop();});

test('advertised English voice failing before start retries once through language-only en-US',t=>{
 const f=setup(t,[en]);
 f.engine.speak=u=>{f.calls.push(u);if(u.voice)u.onerror({error:'synthesis-failed'});else u.onstart();};
 f.player.play('hello',1.2,true);
 assert.equal(f.spoken().length,2);
 const [selected,fallback]=f.spoken();assert.equal(selected.voice,en);assert.equal(fallback.voice,undefined);assert.equal(fallback.lang,'en-US');assert.equal(fallback.rate,1.2);
 selected.onend();selected.onerror({error:'voice-unavailable'});assert.equal(f.spoken().length,2);assert.equal(f.notices.at(-1),'');
 fallback.onerror({error:'synthesis-failed'});assert.equal(f.spoken().length,2);assert.equal(f.notices.at(-1),'speech.retry');
});

test('voice-specific recovery is bounded and final failures remain visible',t=>{
 const f=setup(t,[en]);
 for(const [error,notice]of [['voice-unavailable','speech.noVoice'],['language-unavailable','speech.englishUnavailable'],['synthesis-unavailable','speech.retry'],['synthesis-failed','speech.retry']]){
  const before=f.spoken().length;f.player.play('hello',.9,true);const selected=f.spoken().at(-1);selected.onerror({error});
  assert.equal(f.spoken().length,before+2);const fallback=f.spoken().at(-1);assert.equal(fallback.voice,undefined);assert.equal(fallback.lang,'en-US');
  fallback.onerror({error});assert.equal(f.spoken().length,before+2);assert.equal(f.notices.at(-1),notice);
 }
});
test('a started utterance is never replayed and cancellation invalidates all recovery timers',t=>{
 const f=setup(t,[en]);f.player.play('started',.9,true);let before=f.spoken().length;f.spoken().at(-1).onstart();f.spoken().at(-1).onerror({error:'synthesis-failed'});assert.equal(f.spoken().length,before);assert.equal(f.notices.at(-1),'speech.retry');
 f.player.play('cancelled',.9,true);const old=f.spoken().at(-1);before=f.spoken().length;f.player.stop();old.onerror({error:'synthesis-failed'});t.mock.timers.tick(100000);assert.equal(f.spoken().length,before);
});
