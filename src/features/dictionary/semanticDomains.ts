/** Stable database codes; new labels must not rewrite published sense identities. */
export const semanticDomains = [
  {code:'action',zh:'物理動作',en:'Physical actions',children:[['posture','姿態','Posture'],['movement','移動','Movement'],['force','作用','Action and effects'],['separation','分離','Separation'],['joining','結合','Joining'],['holding','持有','Holding'],['operation','操作','Operation']]},
  {code:'space_time',zh:'空間與時間',en:'Space and time',children:[['orientation','方位','Orientation'],['distance','距離','Distance'],['position','位置','Position'],['time','時間','Time'],['sequence','順序','Sequence'],['scope','範圍','Scope']]},
  {code:'nature',zh:'宇宙與自然',en:'Universe and nature',children:[['celestial','天體','Celestial bodies'],['geography','地理','Geography'],['elements','物質','Matter'],['plants','植物','Plants'],['animals','動物','Animals'],['natural_phenomena','自然現象','Natural phenomena']]},
  {code:'life_body',zh:'生命與人體',en:'Life and the body',children:[['body','身體','Body'],['physiology','生理','Physiology'],['senses','感官','Senses'],['life_activity','生命活動','Life activities'],['health_disease','健康與疾病','Health and disease']]},
  {code:'language_mind',zh:'語言與心智',en:'Language and mind',children:[['speech','語言','Language'],['cognition','認知','Cognition'],['thinking','思維','Thinking'],['learning','學習','Learning'],['memory','記憶','Memory'],['emotion','情緒','Emotion'],['will','意志','Will']]},
  {code:'society_culture',zh:'社會與人文',en:'Society and culture',children:[['interpersonal','人際','Relationships'],['law','法律','Law'],['politics','政治','Politics'],['power','權力','Power'],['culture','文化','Culture'],['religion','宗教','Religion'],['conflict','對抗','Conflict']]},
  {code:'life_work',zh:'生活與工作',en:'Daily life and work',children:[['housing','居住','Housing'],['food','飲食','Food'],['clothing','衣著','Clothing'],['manufacturing','製造','Manufacturing'],['agriculture','農業','Agriculture'],['tools','工具','Tools'],['trade','交易','Trade']]},
  {code:'states_properties',zh:'狀態與性質',en:'States and properties',children:[['size','大小','Size'],['shape','形狀','Shape'],['quantity','數量','Quantity'],['degree','程度','Degree'],['merit','優劣','Merit and quality'],['quality','特性','Characteristics'],['existence','存在','Existence'],['change','變化','Change'],['part_whole','部分與整體','Parts and wholes']]},
  {code:'grammar_affixes',zh:'文法與詞綴',en:'Grammar and affixes',children:[['negation','否定','Negation'],['reversal','反向','Reversal'],['repetition','重複','Repetition'],['grammatical_relation','語法關係','Grammatical relations']]},
  {code:'derivation',zh:'派生構詞',en:'Derivational morphology',children:[]},
] as const;
export type SemanticDomainCode=typeof semanticDomains[number]['code'];
export type SemanticSubdomainCode=typeof semanticDomains[number]['children'][number][0];
export function validSemanticCategory(domain:unknown,subdomain:unknown):boolean {
  if(domain==null)return subdomain==null;
  const selected=semanticDomains.find(d=>d.code===domain);
  // An older saved grammar/derivation pair is preserved until explicitly edited.
  if(domain==='grammar_affixes'&&subdomain==='derivation')return true;
  return !!selected&&(subdomain==null||selected.children.some(child=>child[0]===subdomain));
}
