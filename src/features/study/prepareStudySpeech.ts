let primed=false;
let primer:SpeechSynthesisUtterance|null=null;
/** Called synchronously from Start, before any settings/session awaits (iOS activation). */
export function prepareStudySpeech(){
 if(typeof window==='undefined'||!window.speechSynthesis||typeof SpeechSynthesisUtterance==='undefined')return;
 try{const engine=window.speechSynthesis;engine.getVoices();engine.resume();if(primed||engine.speaking)return;
  const utterance=new SpeechSynthesisUtterance(' ');utterance.volume=0;utterance.lang='en-US';primer=utterance;
  utterance.onend=()=>{if(primer===utterance)primer=null;};utterance.onerror=()=>{primed=false;if(primer===utterance)primer=null;};
  engine.speak(utterance);primed=true;
 }catch{/* Manual playback remains available; no learning operation depends on audio. */}
}
