require('./loadStudy.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
const {translate}=require('../src/lib/i18n.ts');
const {worldMapEn,worldMapZhTW}=require('../src/lib/worldMapTranslations.ts');
test('world/map UI shares complete supported-language keys and English fallback',()=>{
 assert.deepEqual(Object.keys(worldMapEn).sort(),Object.keys(worldMapZhTW).sort());
 assert.ok(Object.keys(worldMapEn).filter(k=>k.startsWith('azgaar.')).length>2500);
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
 assert.doesNotMatch(commands,/id: "(?:showInfo|getApp|startTour|openSubmapTool|saveToMachine|saveMapAs|loadFromFile|quickLoad|saveToStorage|saveToDropbox|loadFromURL|newMap|exportSvg|exportPng)"/);
 for(const id of ['editStatesButton','editHeightmapButton','editBiomesButton','exportJpeg','exportTiles','exportJsonFull','exportGeoJsonCells'])assert.ok(commands.includes('id: "'+id+'"'));
 assert.doesNotMatch(read('vendor/azgaar/src/components/options/tabs/options-tab.ts'),/loadGoogleTranslate|resetLanguage|id="(?:autosaveIntervalInput|onloadBehavior|optionsReset)"/);
});

// Dynamic native panels use the same fixed catalog as Nexus, including tooltip-only strings.
test('native geography, editing, formatting and error labels have Traditional Chinese translations',()=>{
 for(const text of ['Coastline Settings','Heightmap customization tools:','Paint Cultures','Paint Religions','Edit Label','Insert table','Unit name','Show or hide columns','Download cells data in GeoJSON format','Cannot load 3d library','The action cannot be reverted']){const key='azgaar.'+text;assert.equal(translate('en',key),text);assert.match(translate('zh-TW',key),/[\u3400-\u9fff]/);}
});

test('every fixed native command name has an i18n translation',()=>{
 const ts=require('typescript'),fs=require('node:fs');const file=ts.createSourceFile('commands.ts',fs.readFileSync('vendor/azgaar/src/components/map-commands.ts','utf8'),ts.ScriptTarget.Latest,true);let count=0;function visit(node){if(ts.isPropertyAssignment(node)&&node.name.getText(file)==='name'&&ts.isStringLiteral(node.initializer)){const name=node.initializer.text,key='azgaar.'+name;assert.ok(worldMapEn[key],name);assert.ok(worldMapZhTW[key],name);count++;}ts.forEachChild(node,visit);}visit(file);assert.ok(count>100);
});
