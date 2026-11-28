import { civilAdvance } from "../civilPeriods";
import { defaultPreferences, financeRows, isTransfer, type FinanceRecord, type FinancePayloads, type RecurringTerms } from "./model";
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
      add(tx.account, -amount - BigInt(tx.interest ?? "0"));
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

function financeConverter(prefs: FinancePayloads["preferences"]) {
  const history=new Map<string,NonNullable<FinancePayloads["preferences"]["rateHistory"]>>();
  for(const rate of prefs.rateHistory??[]){
    if(rate.base!==prefs.currency)continue;
    const rows=history.get(rate.currency)??[];
    rows.push(rate);
    history.set(rate.currency,rows);
  }
  for(const rows of history.values())rows.sort((a,b)=>a.date.localeCompare(b.date));
  return (amount:bigint,currency:string,date?:string)=>{
    if(currency===prefs.currency)return amount;
    const rows=date?history.get(currency):undefined;
    let rate=prefs.rates[currency];
    if(rows&&date){
      let start=0,end=rows.length;
      while(start<end){
        const mid=(start+end)>>>1;
        if(rows[mid].date<=date)start=mid+1;
        else end=mid;
      }
      if(start===0)return null;
      rate=rows[start-1].rate;
    }
    return rate?exchange(amount,currency,prefs.currency,rate):null;
  };
}

export function convertFinance(amount: bigint, currency: string, prefs: FinancePayloads["preferences"], date?:string) {
  return financeConverter(prefs)(amount,currency,date);
}

export function latestAssetValues(records: FinanceRecord[], through: string) {
  const latest = new Map<string, FinanceRecord<"asset">>();
  for (const row of financeRows(records, "asset")) {
    const key = row.payload.series || row.id;
    const prior=latest.get(key);
    if (row.payload.date <= through && (!prior || prior.payload.date < row.payload.date
      || prior.payload.date === row.payload.date && prior.updated_at < row.updated_at)) latest.set(key, row);
  }
  return [...latest.values()];
}

export function goalProgress(records: FinanceRecord[], goal: FinanceRecord<"goal">, through: string, balances = accountBalances(records, through)) {
  const manual = financeRows(records, "contribution").filter(row => row.payload.goal === goal.id && row.payload.date <= through)
    .reduce((sum, row) => sum + BigInt(row.payload.amount), BigInt(0));
  if (goal.payload.progress !== "balance") return manual;
  const balance = balances.get(goal.payload.account) ?? BigInt(0);
  return manual + (balance > BigInt(0) ? balance : BigInt(0));
}

export function financeTotals(records: FinanceRecord[], start: string, end: string) {
  const prefs = financeRows(records, "preferences")[0]?.payload ?? defaultPreferences;
  const accounts = financeRows(records, "account");
  const accountById = new Map(accounts.map(row => [row.id, row.payload]));
  const balances = accountBalances(records, end);
  const missing = new Set<string>();
  const converter=financeConverter(prefs);
  const convert = (amount: bigint, currency: string, date=end) => {
    if (amount === BigInt(0)) return BigInt(0);
    const converted = converter(amount,currency,date);
    if (converted === null) missing.add(currency);
    return converted ?? BigInt(0);
  };
  let income = BigInt(0), expense = BigInt(0), assets = BigInt(0), debts = BigInt(0);
  const categories = new Map<string, bigint>();
  const addValue = (value: bigint) => { if (value < BigInt(0)) debts -= value; else assets += value; };
  for (const account of accounts) addValue(convert(balances.get(account.id) ?? BigInt(0), account.payload.currency));
  for (const { payload } of latestAssetValues(records, end)) {
    addValue(convert(BigInt(payload.amount) * (payload.type === "liability" ? -BigInt(1) : BigInt(1)), payload.currency));
  }
  const portfolios = holdings(records, end);
  for (const item of portfolios) {
    if (item.market !== null) addValue(convert(item.market, item.instrument.payload.currency));
  }
  for (const { payload } of financeRows(records, "transaction")) {
    if (payload.date < start || payload.date > end || payload.type !== "income" && payload.type !== "expense" && !(payload.type === "repayment" && payload.interest)) continue;
    const account = accountById.get(payload.account);
    if (!account) continue;
    const value = convert(BigInt(payload.type === "repayment" ? payload.interest ?? "0" : payload.amount), account.currency,payload.date);
    if (payload.type === "income") income += value;
    else {
      expense += value;
      const category = payload.category || (payload.type === "repayment" ? "貸款利息" : "未分類");
      categories.set(category, (categories.get(category) ?? BigInt(0)) + value);
    }
  }
  return { prefs, balances, income, expense, assets, debts, net: assets - debts, categories, missing: [...missing], portfolios };
}

export function hasHistoricalNet(records: FinanceRecord[], through: string, totals = financeTotals(records, through, through)) {
  const accounts = financeRows(records, "account");
  const assets = latestAssetValues(records, through);
  const datedAccount = accounts.some(row => row.payload.opened && row.payload.opened <= through);
  const datedActivity = (["transaction", "trade"] as const).some(kind =>
    financeRows(records, kind).some(row => row.payload.date <= through));
  if (!datedAccount && !datedActivity && !assets.length) return false;
  if (totals.missing.length || accounts.some(row => !row.payload.opened && BigInt(row.payload.opening) !== BigInt(0))) return false;
  if (totals.portfolios.some(item => item.quantity > BigInt(0) && (!item.instrument.payload.prices || item.market === null))) return false;
  const foreignCurrencies = [
    ...accounts.filter(row => totals.balances.get(row.id)).map(row => row.payload.currency),
    ...assets.filter(row => BigInt(row.payload.amount) > BigInt(0)).map(row => row.payload.currency),
    ...totals.portfolios.filter(item => item.market).map(item => item.instrument.payload.currency),
  ];
  return foreignCurrencies.every(code => code === totals.prefs.currency || totals.prefs.rateHistory?.some(rate =>
    rate.base === totals.prefs.currency && rate.currency === code && rate.date <= through));
}

export function recurringTerms(series: FinancePayloads["subscription"], date: string): RecurringTerms {
  return series.overrides?.[date] ?? series;
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
      if (!["expense", "income", "transfer"].includes(payload.type) || sources.has(payload.source) || !subscriptions.has(payload.source.split("|")[0])) throw Error("此期訂閱已記帳或來源無效");
      sources.add(payload.source);
    }
  }
  for (const { payload: series } of financeRows(records, "subscription")) {
    for (const payload of [series, ...Object.values(series.overrides ?? {})]) {
      if (payload.account && accounts.get(payload.account)?.currency !== payload.currency) throw Error("週期交易與帳戶幣別須一致");
      if (payload.type === "transfer") {
        const target = accounts.get(payload.target ?? "");
        if (!target || target.currency === payload.currency && BigInt(payload.amount) !== BigInt(payload.targetAmount!)) {
          throw Error("請確認週期轉帳的目的帳戶與金額");
        }
      }
    }
  }
  const allocatedAccounts = new Set<string>();
  for (const { payload } of financeRows(records, "goal")) {
    if (payload.account && accounts.get(payload.account)?.currency !== payload.currency) throw Error("目標與關聯帳戶幣別須一致");
    if (payload.progress === "balance" && payload.state !== "archived" && payload.state !== "completed") {
      if (allocatedAccounts.has(payload.account)) throw Error("此帳戶已用於另一個進行中或暫停目標");
      allocatedAccounts.add(payload.account);
    }
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
