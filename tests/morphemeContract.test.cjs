require('./loadStudy.cjs');const test=require('node:test'),assert=require('node:assert/strict');
const {validateMorphemeSenseFields,normalizeMorphemeSense,removeMorphemeVariant}=require('../src/features/dictionary/morphemeContract.ts');
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
test('semantic categories belong to a sense and enforce the selected major/minor relationship',()=>{
 assert.equal(validateMorphemeSenseFields({}),null);assert.equal(validateMorphemeSenseFields({semantic_domain:null,semantic_subdomain:null}),null);
 assert.equal(validateMorphemeSenseFields({semantic_domain:'action',semantic_subdomain:'cutting'}),null);assert.ok(validateMorphemeSenseFields({semantic_domain:'action',semantic_subdomain:'time'}));assert.ok(validateMorphemeSenseFields({semantic_domain:null,semantic_subdomain:'cutting'}));assert.ok(validateMorphemeSenseFields({semantic_domain:'作用與變化'}),'legacy categories are not guessed into the new domains');
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
