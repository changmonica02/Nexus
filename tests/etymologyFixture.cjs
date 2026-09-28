const {createHash}=require('node:crypto');
// Synthetic validation records only; these are not etymology facts or batch-08 contents.
module.exports=()=>{
 const raw='TEST ONLY — synthetic source, not a historical etymology.\n<script>not executable</script>';
 return {
  sources:[{id:'test-source',path:'synthetic-fixture.md',raw_markdown:raw,sha256:createHash('sha256').update(raw).digest('hex'),metadata:{test_only:true,unmapped_field:'preserved'}}],
  entries:[{id:'test-prefix',label:'TEST-PREFIX',family:'prefix',kind:'prefix',variant_of:null,source_id:'test-source'},
   {id:'test-root',label:'TEST-ROOT',family:'root',kind:'root',variant_of:null,source_id:'test-source'},
   {id:'test-form',label:'TEST-FORM',family:'prefix',kind:'combining_form',variant_of:null,source_id:'test-source'},
   {id:'test-variant',label:'TEST-VARIANT',family:'root',kind:'variant',variant_of:'test-root',source_id:'test-source'}],
  senses:[{id:'sense-one',entry_id:'test-prefix',gloss:'合成義項一',source_id:'test-source'},
   {id:'sense-two',entry_id:'test-prefix',gloss:'合成義項二',source_id:'test-source'},
   {id:'sense-root',entry_id:'test-root',gloss:'合成根義項',source_id:'test-source'}],
  categories:[{id:'test-category',label:'測試分類',source_id:'test-source'}],
  entry_categories:[{entry_id:'test-prefix',category_id:'test-category'},{entry_id:'test-root',category_id:'test-category'}],
  words:[{id:'test-word',lemma:'TEST-WORD',definition:'測試用字，並非真實詞源資料',source_id:'test-source'}],
  word_senses:[{word_id:'test-word',entry_id:'test-prefix',sense_id:'sense-two',relation_kind:'learning_decomposition',verification:'pending',verification_note:'',source_id:'test-source'},
   {word_id:'test-word',entry_id:'test-root',sense_id:'sense-root',relation_kind:'historical_etymology',verification:'unverified',verification_note:'',source_id:'test-source'}],
  claims:['unverified','pending','verified','disputed'].map((verification,i)=>({id:`claim-${i}`,entry_id:'test-prefix',sense_id:null,word_id:null,kind:'historical_scene',body:`合成場景 ${i}`,verification,verification_note:verification==='verified'?'合成測試用查證說明':'',review_note:'測試審核資訊',source_id:'test-source'})),
 };
};
