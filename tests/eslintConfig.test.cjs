const {test}=require('node:test');
const assert=require('node:assert/strict');
const {ESLint}=require('eslint');
test('repository lint handles CommonJS fixtures and preserves TypeScript and React safety rules',async()=>{
 const lint=new ESLint();
 const fixture=await lint.calculateConfigForFile('tests/dictionaryEditInflections.test.cjs');
 assert.equal(fixture.rules['react-hooks/refs'],undefined);
 const app=await lint.calculateConfigForFile('src/features/dictionary/DictionaryAdmin.tsx');
 assert.equal(app.rules['react-hooks/rules-of-hooks'][0],2);
 assert.equal(app.rules['@typescript-eslint/no-require-imports'][0],2);
 const [result]=await lint.lintText('import {useState} from "react"; export function Component({enabled}:{enabled:boolean}){if(enabled)useState(0);return null;}',{filePath:'src/features/dictionary/LintSafetyProbe.tsx'});
 assert.ok(result.messages.some(m=>m.ruleId==='react-hooks/rules-of-hooks'&&m.severity===2));
});
