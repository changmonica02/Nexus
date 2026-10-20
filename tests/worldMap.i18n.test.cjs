require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {translate}=require('../src/lib/i18n.ts');
const {worldMapEn,worldMapZhTW}=require('../src/lib/worldMapTranslations.ts');
test('world/map UI shares complete supported-language keys and English fallback',()=>{
 assert.deepEqual(Object.keys(worldMapEn).sort(),Object.keys(worldMapZhTW).sort());
 assert.ok(Object.keys(worldMapEn).filter(k=>k.startsWith('azgaar.')).length>200);
 for(const [key,value] of Object.entries(worldMapEn)){assert.equal(translate('en',key),value);assert.ok(translate('zh-TW',key));}
 assert.equal(translate('zh-TW','azgaar.Layers'),'圖層');
 assert.equal(translate('fr','worldMap.scope'),'Map scope');
 assert.equal(translate('zh-TW','azgaar.User-created-name'),'azgaar.User-created-name');
});
