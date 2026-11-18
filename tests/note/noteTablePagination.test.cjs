const {test,before}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{stripTypeScriptTypes}=require('node:module');let tableRowGroups;
before(async()=>({tableRowGroups}=await import('data:text/javascript;base64,'+Buffer.from(stripTypeScriptTypes(fs.readFileSync('src/lib/noteTablePagination.ts','utf8'),{mode:'transform'})).toString('base64'))));
test('ordinary rows keep every unique boundary',()=>assert.deepEqual(tableRowGroups([[1],[1,1],[]]),[{from:0,to:1},{from:1,to:2},{from:2,to:3}]));
test('a rowspan is an indivisible connected group',()=>assert.deepEqual(tableRowGroups([[3],[1],[1],[1]]),[{from:0,to:3},{from:3,to:4}]));
test('overlapping spans extend a group transitively',()=>assert.deepEqual(tableRowGroups([[2],[3],[1],[1],[1]]),[{from:0,to:4},{from:4,to:5}]));
test('rowspan zero means the remaining row group',()=>assert.deepEqual(tableRowGroups([[1],[0],[1]]),[{from:0,to:1},{from:1,to:3}]));
test('spans beyond the final row are clamped without creating rows',()=>assert.deepEqual(tableRowGroups([[100],[1]]),[{from:0,to:2}]));
test('empty input, ordinary invalid values and complete ordered coverage',()=>{assert.deepEqual(tableRowGroups([]),[]);const input=Array.from({length:130},(_,i)=>[i%17===0?3:1]);const out=tableRowGroups(input);assert.deepEqual(out.flatMap(g=>Array.from({length:g.to-g.from},(_,i)=>g.from+i)),input.map((_,i)=>i));assert.deepEqual(tableRowGroups([[NaN,-1]]),[{from:0,to:1}]);});
