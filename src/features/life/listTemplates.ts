import type { FieldType, LifeField } from "./lists";

type TemplateField = [name:string,type:FieldType,options?:string[]];
export const listTemplates: Record<string, TemplateField[]> = {
  採買: [["數量","number"],["已購買","checkbox"],["預算","money"]],
  購物: [["商品連結","url"],["價格","money"],["購買日期","date"]],
  物品與保養品庫存: [["數量","number"],["有效期限","date"],["照片","image"]],
  收藏: [["取得日期","date"],["來源","text"],["照片","image"]],
  願望清單: [["價格","money"],["優先程度","select",["高","中","低"]],["已達成","checkbox"]],
  閱讀: [["作者","text"],["完成日期","date"],["讀後感","longtext"]],
  遊戲: [["平台","text"],["遊玩時長（分鐘）","duration"],["心得","longtext"]],
  旅行: [["日期","date"],["地點","text"],["預算","money"]],
  日記: [["日期","date"],["正文","longtext"],["心情","text"],["標籤","multiselect",["日常","學習","旅行"]],["照片","image"],["附件","attachment"]],
  心情: [["日期","date"],["心情","text"],["評分","rating"],["備註","longtext"]],
  皮膚狀態: [["日期","date"],["狀態","longtext"],["照片","image"]],
  咖啡因: [["日期","date"],["咖啡因（mg）","number"],["備註","longtext"]],
  症狀: [["日期","date"],["程度（0–10）","number"],["紀錄","longtext"]],
  寵物: [["日期","date"],["事項","longtext"],["完成","checkbox"]],
  植物照護: [["日期","date"],["澆水","checkbox"],["照護備註","longtext"]],
  保固及有效期限: [["有效期限","date"],["購買日期","date"],["憑證","attachment"]],
};

export function templateFields(name:string):LifeField[] {
  return (listTemplates[name]??[]).map(([name,type,options])=>({id:crypto.randomUUID(),name,type,...(options?{options:[...options]}:{})}));
}
