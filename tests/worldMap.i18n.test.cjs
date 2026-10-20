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

test('embedded source has no standalone entry points or first-visit initialization',()=>{
 const fs=require('node:fs');
 const read=p=>fs.readFileSync(require('node:path').join(__dirname,'..',p),'utf8');
 const index=read('vendor/azgaar/src/index.html');
 assert.doesNotMatch(index,/id="(?:aboutTab|aboutContent|tourPromptButton|loading|regenerate|newMapButton|saveButton|loadButton|saveMapData|loadMapData)"|googletagmanager|patreon|discord|reddit/i);
 assert.doesNotMatch(read('vendor/azgaar/src/components/shell.ts'),/initTourPromptButton|addDragToUpload|onbeforeunload/);
 assert.doesNotMatch(read('vendor/azgaar/src/services/versioning.ts'),/showUpdateWindow|announceVersion|latestPublicChanges/);
 const commands=read('vendor/azgaar/src/components/map-commands.ts');
 assert.doesNotMatch(commands,/id: "(?:showInfo|getApp|startTour|saveToMachine|saveMapAs|loadFromFile|quickLoad|saveToStorage|saveToDropbox|loadFromURL|newMap|exportSvg|exportPng)"/);
 for(const id of ['editStatesButton','editHeightmapButton','editBiomesButton','exportJpeg','exportTiles','exportJsonFull','exportGeoJsonCells'])assert.ok(commands.includes('id: "'+id+'"'));
 assert.doesNotMatch(read('vendor/azgaar/src/components/options/tabs/options-tab.ts'),/loadGoogleTranslate|resetLanguage|id="(?:autosaveIntervalInput|onloadBehavior|optionsReset)"/);
});
