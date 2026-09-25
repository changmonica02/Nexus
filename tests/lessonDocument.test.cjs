const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/lessonDocument.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(api);
const paragraph = (id, text) => ({ type: 'paragraph', attrs: { id }, content: [{ type: 'text', text, marks: [{ type: 'bold' }] }] });

test('numbering and outline follow the whole document across manual pages and nested blocks', () => {
  const exercise = (id) => ({ type: 'lessonBlock', attrs: { id, kind: 'exercise' }, content: [paragraph(id + '-p', '題目')] });
  const doc = { type: 'doc', content: [{ type: 'heading', attrs: { id: 'h1', level: 1 }, content: [{ type: 'text', text: '第一章' }] }, exercise('q1'), { type: 'pageBreak' }, { type: 'multiColumn', content: [{ type: 'column', content: [exercise('q2')] }] }] };
  const index = api.buildLessonIndex(doc);
  assert.deepEqual(index.map(({ id, page, number }) => [id, page, number]), [['h1', 1, undefined], ['q1', 1, 1], ['q2', 2, 2]]);
  doc.content.splice(1, 1);
  assert.equal(api.buildLessonIndex(doc).find(x => x.id === 'q2').number, 1);
});
test('pagination keeps headings and captions attached, preserving rich blocks and manual boundaries', () => {
  const heading = { type: 'heading', attrs: { id: 'h', level: 1 }, content: [{ type: 'text', text: '章' }] };
  const image = { type: 'image', attrs: { src: 'attachment:abc' } };
  const caption = { ...paragraph('caption', '插圖'), attrs: { id: 'caption', lessonStyle: 'caption' } };
  const blocks = [paragraph('intro', '序'), heading, paragraph('body', '正文'), { type: 'pageBreak' }, paragraph('more', '下一頁'), image, caption];
  const original = JSON.stringify(blocks);
  const result = api.paginateLessonBlocks(blocks, [80, 20, 30, 0, 80, 20, 10], 100);
  assert.equal(result.blocks[1].type, 'pageBreak');
  assert.equal(result.blocks[result.blocks.length - 3].type, 'pageBreak');
  assert.deepEqual(result.blocks.filter(b => b.type !== 'pageBreak'), blocks.filter(b => b.type !== 'pageBreak'));
  assert.equal(JSON.stringify(blocks), original);
});
test('oversized tables are never truncated and corrupt layout values are bounded', () => {
  const table = { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [paragraph('cell', '資料')] }] }] };
  const result = api.paginateLessonBlocks([table], [1000], 800);
  assert.equal(result.oversized, 1);
  assert.deepEqual(result.blocks, [table]);
  const layout = api.readLessonLayout({ lessonLayout: { preset: 'wrong', fontSize: -8, lineHeight: Infinity, headingScale: 99 } });
  assert.equal(layout.fontSize, 12);
  assert.equal(layout.lineHeight, 1.6);
  assert.equal(layout.headingScale, 1.5);
  assert.equal(layout.preset, 'original');
});

test('editor schema round-trips teaching content, collapsed answers and semantic styles', () => {
  const extensions = {};
  const source = ts.transpileModule(fs.readFileSync('src/lib/lessonExtensions.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  new Function('exports', 'require', source)(extensions, (name) => name === './lessonDocument' ? api : require(name));
  const { getSchema } = require('@tiptap/core');
  const StarterKit = require('@tiptap/starter-kit').default;
  const schema = getSchema([StarterKit, extensions.LessonBlock, extensions.AnswerSpace, extensions.LessonToc, extensions.LessonParagraph]);
  const doc = schema.nodeFromJSON({ type: 'doc', content: [
    { type: 'lessonToc' },
    { type: 'lessonBlock', attrs: { kind: 'answer', collapsed: true }, content: [paragraph('answer', '完整解答')] },
    { type: 'answerSpace', attrs: { lines: 5 } },
    { type: 'paragraph', attrs: { lessonStyle: 'caption' }, content: [{ type: 'text', text: '圖片說明' }] },
  ] });
  doc.check();
  const json = doc.toJSON();
  assert.equal(json.content[1].attrs.collapsed, true);
  assert.equal(json.content[1].content[0].content[0].text, '完整解答');
  assert.equal(json.content[1].content[0].content[0].marks[0].type, 'bold');
  assert.equal(json.content[2].attrs.lines, 5);
  assert.equal(json.content[3].attrs.lessonStyle, 'caption');
  assert.deepEqual(schema.nodeFromJSON(json).toJSON(), json);
});
