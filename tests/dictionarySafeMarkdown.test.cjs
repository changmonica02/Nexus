const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const {transformSync}=require('esbuild');
const filename=path.resolve(__dirname,'../src/features/dictionary/SafeMarkdown.tsx');
const source=fs.readFileSync(filename,'utf8');
const mod={exports:{}};
const compiled=transformSync(source,{loader:'tsx',format:'cjs',target:'es2022',jsx:'automatic'}).code;
new Function('require','module','exports',compiled)(require,mod,mod.exports);
const SafeMarkdown=mod.exports.SafeMarkdown;
const render=text=>renderToStaticMarkup(React.createElement(SafeMarkdown,{source:text}));

test('shared dictionary notes support headings, emphasis, paragraphs, lists and HTTPS links',()=>{
 const html=render('# 公共補充筆記\n\n**重點**與*補充*\n- 第一項\n- 第二項\n1. 首先\n2. 接著\n[來源](https://example.org/a)');
 assert.match(html,/<h3/);assert.match(html,/<strong>重點<\/strong>/);assert.match(html,/<em>補充<\/em>/);
 assert.match(html,/<ul/);assert.match(html,/<ol/);assert.match(html,/href="https:\/\/example.org\/a"/);
 assert.match(html,/rel="noopener noreferrer"/);
});
test('shared dictionary notes never interpret HTML, images, javascript: or data: as executable content',()=>{
 const html=render('<img src=x onerror=alert(1)>\n<script>alert(2)</script>\n[click](javascript:alert(3))\n[unsafe](data:text/html,evil)\n[safe](https://example.org/)');
 assert.doesNotMatch(html,/<img\s|<script\s|href="javascript:|href="data:/i);
 assert.match(html,/&lt;img/);assert.match(html,/&lt;script/);
 assert.match(html,/\[click\]\(javascript:alert\(3\)\)/);
 assert.match(html,/href="https:\/\/example.org\/"/);
 assert.equal((html.match(/<a\b/g)||[]).length,1);
});
test('markdown fenced code stays escaped and is not treated as inline markup',()=>{
 const html=render('```html\n<script>bad()</script>\n```');
 assert.match(html,/<pre/);assert.match(html,/&lt;script&gt;bad\(\)&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>/);
});
