let primed=false;
let primer:SpeechSynthesisUtterance|null=null;
/** Called synchronously from Start, before any settings/session awaits (iOS activation). */
export function prepareStudySpeech(){
 if(typeof window==='undefined'||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')return;
 try{const engine=window.speechSynthesis;engine.getVoices();engine.resume();if(primed||engine.speaking)return;
  const utterance=new SpeechSynthesisUtterance(' ');utterance.volume=0;primer=utterance;
  utterance.onend=utterance.onerror=()=>{if(primer===utterance)primer=null;};
  engine.speak(utterance);primed=true;
 }catch{/* Manual playback remains available; no learning operation depends on audio. */}
}
