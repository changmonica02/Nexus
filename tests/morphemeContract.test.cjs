require('./loadStudy.cjs');const test=require('node:test'),assert=require('node:assert/strict');
const {validateMorphemeSenseFields,normalizeMorphemeSense,removeMorphemeVariant,inspectLegacyVariants}=require('../src/features/dictionary/morphemeContract.ts');
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
test('legacy inspection preserves ambiguous/plain source and never resurrects an explicitly cleared variant list',()=>{
 const raw=JSON.stringify({format:'nexus-variants-v1',rows:[{variant:'in-',condition:'before'}]}),senses=[{id:id(1)},{id:id(2)}],snapshot=JSON.stringify({raw,senses});
 assert.equal(inspectLegacyVariants(senses,raw).status,'manual');assert.equal(inspectLegacyVariants([senses[0]],'in- / im-').status,'manual');assert.equal(JSON.stringify({raw,senses}),snapshot);
 assert.deepEqual(inspectLegacyVariants([senses[0]],raw),{status:'ready',sense_id:id(1),rows:[{form:'in-',condition:'before'}]});assert.equal(inspectLegacyVariants([{id:id(1),variants:[]}],raw).status,'current');
});
