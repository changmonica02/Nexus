export function bindMenuDismiss(target:EventTarget,inside:(target:EventTarget|null)=>boolean,close:()=>void){
  const pointer=(event:Event)=>{if(!inside(event.target))close();};
  const key=(event:Event)=>{if((event as KeyboardEvent).key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  const options={capture:true};
  target.addEventListener('pointerdown',pointer,options);
  target.addEventListener('keydown',key,options);
  return()=>{target.removeEventListener('pointerdown',pointer,options);target.removeEventListener('keydown',key,options);};
}
