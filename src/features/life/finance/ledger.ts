import { civilAdvance } from "../civilPeriods";
import { defaultPreferences, financeRows, isTransfer, type FinanceRecord, type FinancePayloads } from "./model";
import { exchange, roundRatio } from "./money";

export function accountBalances(records: FinanceRecord[], through = "9999-12-31") {
  const balances = new Map(financeRows(records, "account").filter(account=>!account.payload.opened||account.payload.opened<=through).map(account => [account.id, BigInt(account.payload.opening)]));
  const add = (id: string, value: bigint) => {
    if (balances.has(id)) balances.set(id, balances.get(id)! + value);
  };
  for (const { payload: tx } of financeRows(records, "transaction")) {
    if (tx.date > through) continue;
    const amount = BigInt(tx.amount);
    if (isTransfer(tx.type)) {
      add(tx.account, -amount);
      add(tx.target, BigInt(tx.targetAmount));
    } else add(tx.account, tx.type === "expense" ? -amount : amount);
  }
  for(const {payload:trade} of financeRows(records,"trade")){
    if(!trade.account||trade.date>through)continue;
    const fee=BigInt(trade.fee),price=BigInt(trade.price);
    const value=trade.type==="dividend"?price:roundRatio(price*BigInt(trade.quantity),BigInt(1000000));
    add(trade.account,(trade.type==="buy"?-value:value)-fee);
  }
  return balances;
}

export function convertFinance(amount: bigint, currency: string, prefs: FinancePayloads["preferences"]) {
  if (currency === prefs.currency) return amount;
  const rate = prefs.rates[currency];
  return rate ? exchange(amount, currency, prefs.currency, rate) : null;
}

export function financeTotals(records: FinanceRecord[], start: string, end: string) {
  const prefs = financeRows(records, "preferences")[0]?.payload ?? defaultPreferences;
  const accounts = financeRows(records, "account");
  const accountById = new Map(accounts.map(row => [row.id, row.payload]));
  const balances = accountBalances(records, end);
  const missing = new Set<string>();
  const convert = (amount: bigint, currency: string) => {
    if (amount === BigInt(0)) return BigInt(0);
    const converted = convertFinance(amount, currency, prefs);
    if (converted === null) missing.add(currency);
    return converted ?? BigInt(0);
  };
  let income = BigInt(0), expense = BigInt(0), assets = BigInt(0), debts = BigInt(0);
  const categories = new Map<string, bigint>();
  const addValue = (value: bigint) => { if (value < BigInt(0)) debts -= value; else assets += value; };
  for (const account of accounts) addValue(convert(balances.get(account.id) ?? BigInt(0), account.payload.currency));
  const latest = new Map<string, FinanceRecord<"asset">>();
  for (const row of financeRows(records, "asset")) {
    const key = row.payload.series || row.id;
    const prior=latest.get(key);
    if (row.payload.date <= end && (!prior || prior.payload.date < row.payload.date
      || prior.payload.date === row.payload.date && prior.updated_at < row.updated_at)) latest.set(key, row);
  }
  for (const { payload } of latest.values()) addValue(convert(BigInt(payload.amount) * (payload.type === "liability" ? -BigInt(1) : BigInt(1)), payload.currency));
  const portfolios = holdings(records, end);
  for (const item of portfolios) {
    if (item.market !== null) addValue(convert(item.market, item.instrument.payload.currency));
  }
  for (const { payload } of financeRows(records, "transaction")) {
    if (payload.date < start || payload.date > end || payload.type !== "income" && payload.type !== "expense") continue;
    const account = accountById.get(payload.account);
    if (!account) continue;
    const value = convert(BigInt(payload.amount), account.currency);
    if (payload.type === "income") income += value;
    else {
      expense += value;
      const category = payload.category || "未分類";
      categories.set(category, (categories.get(category) ?? BigInt(0)) + value);
    }
  }
  return { prefs, balances, income, expense, assets, debts, net: assets - debts, categories, missing: [...missing], portfolios };
}

export function subscriptionNext(subscription: FinancePayloads["subscription"]) {
  const { cycle, next, interval, anchorDay } = subscription;
  if (cycle === "week" || cycle === "custom") return civilAdvance(next, cycle === "custom" ? "day" : "week", interval);
  return civilAdvance(next, "month", interval * (cycle === "quarter" ? 3 : cycle === "year" ? 12 : 1), anchorDay);
}

export function subscriptionMonthly(subscription: FinancePayloads["subscription"]) {
  const months = { week: 0, custom: 0, month: 1, quarter: 3, year: 12 }[subscription.cycle];
  return months ? roundRatio(BigInt(subscription.amount), BigInt(months * subscription.interval))
    : roundRatio(BigInt(subscription.amount) * BigInt(365), BigInt((subscription.cycle === "week" ? 7 : 1) * subscription.interval * 12));
}

/** Moving weighted-average cost. A partial sale allocates rounded cost, the final sale releases the remainder. */
export function holdings(records: FinanceRecord[], through = "9999-12-31") {
  const trades = financeRows(records, "trade").filter(row => row.payload.date <= through)
    .sort((a, b) => a.payload.date.localeCompare(b.payload.date) || a.created_at - b.created_at || a.id.localeCompare(b.id));
  return financeRows(records, "instrument").map(instrument => {
    let quantity = BigInt(0), cost = BigInt(0), realized = BigInt(0), dividends = BigInt(0), invested = BigInt(0);
    for (const { payload: trade } of trades) {
      if (trade.instrument !== instrument.id) continue;
      const units = BigInt(trade.quantity), price = BigInt(trade.price), fee = BigInt(trade.fee);
      if (trade.type === "dividend") { dividends += price - fee; continue; }
      const gross = roundRatio(price * units, BigInt(1000000));
      if (trade.type === "buy") {
        quantity += units;
        cost += gross + fee;
        invested += gross + fee;
      } else {
        if (units > quantity) throw Error("賣出數量超過該日期可用持倉");
        const released = roundRatio(cost * units, quantity);
        realized += gross - fee - released;
        cost -= released;
        quantity -= units;
      }
    }
    const history=instrument.payload.prices;
    const price=history?history[Object.keys(history).filter(date=>date<=through).sort().at(-1)??""]:instrument.payload.price;
    const market = !price && quantity > BigInt(0) ? null
      : roundRatio(BigInt(price || "0") * quantity, BigInt(1000000));
    return { instrument, quantity, cost, realized, dividends, invested, market, unrealized: market === null ? null : market - cost };
  });
}

export function validateFinanceRelations(records: FinanceRecord[]) {
  const accounts = new Map(financeRows(records, "account").map(row => [row.id, row.payload]));
  const goals = new Set(financeRows(records, "goal").map(row => row.id));
  const instruments = new Map(financeRows(records, "instrument").map(row => [row.id,row.payload]));
  const subscriptions = new Set(financeRows(records, "subscription").map(row => row.id));
  const sources = new Set<string>();
  for (const { payload } of financeRows(records, "transaction")) {
    const account = accounts.get(payload.account), target = accounts.get(payload.target);
    if (!account || (isTransfer(payload.type) && !target)) throw Error("交易引用不存在的帳戶");
    if (account.opened&&payload.date<account.opened||target?.opened&&payload.date<target.opened) throw Error("交易日期早於帳戶期初日期");
    if (target && account.currency === target.currency && BigInt(payload.amount) !== BigInt(payload.targetAmount)) throw Error("同幣別轉帳兩端金額須一致");
    if (payload.type === "cardPayment" && (target?.type !== "card" || account.type === "card")) throw Error("請選擇付款帳戶及信用卡");
    if (payload.type === "repayment" && target?.type !== "loan") throw Error("請選擇貸款帳戶");
    if (payload.source) {
      if (payload.type !== "expense" || sources.has(payload.source) || !subscriptions.has(payload.source.split("|")[0])) throw Error("此期訂閱已記帳或來源無效");
      sources.add(payload.source);
    }
  }
  for (const { payload } of financeRows(records, "subscription")) {
    if (payload.account && accounts.get(payload.account)?.currency !== payload.currency) throw Error("訂閱與付款帳戶幣別須一致");
  }
  for (const { payload } of financeRows(records, "goal")) {
    if (payload.account && accounts.get(payload.account)?.currency !== payload.currency) throw Error("目標與關聯帳戶幣別須一致");
  }
  for (const { payload } of financeRows(records, "contribution")) {
    if (!goals.has(payload.goal)) throw Error("仍有資金異動紀錄");
  }
  for (const { payload } of financeRows(records, "trade")) {
    const instrument=instruments.get(payload.instrument);
    if (!instrument) throw Error("仍有投資交易紀錄");
    if (payload.account && accounts.get(payload.account)?.currency !== instrument.currency) throw Error("交割帳戶與投資標的幣別須一致");
  }
  const budgets=new Set<string>();
  for(const {payload} of financeRows(records,"budget")){
    const key=payload.month+"|"+payload.category;
    if(budgets.has(key))throw Error("同一月份與分類已有預算");
    budgets.add(key);
  }
  holdings(records);
}
