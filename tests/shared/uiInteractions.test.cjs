require('../loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {bindMenuDismiss}=require('../../src/components/menuDismiss.ts');
test('shared menus dismiss outside/Escape, preserve inside interactions and remove listeners',()=>{
  const events=new EventTarget();let closed=0;let inside=true;
  const cleanup=bindMenuDismiss(events,()=>inside,()=>closed++);
  events.dispatchEvent(new Event('pointerdown'));assert.equal(closed,0);
  inside=false;events.dispatchEvent(new Event('pointerdown'));assert.equal(closed,1);
  const key=new Event('keydown',{cancelable:true});Object.defineProperty(key,'key',{value:'Escape'});events.dispatchEvent(key);assert.equal(closed,2);assert.equal(key.defaultPrevented,true);
  const typing=new Event('keydown');Object.defineProperty(typing,'key',{value:'a'});events.dispatchEvent(typing);assert.equal(closed,2);
  cleanup();events.dispatchEvent(new Event('pointerdown'));assert.equal(closed,2);
});
