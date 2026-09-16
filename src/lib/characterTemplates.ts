import { nanoid } from "nanoid";
import type { CharacterProfileData, CharacterSection } from "./types";

export function createFantasyTemplate(): CharacterProfileData {
  return {
    templateId: "fantasy",
    basic: {
      name: "艾爾溫·晨星",
      alias: "破曉之刃",
      avatarUrl: "",
      gender: "男",
      age: "24 歲",
      role: "遊俠 / 魔劍士",
      affiliation: "銀月騎士團",
      quote: "「只要晨光尚未熄滅，黑夜便無法吞噬希望。」",
    },
    sections: [
      {
        id: `sec_${nanoid()}`,
        type: "key_value",
        title: "外貌與裝備",
        icon: "🪪",
        keyValues: [
          { key: "身高 / 體重", value: "182 cm / 74 kg" },
          { key: "髮色 / 瞳色", value: "銀灰短髮 / 琥珀金瞳" },
          { key: "隨身武器", value: "誓約之鋼（單手長劍）、符文獵弓" },
          { key: "代表特徵", value: "右腕有淡淡的星紋烙印，常披深藍色兜帽斗篷" },
        ],
      },
      {
        id: `sec_${nanoid()}`,
        type: "tags",
        title: "性格標籤與特質",
        icon: "🧠",
        tags: ["冷靜果斷", "重視承諾", "警惕心強", "外冷內熱", "不擅表達感情"],
        richText: "平日沉默寡言，但在關鍵決策時極其敏銳果決。對待弱者心懷同情，面對敵人則冷靜克制。最無法容忍背叛與欺凌。",
      },
      {
        id: `sec_${nanoid()}`,
        type: "stats",
        title: "戰鬥與能力數值",
        icon: "⚔️",
        stats: [
          { label: "物理力量", value: 82, max: 100 },
          { label: "敏捷身法", value: 92, max: 100 },
          { label: "魔力親和", value: 76, max: 100 },
          { label: "戰術洞察", value: 88, max: 100 },
          { label: "精神意志", value: 95, max: 100 },
        ],
        richText: "擅長將風系魔力附著於劍刃與箭矢之上，具備極高速的突進與破甲能力。缺點是長時間施展高階劍技對體能消耗極大。",
      },
      {
        id: `sec_${nanoid()}`,
        type: "rich_text",
        title: "身世背景與命運轉折",
        icon: "📜",
        richText: "出生於邊境古老的觀星者家族。十二歲那年家族領地遭深淵侵襲覆滅，唯有他攜帶家族傳承的星紋長劍逃出，後被銀月騎士團長收留並培訓成頂尖遊俠。\n\n目前一邊為騎士團執行清剿異端任務，一邊暗中追查當年覆滅家族的幕後黑手。",
      },
      {
        id: `sec_${nanoid()}`,
        type: "relations",
        title: "人際關係網絡",
        icon: "👥",
        relations: [
          { targetName: "雷恩團長", relationType: "導師 / 救命恩人", description: "如父親般敬重，嚴格受其教導但偶爾理念有所衝突。" },
          { targetName: "瑟菲雅", relationType: "青梅竹馬 / 魔法學者", description: "唯一能讓他放下防備的人，負責為其解析星紋秘辛。" },
          { targetName: "「無面者」卡厄斯", relationType: "宿敵 / 復仇目標", description: "深淵教團執政官，家族覆滅事件的直接主謀。" },
        ],
      },
    ],
  };
}

export function createModernTemplate(): CharacterProfileData {
  return {
    templateId: "modern",
    basic: {
      name: "陸修遠",
      alias: "Professor Leo",
      avatarUrl: "",
      gender: "男",
      age: "31 歲",
      role: "資深刑偵顧問 / 犯罪心理學教授",
      affiliation: "市立重案調查局特別顧問組",
      quote: "「所有完美的謊言，都在試圖掩蓋恐懼的痕跡。」",
    },
    sections: [
      {
        id: `sec_${nanoid()}`,
        type: "key_value",
        title: "基本身分與外在特徵",
        icon: "👔",
        keyValues: [
          { key: "身高 / 體態", value: "178 cm / 勻稱修長" },
          { key: "穿著風格", value: "深灰色風衣、訂製襯衫、金絲無框眼鏡" },
          { key: "日常隨身物", value: "古董機械懷錶、皮革記事本、薄荷糖盒" },
          { key: "日常習慣", value: "思考時會習慣性旋轉鋼筆，咖啡只喝黑咖啡不加糖" },
        ],
      },
      {
        id: `sec_${nanoid()}`,
        type: "tags",
        title: "心理側寫與性格特質",
        icon: "🎭",
        tags: ["極致理性", "觀察入微", "完美主義", "微精神潔癖", "言辭犀利"],
        richText: "具備令人畏懼的微表情與行為洞察力。習慣在心中建構犯罪現場的情境回放，極少被情緒左右，但對未解的懸案有近乎執拗的強迫傾向。",
      },
      {
        id: `sec_${nanoid()}`,
        type: "stats",
        title: "專業能力評估",
        icon: "💻",
        stats: [
          { label: "邏輯演繹", value: 96, max: 100 },
          { label: "微表情分析", value: 94, max: 100 },
          { label: "情報蒐集", value: 85, max: 100 },
          { label: "心理抗壓", value: 90, max: 100 },
          { label: "近身格鬥", value: 68, max: 100 },
        ],
        richText: "能在極短時間內透過對話捕捉對方思維漏洞，擅長高壓審訊與犯罪動機重建。體能普通，但受過專業擒拿訓練以求自保。",
      },
      {
        id: `sec_${nanoid()}`,
        type: "rich_text",
        title: "履歷檔案與過去秘密",
        icon: "📂",
        richText: "二十五歲取得海外頂尖大學心理學博士學位，回國後兼任大學教職與警隊特聘顧問，曾破獲多起轟動全城的連環疑案。\n\n五年前其雙胞胎哥哥在未結案的「雨夜密室案」中離奇失蹤，至今仍是其心中唯一的未解結印與心魔。",
      },
      {
        id: `sec_${nanoid()}`,
        type: "relations",
        title: "人脈與社交網絡",
        icon: "🤝",
        relations: [
          { targetName: "陳嵐 隊長", relationType: "搭檔 / 重案組組長", description: "行動派刑警，與陸修遠互補，在現場互相提供絕對信任。" },
          { targetName: "林曉微", relationType: "助理 / 學生", description: "協助整理繁雜案件檔案與法醫檢驗報告的可靠幫手。" },
          { targetName: "「莫里亞蒂」代號X", relationType: "幕後對手", description: "多次在案發現場留下指向哥哥失蹤案的挑釁密碼。" },
        ],
      },
    ],
  };
}

export function createBlankTemplate(): CharacterProfileData {
  return { templateId: "blank", basic: { name: "" }, sections: [], tabs: [] };
}

const section = (type: CharacterSection["type"], title: string, data: Partial<CharacterSection> = {}): CharacterSection => ({ id: `sec_${nanoid()}`, type, title, ...data });
const fields = (title: string, labels: string[]) => section("key_value", title, { keyValues: labels.map((key) => ({ key, value: "" })) });
const group = (title: string, contents: CharacterSection[]) => section("group", title, { contents });
const prose = (title: string) => section("rich_text", title, { richText: "" });
const inventory = () => section("statistics", "攜帶物品", { statisticHeaders: { label: "物品", description: "介紹", value: "數量", unit: "單位" }, statistics: [] });

// Field references: official D&D 5e character sheet and Chaosium's 7e sheets.
// These are editable record templates; derived values are entered by the user.
export function createDnd5eTemplate(): CharacterProfileData {
  return {
    templateId: "dnd5e", basic: { name: "", role: "例如：戰士", affiliation: "例如：冒險小隊" },
    sections: [
      group("角色資料", [fields("冒險者", ["職業與等級", "種族", "背景", "陣營", "經驗值", "玩家姓名"])]),
      group("能力與戰鬥", [
        section("stats", "六項能力", { stats: ["力量 STR", "敏捷 DEX", "體質 CON", "智力 INT", "感知 WIS", "魅力 CHA"].map((label) => ({ label, value: 10, max: 30 })) }),
        fields("戰鬥狀態", ["熟練加值", "護甲等級 AC", "先攻", "速度", "生命值上限", "目前生命值", "暫時生命值", "生命骰", "死亡豁免成功", "死亡豁免失敗"]),
        fields("豁免", ["力量豁免", "敏捷豁免", "體質豁免", "智力豁免", "感知豁免", "魅力豁免"]),
        fields("技能", ["特技", "馴養動物", "奧秘", "運動", "欺瞞", "歷史", "洞悉", "威嚇", "調查", "醫藥", "自然", "察覺", "表演", "說服", "宗教", "巧手", "隱匿", "求生"]),
        prose("攻擊與武器"), prose("特性與專長"),
      ]),
      group("背景", [prose("個性特質"), prose("理念"), prose("牽絆"), prose("缺點"), prose("角色經歷")]),
    ],
    tabs: [
      { id: `tab_${nanoid()}`, title: "法術", sections: [group("施法", [fields("施法資料", ["施法職業", "施法能力", "法術豁免 DC", "法術攻擊加值"]), fields("法術位（總數／已用）", ["1環", "2環", "3環", "4環", "5環", "6環", "7環", "8環", "9環"]), prose("戲法"), prose("已知與準備法術")])] },
      { id: `tab_${nanoid()}`, title: "裝備", sections: [group("物資", [inventory(), fields("貨幣", ["銅幣", "銀幣", "琥珀金幣", "金幣", "白金幣"]), prose("語言與工具熟練")])] },
    ],
  };
}

export function createCoc7eTemplate(): CharacterProfileData {
  return {
    templateId: "coc7e", basic: { name: "", role: "例如：記者", affiliation: "例如：調查團隊" },
    sections: [
      group("調查員資料", [fields("身分", ["職業", "玩家姓名", "時代", "居住地", "出生地"])]),
      group("能力與狀態", [
        section("stats", "八項能力", { stats: ["力量 STR", "體質 CON", "體型 SIZ", "敏捷 DEX", "外貌 APP", "智力 INT", "意志 POW", "教育 EDU"].map((label) => ({ label, value: 0, max: 100 })) }),
        fields("狀態", ["生命值 HP", "魔法值 MP", "理智 SAN", "幸運", "移動率 MOV", "傷害加值", "體格", "重傷／瀕死", "暫時／不定性瘋狂"]),
        fields("技能（一般／困難／極難）", ["會計", "人類學", "估價", "考古學", "攀爬", "喬裝", "閃避", "汽車駕駛", "電氣維修", "急救", "歷史", "法律", "圖書館使用", "聆聽", "鎖匠", "機械維修", "醫學", "博物學", "導航", "神秘學", "說服", "心理學", "偵查", "潛行", "游泳", "投擲", "信用評級", "克蘇魯神話"]),
        prose("專業技能與語言"), prose("戰鬥技能與武器"),
      ]),
      group("背景故事", [prose("個人描述"), prose("思想與信念"), prose("重要之人"), prose("意義非凡之地"), prose("珍視之物"), prose("特質"), prose("傷疤、恐懼與躁狂")]),
    ],
    tabs: [
      { id: `tab_${nanoid()}`, title: "物品與資產", sections: [group("物資", [inventory(), fields("資產", ["現金", "消費水平", "資產"]), prose("裝備與重要文件")])] },
      { id: `tab_${nanoid()}`, title: "調查紀錄", sections: [group("案件", [prose("線索與推論"), prose("接觸的神話存在"), prose("典籍與法術")])] },
    ],
  };
}
