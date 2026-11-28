import type { LifeSyncBase } from "../syncRecords";
import { currencies, decimalUnits, isUnits } from "./money";

export const accountKinds = { cash: "現金", bank: "銀行帳戶", card: "信用卡", wallet: "電子錢包", broker: "投資帳戶", loan: "貸款", other: "其他" } as const;
export const transactionKinds = { income: "收入", expense: "支出", transfer: "轉帳", cardPayment: "信用卡繳款", adjustment: "餘額調整", repayment: "清償貸款" } as const;
export const optionalFinanceSections = { budget:"預算", subscription:"訂閱", asset:"資產負債", goal:"財務目標", instrument:"投資" } as const;
export type OptionalFinanceSection = keyof typeof optionalFinanceSections;
export const defaultCategories = ["餐飲", "交通", "居住", "日用品", "娛樂", "訂閱", "醫療", "學習", "薪資", "其他"];
type Common = { title: string; notes: string };
export type RecurringTerms = Common & {
  amount: string; currency: string; account: string; category: string;
  type?: "expense" | "income" | "transfer"; target?: string; targetAmount?: string;
};
export type FinancePayloads = {
  account: Common & { type: keyof typeof accountKinds; currency: string; opening: string; icon: string; color: string; archived: boolean; opened?: string;
    limit: string; statementDay: number; paymentDay: number; due: string };
  transaction: Common & { type: keyof typeof transactionKinds; date: string; amount: string; account: string; target: string;
    targetAmount: string; interest?: string; category: string; attachment: string; source: string };
  estimate: Common & { date: string; amount: string; currency: string; category: string };
  preferences: { currency: string; rates: Record<string, string>; rateHistory?:{date:string;base:string;currency:string;rate:string}[]; categories: string[]; hiddenSections?: OptionalFinanceSection[]; showCalendarTransactions?: boolean };
  budget: Common & { month: string; category: string; amount: string; currency: string };
  subscription: RecurringTerms & { cycle: "week" | "month" | "quarter" | "year" | "custom"; interval: number;
    anchorDay: number; next: string; account: string; category: string; state: "active" | "paused" | "cancelled";
    trial: string; url: string; icon: string; until?: string; skipped?: string[]; overrides?: Record<string, RecurringTerms> };
  asset: Common & { type: "asset" | "liability"; currency: string; amount: string; date: string; due: string; series: string };
  goal: Common & { currency: string; amount: string; due: string; icon: string; color: string; account: string; state?: "active" | "paused" | "completed" | "archived"; progress?: "manual" | "balance" };
  contribution: Common & { goal: string; amount: string; date: string };
  instrument: Common & { type: "stock" | "etf" | "fund" | "other"; currency: string; price: string; prices?: Record<string,string> };
  trade: Common & { instrument: string; type: "buy" | "sell" | "dividend"; date: string; quantity: string; price: string; fee: string; account?: string };
};
export type FinanceKind = keyof FinancePayloads;
export type FinanceRecord<K extends FinanceKind = FinanceKind> = K extends FinanceKind
  ? LifeSyncBase & { kind: K; payload: FinancePayloads[K] } : never;
export const financeKinds: FinanceKind[] = ["account", "transaction", "estimate", "preferences", "budget", "subscription", "asset", "goal", "contribution", "instrument", "trade"];
export const preferencesId = (owner: string | null) => "finance-preferences:" + JSON.stringify(owner);
export const defaultPreferences: FinancePayloads["preferences"] = { currency: "TWD", rates: {}, categories: defaultCategories };

export function financeRows<K extends FinanceKind>(records: FinanceRecord[], kind: K): FinanceRecord<K>[] {
  return records.filter(row => row.kind === kind) as FinanceRecord<K>[];
}
export function financeRow<K extends FinanceKind>(owner: string | null, kind: K, payload: FinancePayloads[K], id: string = crypto.randomUUID()): FinanceRecord<K> {
  const now = Date.now();
  return { id, kind, payload, workspace_owner_id: owner, revision: 0, created_at: now, updated_at: now, deleted_at: null } as FinanceRecord<K>;
}

export function financeDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + "T00:00:00Z");
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
const units = (value: string, negative = false) => isUnits(value) && (negative || BigInt(value) >= BigInt(0));
const allowedDay = (day: number) => Number.isInteger(day) && day >= 1 && day <= 31;
export function validateFinance(row: FinanceRecord) {
  if (!financeKinds.includes(row.kind) || !row.payload || typeof row.payload !== "object") throw Error("財務資料格式無效");
  if ("title" in row.payload && (!row.payload.title.trim() || row.payload.title.length > 160 || row.payload.notes.length > 4000)) throw Error("請確認名稱及備註長度");
  if ("currency" in row.payload && !currencies.includes(row.payload.currency)) throw Error("請選擇支援的幣別");
  let valid: boolean;
  switch (row.kind) {
    case "account": {
      const p = row.payload;
      valid = Object.hasOwn(accountKinds, p.type) && units(p.opening, true) && units(p.limit)
        && (!p.opened||financeDate(p.opened)) && /^#[0-9a-fA-F]{6}$/.test(p.color)
        && allowedDay(p.statementDay) && allowedDay(p.paymentDay) && (!p.due || financeDate(p.due));
      break;
    }
    case "transaction": {
      const p = row.payload;
      valid = Object.hasOwn(transactionKinds, p.type) && financeDate(p.date) && !!p.account
        && (p.interest === undefined || p.type === "repayment" && units(p.interest))
        && units(p.amount, p.type === "adjustment") && BigInt(p.amount) !== BigInt(0)
        && (isTransfer(p.type) ? !!p.target && p.account !== p.target && units(p.targetAmount) && BigInt(p.targetAmount) > BigInt(0) : !p.target);
      break;
    }
    case "estimate": valid=financeDate(row.payload.date)&&units(row.payload.amount)&&BigInt(row.payload.amount)>BigInt(0); break;
    case "preferences":
      valid = row.id === preferencesId(row.workspace_owner_id) && Array.isArray(row.payload.categories)
        && (row.payload.hiddenSections===undefined||Array.isArray(row.payload.hiddenSections)&&row.payload.hiddenSections.every(key=>Object.hasOwn(optionalFinanceSections,key)))
        && (row.payload.rateHistory===undefined||Array.isArray(row.payload.rateHistory)&&row.payload.rateHistory.length<=1000
          &&new Set(row.payload.rateHistory.map(rate=>rate&&JSON.stringify([rate.base,rate.currency,rate.date]))).size===row.payload.rateHistory.length
          &&row.payload.rateHistory.every(rate=>rate&&currencies.includes(rate.base)&&currencies.includes(rate.currency)&&rate.base!==rate.currency
            &&typeof rate.date==="string"&&financeDate(rate.date)&&typeof rate.rate==="string"&&decimalUnits(rate.rate,8)>BigInt(0)))
        && Object.entries(row.payload.rates).every(([currency, rate]) => currencies.includes(currency) && decimalUnits(rate, 8) > BigInt(0));
      break;
    case "budget": valid = financeDate(row.payload.month + "-01") && units(row.payload.amount); break;
    case "subscription": {
      const p = row.payload;
      valid = (p.overrides === undefined || Object.entries(p.overrides).every(([date, terms]) =>
        financeDate(date) && !!terms.title.trim() && terms.title.length <= 160 && terms.notes.length <= 4000
        && currencies.includes(terms.currency) && units(terms.amount)
        && (terms.type === undefined || ["expense", "income", "transfer"].includes(terms.type))
        && (terms.type !== "transfer" || !!terms.account && !!terms.target && terms.account !== terms.target
          && units(terms.targetAmount ?? "") && BigInt(terms.targetAmount!) > BigInt(0))))
        && units(p.amount) && financeDate(p.next) && (!p.until || financeDate(p.until))
        && (p.type === undefined || ["expense", "income", "transfer"].includes(p.type))
        && (p.type !== "transfer" || !!p.account && !!p.target && p.account !== p.target && units(p.targetAmount ?? "") && BigInt(p.targetAmount!) > BigInt(0))
        && (p.skipped === undefined || Array.isArray(p.skipped) && p.skipped.every(financeDate) && new Set(p.skipped).size === p.skipped.length) && (!p.trial || financeDate(p.trial))
        && ["week", "month", "quarter", "year", "custom"].includes(p.cycle)
        && ["active", "paused", "cancelled"].includes(p.state) && Number.isInteger(p.interval) && p.interval > 0 && p.interval <= 3650
        && allowedDay(p.anchorDay) && (!p.url || /^https?:\/\//i.test(p.url));
      break;
    }
    case "asset": valid = ["asset", "liability"].includes(row.payload.type) && units(row.payload.amount)
      && financeDate(row.payload.date) && (!row.payload.due || financeDate(row.payload.due)); break;
    case "goal": valid = (row.payload.state === undefined || ["active", "paused", "completed", "archived"].includes(row.payload.state))
      && (row.payload.progress === undefined || row.payload.progress === "manual" || row.payload.progress === "balance" && !!row.payload.account)
      && /^#[0-9a-fA-F]{6}$/.test(row.payload.color) && units(row.payload.amount) && BigInt(row.payload.amount) > BigInt(0) && (!row.payload.due || financeDate(row.payload.due)); break;
    case "contribution": valid = !!row.payload.goal && units(row.payload.amount, true) && financeDate(row.payload.date); break;
    case "instrument": valid = ["stock", "etf", "fund", "other"].includes(row.payload.type)
      && (row.payload.price === "" || units(row.payload.price))
      && (!row.payload.prices||Object.entries(row.payload.prices).every(([date,value])=>financeDate(date)&&units(value))); break;
    case "trade": valid = !!row.payload.instrument && ["buy", "sell", "dividend"].includes(row.payload.type)
      && financeDate(row.payload.date) && units(row.payload.quantity) && units(row.payload.price) && units(row.payload.fee)
      && (row.payload.type === "dividend" || BigInt(row.payload.quantity) > BigInt(0)); break;
  }
  if (!valid) throw Error("財務欄位格式或金額不符");
}
export const isTransfer = (type: FinancePayloads["transaction"]["type"]) => ["transfer", "cardPayment", "repayment"].includes(type);
export const isDebt = (type: FinancePayloads["account"]["type"]) => type === "card" || type === "loan";
