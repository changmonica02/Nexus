require('./loadStudy.cjs');
const ts=require('typescript'),fs=require('node:fs');
require.extensions['.tsx']=(module,filename)=>module._compile(ts.transpileModule(fs.readFileSync(filename,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true},
}).outputText,filename);
const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./etymologyFixture.cjs');
const {EtymologyContent}=require('../src/features/etymology/EtymologyBrowser.tsx');
const render=path=>renderToStaticMarkup(React.createElement(EtymologyContent,{catalog:fixture(),path}));

test('prefix/root category pages remain separate and expose search, categories and kind distinctions',()=>{
 const prefixes=render(['prefixes']),roots=render(['roots']);
 assert.match(prefixes,/字首分類/);assert.match(prefixes,/搜尋字源百科/);assert.match(prefixes,/百科分類/);
 assert.match(prefixes,/TEST-PREFIX/);assert.match(prefixes,/構詞形式/);assert.doesNotMatch(prefixes,/TEST-ROOT/);
 assert.match(roots,/TEST-ROOT/);assert.match(roots,/變體/);assert.doesNotMatch(roots,/TEST-PREFIX/);
});
test('entry senses link to independent words and word detail links to exact senses in both families',()=>{
 const entry=render(['prefixes','test-prefix']),word=render(['words','test-word']);
 assert.match(entry,/id="sense-sense-one"/);assert.match(entry,/id="sense-sense-two"/);
 assert.match(entry,/href="\/etymology\/words\/test-word"/);
 assert.match(word,/href="\/etymology\/prefixes\/test-prefix#sense-sense-two"/);
 assert.match(word,/href="\/etymology\/roots\/test-root#sense-sense-root"/);
 assert.match(word,/學習用構詞拆解/);assert.match(word,/詞源說法（尚未確認）/);
 assert.match(render(['roots','test-variant']),/變體所屬條目/);
 assert.match(render(['roots','test-root']),/href="\/etymology\/roots\/test-variant"/);
});
test('claim status, review notes and original source render safely; unknown pages are explicit',()=>{
 const html=render(['prefixes','test-prefix']);
 assert.equal((html.match(/<h3 class="font-semibold">記憶情境<\/h3>/g)||[]).length,3);
 assert.match(html,/歷史場景（已查證）/);assert.match(html,/待審核資訊/);assert.match(html,/原始來源/);
 assert.match(html,/&lt;script&gt;not executable&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>not executable/);
 assert.match(render(['roots','missing']),/找不到此條目/);
 assert.match(render(['bogus']),/找不到此百科頁面/);
 const data=fixture();Object.keys(data).forEach(key=>data[key]=[]);
 assert.match(renderToStaticMarkup(React.createElement(EtymologyContent,{catalog:data})),/尚無百科資料/);
});
