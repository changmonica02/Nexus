require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true,jsx:ts.JsxEmit.ReactJSX}}).outputText,filename);
const {confirmDialog,notifyDialog,currentDialog,finishDialog}=require('../src/lib/confirmDialog.ts');
test('shared confirmation queues requests, waits for decision, ignores stale actions and resolves notices',async()=>{
 let executed=false;const first=confirmDialog({title:'刪除',message:'test',danger:true}).then(value=>{executed=value;return value;});
 const id=currentDialog().id;const second=confirmDialog('second');assert.equal(currentDialog().message,'test');assert.equal(executed,false);
 finishDialog(id,false);assert.equal(await first,false);const next=currentDialog().id;finishDialog(id,true);assert.equal(currentDialog().id,next);finishDialog(next,true);assert.equal(await second,true);
 const notice=notifyDialog('notice');assert.equal(currentDialog().notice,true);finishDialog(currentDialog().id,true);await notice;assert.equal(currentDialog(),null);
});
test('shared dialog supports labels, danger, theme, mobile sizing and cancel-first focus',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server'),{ConfirmDialog}=require('../src/components/ConfirmDialog.tsx');
 const html=renderToStaticMarkup(React.createElement(ConfirmDialog,{request:{id:1,title:'刪除內容',message:'完整訊息',confirmLabel:'刪除',cancelLabel:'保留',danger:true,notice:false},onResult:()=>{}}));
 for(const text of ['刪除內容','完整訊息','保留','bg-red-600','var(--color-bg)','max-h-[90dvh]','aria-describedby'])assert.ok(html.includes(text));assert.ok(html.indexOf('保留')<html.indexOf('>刪除</button>'));
});
test('src has no native confirm/alert call left; unload keeps browser-required protection',()=>{
 const path=require('node:path');function scan(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())scan(file);else if(/\.tsx?$/.test(file))assert.ok(!/\b(?:window\.)?(?:confirm|alert)\s*\(/.test(fs.readFileSync(file,'utf8')),file);}}scan('src');
 const hook=fs.readFileSync('src/features/dictionary/useUnsavedDraft.ts','utf8');assert.ok(hook.includes('beforeunload'));assert.ok(hook.includes('event.preventDefault();event.stopPropagation()'));assert.ok(hook.includes('active&&accepted'));assert.ok(hook.includes('link.click()'));
});
