import { localDateInput } from "../../../lib/todoCalendar";
import { accountKinds, financeRows, isTransfer, transactionKinds, type FinanceKind, type FinanceRecord } from "./model";
import { currencies, currencyDigits, decimalText, decimalUnits, minorUnits } from "./money";

export type EditableKind = Exclude<FinanceKind, "preferences">;
type Field = { key: string; label: string; type?: "date" | "month" | "check" | "money" | "quantity" | "number" | "textarea" | "url" | "color";
  options?: [string, string][]; required?: boolean; currency?: string; lock?: boolean };
export type Draft = Record<string, string>;
const field = (key: string, label: string, type?: Field["type"], required = false): Field => ({ key, label, type, required });
const select = (key: string, label: string, options: [string, string][], required = false): Field => ({ key, label, options, required });
const currencyField = (lock = false): Field => ({ ...select("currency", "幣別", currencies.map(code => [code, code]), true), lock });
const moneyField = (key: string, label: string, currency: string, required = true): Field => ({ ...field(key, label, "money", required), currency });
const none: [string, string] = ["", "未指定"];
const named = <K extends FinanceKind,>(records: FinanceRecord[], kind: K) => financeRows(records, kind)
  .map(row => [row.id, "title" in row.payload ? row.payload.title : row.id] as [string, string]);

export const kindLabels: Record<EditableKind, string> = {
  account: "帳戶", transaction: "交易", estimate: "預估支出", budget: "預算", subscription: "訂閱", asset: "資產與負債",
  goal: "財務目標", contribution: "資金異動", instrument: "投資標的", trade: "投資交易",
};

export function initialDraft(kind: EditableKind, base: string, anchor: Date): Draft {
  const date = localDateInput(anchor);
  return { title: "", notes: "", currency: base, date, month: date.slice(0, 7), due: "", amount: "", icon: "", color: "#668377",
    opening: "0", limit: "0", statementDay: "1", paymentDay: "1", archived: "",
    type: { account: "cash", transaction: "expense", asset: "asset", instrument: "stock", trade: "buy" }[kind as "account"] ?? "",
    account: "", target: "", targetAmount: "", category: "", attachment: "", source: "",
    cycle: "month", interval: "1", anchorDay: date.slice(8, 10), next: date, state: "active", trial: "", url: "",
    series: "", opened: date, priceDate: date, goal: "", instrument: "", quantity: "", price: "", fee: "0",
  };
}

export function fieldsFor(kind: EditableKind, draft: Draft, records: FinanceRecord[], categories: string[], existing = false): Field[] {
  const accounts = financeRows(records, "account");
  const account = accounts.find(row => row.id === draft.account)?.payload;
  const target = accounts.find(row => row.id === draft.target)?.payload;
  const unit = draft.currency;
  const accountOptions: [string, string][] = [none, ...accounts.filter(row => !row.payload.archived || row.id === draft.account || row.id === draft.target)
    .map(row => [row.id, row.payload.title + " (" + row.payload.currency + ")"] as [string, string])];
  const classification = select("category", "分類", [none, ...categories.map(item => [item, item] as [string, string])]);
  const note = field("notes", "備註", "textarea");
  const title = field("title", "名稱", undefined, true);
  switch (kind) {
    case "account":
      return [title, select("type", "帳戶類型", Object.entries(accountKinds)), currencyField(existing),
        moneyField("opening", "期初餘額（負債請填負數）", unit), field("opened","期初日期","date",true), field("icon", "圖示"), field("color", "顏色", "color"), note,
        ...(draft.type === "card" ? [moneyField("limit", "信用額度", unit), field("statementDay", "結帳日", "number", true), field("paymentDay", "繳款日", "number", true)]
          : draft.type === "loan" ? [field("due", "貸款到期日", "date")] : []), field("archived", "封存帳戶", "check")];
    case "transaction": {
      const transfer = isTransfer(draft.type as Parameters<typeof isTransfer>[0]);
      return [title, select("type", "交易類型", Object.entries(transactionKinds), true), field("date", "交易日期", "date", true),
        select("account", transfer ? "轉出帳戶" : "帳戶", accountOptions, true), moneyField("amount", "金額", account?.currency ?? unit),
        ...(transfer ? [select("target", "轉入帳戶", accountOptions, true), ...(account?.currency === target?.currency ? [] : [moneyField("targetAmount", "轉入金額", target?.currency ?? unit)])] : [classification]), note];
    }
    case "estimate": return [title,field("date","預估日期","date",true),currencyField(),moneyField("amount","預估金額",unit),classification,note];
    case "budget": return [title, field("month", "預算月份", "month", true), classification, currencyField(), moneyField("amount", "預算金額", unit), note];
    case "subscription": return [title, field("icon", "圖示"), currencyField(), moneyField("amount", "每期金額", unit), select("account", "付款帳戶", accountOptions),
      classification, select("cycle", "付款週期", [["week","每週"],["month","每月"],["quarter","每季"],["year","每年"],["custom","自訂天數"]], true),
      field("interval", "週期間隔", "number", true), field("next", "下次扣款", "date", true), field("trial", "試用截止", "date"),
      select("state", "狀態", [["active","使用中"],["paused","暫停"],["cancelled","已取消"]], true), field("url", "取消訂閱連結", "url"), note];
    case "asset": return [title, select("type", "項目類型", [["asset","其他資產"],["liability","其他負債"]], true), currencyField(), moneyField("amount", "估值", unit),
      field("date", "估值日期", "date", true), field("due", "到期日", "date"), note];
    case "goal": return [title, currencyField(existing), moneyField("amount", "目標金額", unit), field("due", "目標日期", "date"), field("icon", "圖示"), field("color", "顏色", "color"),
      select("account", "關聯帳戶（選填）", accountOptions), note];
    case "contribution": {
      const goal = financeRows(records, "goal").find(item => item.id === draft.goal);
      return [title, select("goal", "財務目標", [none, ...named(records, "goal")], true),
        moneyField("amount", "增加或減少金額", goal?.payload.currency ?? unit), field("date", "日期", "date", true), note];
    }
    case "instrument": return [title, select("type", "類型", [["stock","股票"],["etf","ETF"],["fund","基金"],["other","其他"]], true),
      currencyField(existing), moneyField("price", "目前單價（手動估值）", unit, false), field("priceDate","估值日期","date",true), note];
    case "trade": {
      const instrument = financeRows(records, "instrument").find(item => item.id === draft.instrument);
      const currency = instrument?.payload.currency ?? unit;
      return [title, select("instrument", "投資標的", [none, ...named(records, "instrument")], true),
        select("type", "交易類型", [["buy","買入"],["sell","賣出"],["dividend","股息或其他收益"]], true),
        field("date", "成交日期", "date", true),
        ...(draft.type === "dividend" ? [] : [field("quantity", "成交數量（最多六位小數）", "quantity", true)]),
        moneyField("price", draft.type === "dividend" ? "收益金額" : "成交單價", currency), moneyField("fee", "交易費用", currency), select("account","交割帳戶（選填）",accountOptions), note];
    }
  }
}

export function populateDraft(row: FinanceRecord, base: string, anchor: Date, records: FinanceRecord[], categories: string[]) {
  if (row.kind === "preferences") throw Error("請由財務設定編輯偏好");
  const draft = initialDraft(row.kind, base, anchor);
  for (const [key, value] of Object.entries(row.payload)) draft[key] = typeof value === "boolean" ? value ? "1" : "" : String(value);
  if (row.kind==="instrument"&&row.payload.prices) draft.priceDate=Object.keys(row.payload.prices).sort().at(-1)??draft.priceDate;
  for (const item of fieldsFor(row.kind, draft, records, categories, true)) {
    if (item.type === "money" && draft[item.key] !== "") draft[item.key] = decimalText(BigInt(draft[item.key]), currencyDigits(item.currency ?? base));
    if (item.type === "quantity" && draft[item.key]) draft[item.key] = decimalText(BigInt(draft[item.key]), 6);
  }
  return draft;
}

export function encodeDraft(kind: EditableKind, draft: Draft, fields: Field[], offsets: { previousNext?: string } = {}) {
  const out: Record<string, string | number | boolean> = {};
  for (const field of fields) {
    const value = draft[field.key] ?? "";
    out[field.key] = field.type === "money" ? value || field.required ? minorUnits(value, field.currency!).toString() : ""
      : field.type === "quantity" ? decimalUnits(value, 6).toString()
      : field.type === "number" ? Number(value)
      : field.type === "check" ? !!value : value.trim();
  }
  if (kind === "account") Object.assign(out, { limit: out.limit ?? "0", statementDay: out.statementDay ?? 1, paymentDay: out.paymentDay ?? 1, due: out.due ?? "" });
  if (kind === "transaction") Object.assign(out, {
    target: out.target ?? "", targetAmount: out.target ? out.targetAmount ?? out.amount : "0",
    category: out.category ?? "", attachment: draft.attachment, source: draft.source,
  });
  if (kind === "subscription") out.anchorDay = offsets.previousNext === draft.next ? Number(draft.anchorDay) : Number(draft.next.slice(8, 10));
  if (kind === "asset") out.series = draft.series;
  if (kind === "trade") out.quantity = out.quantity ?? "0";
  return out;
}
