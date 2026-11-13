require('./loadStudy.cjs');const test=require('node:test'),assert=require('node:assert/strict');
const {validateMorphemeSenseFields,normalizeMorphemeSense,removeMorphemeVariant}=require('../src/features/dictionary/morphemeContract.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('semantic categories belong to a sense and enforce the selected major/minor relationship',()=>{
 assert.equal(validateMorphemeSenseFields({}),null);assert.equal(validateMorphemeSenseFields({semantic_domain:null,semantic_subdomain:null}),null);
 assert.equal(validateMorphemeSenseFields({semantic_domain:'action',semantic_subdomain:'cutting'}),null);assert.ok(validateMorphemeSenseFields({semantic_domain:'action',semantic_subdomain:'time'}));assert.ok(validateMorphemeSenseFields({semantic_domain:null,semantic_subdomain:'cutting'}));assert.ok(validateMorphemeSenseFields({semantic_domain:'作用與變化'}),'legacy categories are not guessed into the new domains');
});
test('new taxonomy exposes ten domains and exactly 58 subcategories; derivation stands alone',()=>{
 const {semanticDomains,validSemanticCategory}=require('../src/features/dictionary/semanticDomains.ts');
 assert.deepEqual(semanticDomains.map(d=>d.zh),['物理動作','空間與時間','宇宙與自然','生命與人體','語言與心智','社會與人文','生活與工作','狀態與性質','文法與詞綴','派生構詞']);
 assert.deepEqual(semanticDomains.map(d=>d.children.length),[7,6,6,5,7,7,7,9,4,0]);
 assert.equal(semanticDomains.reduce((n,d)=>n+d.children.length,0),58);
 const last=semanticDomains.at(-1);
 assert.equal(validSemanticCategory(last.code,null),true);
 assert.equal(validSemanticCategory(last.code,'derivation'),false);
 assert.equal(validSemanticCategory('grammar_affixes','grammatical_relation'),true);
 assert.equal(validSemanticCategory('nature','natural_phenomena'),true);
 assert.equal(validSemanticCategory('states_properties','part_whole'),true);
 assert.equal(validSemanticCategory('society_culture','power'),true);
 assert.equal(validSemanticCategory('action','posture'),true);
 assert.equal(validSemanticCategory('grammar_affixes','derivation'),true,'retained older draft classification');
 assert.equal(validSemanticCategory('action','cutting'),true,'retained older draft classification');
 assert.equal(validSemanticCategory('nature','flora_fauna'),true,'retained older draft classification');
});
test('variant identities are required and deletion affects only that ID, even for identical forms',()=>{
 const rows=[{id:id(1),form:'in-',condition:'one'},{id:id(2),form:'in-',condition:'two'}],other=[{id:id(3),form:'in-',condition:'another sense'}],before=structuredClone({rows,other});
 assert.equal(validateMorphemeSenseFields({variants:rows}),null);assert.deepEqual(removeMorphemeVariant(rows,id(1)),[rows[1]]);assert.deepEqual({rows,other},before);assert.throws(()=>removeMorphemeVariant(rows,id(3)));
 for(const variants of [[{form:'in-',condition:''}],[rows[0],{...rows[0]}],[{...rows[0],unknown:true}],[{...rows[0],form:''}]])assert.ok(validateMorphemeSenseFields({variants}));
});
test('comparison treats only null/missing as aliases while retaining real content and revision conflicts',()=>{
 const before={id:id(1),revision:7,gloss_zh_tw:'概述'};assert.deepEqual(normalizeMorphemeSense({...before,variants:null,semantic_domain:null}),before);assert.notDeepEqual(normalizeMorphemeSense({...before,variants:[]}),before);assert.notDeepEqual(normalizeMorphemeSense({...before,revision:8}),before);assert.notDeepEqual(normalizeMorphemeSense({...before,gloss_zh_tw:'改寫'}),before);
});
test('known retired JSON fields are ignored without rebuilding current variants or changing IDs',()=>{
 const {currentMorphemeFields}=require('../src/features/dictionary/retiredMorphemeFields.ts');
 const original={detail:{entry:{id:id(1)},senses:[{id:id(2),variants:[]}]},grouping:{variant_group:'in- / im-'},sense_groups:{[id(2)]:'old'}};
 const before=structuredClone(original),clean=currentMorphemeFields(original);assert.deepEqual(original,before);assert.deepEqual(clean,{detail:original.detail});assert.deepEqual(clean.detail.senses[0].variants,[]);
});
