/** Product codes are independent of the retained legacy Prefix/Root categories. */
export const semanticDomains = [
  {code:'action',zh:'物理動作',en:'Physical actions',children:[['movement','移動','Movement'],['force','施力','Force'],['cutting','切割','Cutting'],['joining','結合','Joining'],['holding','持有','Holding']]},
  {code:'space_time',zh:'空間與時間',en:'Space and time',children:[['orientation','方位','Orientation'],['distance','距離','Distance'],['position','位置','Position'],['time','時間','Time'],['sequence','先後','Sequence']]},
  {code:'nature',zh:'宇宙與自然',en:'Universe and nature',children:[['celestial','天體','Celestial bodies'],['geography','地理','Geography'],['elements','元素','Elements'],['flora_fauna','動植物','Plants and animals']]},
  {code:'life_body',zh:'生命與人體',en:'Life and the body',children:[['body','身體','Body'],['physiology','生理','Physiology'],['senses','感官','Senses'],['life_activity','生命活動','Life activities']]},
  {code:'language_mind',zh:'言語與心智',en:'Language and mind',children:[['speech','言語','Speech'],['cognition','認知','Cognition'],['memory','記憶','Memory'],['emotion','情緒','Emotion'],['will','意志','Will']]},
  {code:'society_culture',zh:'社會與人文',en:'Society and culture',children:[['interpersonal','人際','Relationships'],['law','法律','Law'],['politics','政治','Politics'],['culture','文化','Culture'],['religion','宗教','Religion']]},
  {code:'life_work',zh:'生活與工作',en:'Daily life and work',children:[['housing','居住','Housing'],['food','飲食','Food'],['clothing','衣著','Clothing'],['manufacturing','製造','Manufacturing'],['trade','交易','Trade']]},
  {code:'states_properties',zh:'狀態與性質',en:'States and properties',children:[['size','大小','Size'],['quantity','數量','Quantity'],['degree','程度','Degree'],['quality','品質','Quality'],['existence','存在','Existence']]},
  {code:'grammar_affixes',zh:'文法與詞綴',en:'Grammar and affixes',children:[['negation','否定','Negation'],['reversal','反向','Reversal'],['repetition','重複','Repetition'],['derivation','派生構詞','Derivation']]},
] as const;
export type SemanticDomainCode=typeof semanticDomains[number]['code'];
export type SemanticSubdomainCode=typeof semanticDomains[number]['children'][number][0];
export function validSemanticCategory(domain:unknown,subdomain:unknown):boolean {
  if(domain==null)return subdomain==null;
  const selected=semanticDomains.find(d=>d.code===domain);
  return !!selected&&(subdomain==null||selected.children.some(child=>child[0]===subdomain));
}
