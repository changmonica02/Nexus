require('./loadStudy.cjs');
require('fake-indexeddb/auto');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText, filename);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const { openDB, deleteDB } = require('idb');
const { StudyRepository, STUDY_STORES } = require('../src/features/study/StudyRepository.ts');
const { CardManageList } = require('../src/features/study/components/StudySetView.tsx');
const Editor = require('../src/features/study/components/StudyCardEditor.tsx').default;
const { LanguageProvider } = require('../src/lib/LanguageContext.tsx');
const test = require('node:test');
const assert = require('node:assert/strict');
const noop = () => {};
function list(cards) {
  return renderToStaticMarkup(React.createElement(LanguageProvider, { initialLanguage: 'en' },
    React.createElement(CardManageList, { studyItems: cards, onAddCard: noop, onEditCard: noop, onDeleteCard: noop, onImportCsv: noop })));
}
function order(cards) {
  return [...list(cards).matchAll(/data-study-card="([^"]+)"/g)].map(match => match[1]);
}

test('management renders only two readonly columns, always A–Z, with full text and ellipsis styling', () => {
  const long = '中文完整內容'.repeat(100);
  const cards = [{ id: 'z', front: 'zebra', back: '斑馬', sort_order: 0 }, { id: 'a', front: 'Apple', back: long, sort_order: 1 }];
  const html = list(cards);
  assert.deepEqual(order(cards), ['a', 'z']);
  assert.deepEqual(cards.map(card => card.id), ['z', 'a'], 'display must not mutate the input order');
  assert.equal((html.match(/<th /g) || []).length, 2);
  assert.equal((html.match(/<td /g) || []).length, 4);
  assert.match(html, /table-fixed/);
  assert.equal((html.match(/class="[^"]*truncate[^"]*"/g) || []).length, 4);
  assert.ok(html.includes(long));
  assert.doesNotMatch(html, /<input|<textarea|<select|draggable|拖曳|自訂排序|到期|新卡/);
  assert.match(html, /tabindex="0"/);
  assert.match(html, /aria-label="編輯單字 Apple"/);
});

test('editor contains complete multiline content and explicit save/cancel, without writing on render', () => {
  const card = { id: 'one', front: 'complete English\nsecond line', back: '中文'.repeat(200) + '\n第二行' };
  let saves = 0;
  const html = renderToStaticMarkup(React.createElement(Editor, { card, requiresScheduleChoice: false,
    onSave: async () => { saves++; }, onClose: noop, onCopy: noop }));
  assert.ok(html.includes(card.front));
  assert.ok(html.includes(card.back));
  assert.equal((html.match(/<textarea/g) || []).length, 2);
  assert.match(html, /<dialog/);
  assert.match(html, /type="submit"[^>]*>儲存/);
  assert.match(html, />關閉<\/button>/);
  assert.equal(saves, 0);
});

test('add, batch import, edit and delete immediately derive A–Z without changing sort_order or learning state', async () => {
  const name = crypto.randomUUID();
  const db = await openDB(name, 1, { upgrade(db) {
    for (const name of STUDY_STORES) {
      const store = db.createObjectStore(name, { keyPath: 'id' });
      if (['study_cards', 'study_states', 'study_events'].includes(name)) store.createIndex('deck', 'deck_id');
    }
  }});
  try {
    const repo = new StudyRepository(db, () => null, 'test');
    await repo.ensureDeck({ id: 'deck', study_items: [] });
    await repo.configure('deck', { sort_mode: 'custom' });
    const read = () => repo.readDeck('deck');
    const words = snapshot => order(snapshot.cards.filter(card => !card.deleted_at)).map(id => snapshot.cards.find(card => card.id === id).front);
    await repo.addCards('deck', [{ front: 'zebra', back: '斑馬' }]);
    await repo.addCards('deck', [{ front: 'apple', back: '蘋果' }]);
    assert.deepEqual(words(await read()), ['apple', 'zebra']);
    await repo.addCards('deck', [{ front: 'pear', back: '梨' }, { front: 'Banana', back: '香蕉' }]);
    const before = await read();
    assert.deepEqual(words(before), ['apple', 'Banana', 'pear', 'zebra']);
    const zebra = before.cards.find(card => card.front === 'zebra');
    const full = '完整中文；'.repeat(100) + '\n第二行';
    await repo.updateCard(zebra.id, { front: 'abandon (v.)', back: full });
    const edited = await read();
    assert.deepEqual(words(edited), ['abandon (v.)', 'apple', 'Banana', 'pear']);
    assert.equal(edited.cards.find(card => card.id === zebra.id).back, full);
    assert.deepEqual(edited.cards.map(card => [card.id, card.sort_order]), before.cards.map(card => [card.id, card.sort_order]));
    assert.deepEqual(edited.states, before.states);
    assert.deepEqual(edited.events, before.events);
    assert.deepEqual(edited.sessions, before.sessions);
    assert.deepEqual(edited.settings, before.settings);
    await repo.updateCard(zebra.id, { deleted_at: Date.now() });
    assert.deepEqual(words(await read()), ['apple', 'Banana', 'pear']);
    const reopened = new StudyRepository(db, () => null, 'reopened');
    assert.deepEqual(words(await reopened.readDeck('deck')), ['apple', 'Banana', 'pear']);
  } finally { db.close(); await deleteDB(name); }
});
