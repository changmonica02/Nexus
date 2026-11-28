import { confirmDialog } from "../../../lib/confirmDialog";
import { useEffect, useMemo, useState } from "react";
import AddMenu from "../AddMenu";
import { Eye, EyeOff, Settings } from "lucide-react";
import { localDateInput } from "../../../lib/todoCalendar";
import { civilAdvance } from "../civilPeriods";
import type { LifeRepository } from "../LifeRepository";
import { control, surface } from "../dashboard/styles";
import FinanceEditor, { type FinanceEdit } from "./FinanceEditor";
import { defaultPreferences, financeDate, financeRow, financeRows, preferencesId, optionalFinanceSections, accountKinds, isDebt, isTransfer, transactionKinds, type FinancePayloads, type FinanceRecord } from "./model";
import { convertFinance, financeTotals, goalProgress, hasHistoricalNet, latestAssetValues, recurringTerms, subscriptionMonthly } from "./ledger";
import { currencies, decimalText, money, roundRatio } from "./money";

const tabs = {
  overview: "總覽", transaction: "交易紀錄", subscription: "週期交易",
  account: "資金帳戶", instrument: "投資資產", asset: "其他資產與負債",
  budget: "預算", goal: "財務目標", analysis: "分析", settings: "設定",
} as const;
export type FinanceTab = keyof typeof tabs;
const navigation = [
  { title: "總覽", views: ["overview"] },
  { title: "收支", views: ["transaction", "subscription"] },
  { title: "資產", views: ["account", "instrument", "asset"] },
  { title: "規劃", views: ["budget", "goal"] },
  { title: "分析", views: ["analysis"] },
] as const;

export function financeTabFromUrl() {
  const value = new URLSearchParams(window.location.search).get("finance");
  return value && Object.hasOwn(tabs, value) ? value as FinanceTab : undefined;
}

const status = { active: "使用中", paused: "暫停", cancelled: "已取消" };

function Progress({ value, max, hidden }: { value: bigint; max: bigint; hidden?: boolean }) {
  if (hidden) return null;
  const ratio = max > BigInt(0) ? value * BigInt(100) / max : BigInt(0);
  const bounded = Number(ratio < BigInt(0) ? BigInt(0) : ratio > BigInt(100) ? BigInt(100) : ratio);
  return <div>
    <progress className={"h-2 w-full " + (ratio >= BigInt(100) ? "accent-red-600" : ratio >= BigInt(80) ? "accent-amber-600" : "accent-emerald-600")} max={100} value={bounded}/>
    <p className="text-sm opacity-75">{ratio.toString()}%{ratio > BigInt(100) ? " · 已超出" : ratio >= BigInt(80) ? " · 接近上限" : ""}</p>
  </div>;
}

function PreferenceEditor({ prefs, row, owner, repository, hide, setHide }: {
  prefs: FinancePayloads["preferences"]; row?: FinanceRecord<"preferences">; owner: string | null; repository: LifeRepository; hide: boolean; setHide: (hide: boolean) => void;
}) {
  const [draft, setDraft] = useState(prefs);
  const [categoryText, setCategoryText] = useState(prefs.categories.join("\n"));
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [historyDate,setHistoryDate]=useState("");
  const [historyCurrency,setHistoryCurrency]=useState("");
  const [historyRate,setHistoryRate]=useState("");
  return <form className={surface + " space-y-4"} onSubmit={async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const payload = { ...draft, rates: Object.fromEntries(Object.entries(draft.rates).filter(([, rate]) => !!rate.trim())),
        categories: [...new Set(categoryText.split("\n").map(line => line.trim()).filter(Boolean))] };
      await repository.saveFinance(row ? { ...row, payload } : financeRow(owner, "preferences", payload, preferencesId(owner)));
      setMessage("已儲存財務設定");
    } catch (error) { setMessage(error instanceof Error ? error.message : "儲存失敗"); }
    finally { setBusy(false); }
  }}>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={hide}
      onChange={event => setHide(event.target.checked)}/>隱藏財務金額</label>
    <label className="grid gap-1">基準幣別<select className={control} value={draft.currency}
      onChange={event => setDraft({ ...draft, currency: event.target.value, rates: {} })}>
      {currencies.map(code => <option key={code}>{code}</option>)}</select></label>
    <p className="text-sm opacity-75">每 1 單位外幣可換算的 {draft.currency} 金額。切換基準幣別後，請重新填寫所需匯率。</p>
    <div className="grid gap-2 sm:grid-cols-3">{currencies.filter(code => code !== draft.currency).map(code =>
      <label className="grid gap-1" key={code}>{code} 匯率<input className={control} inputMode="decimal" placeholder="未設定" value={draft.rates[code] ?? ""}
        onChange={event => setDraft({ ...draft, rates: { ...draft.rates, [code]: event.target.value } })}/></label>)}</div>
    <details><summary>歷史匯率</summary>
      <p className="my-2 text-sm">同一幣別有歷史匯率時，報表依交易日或結算日採用當日以前最近的一筆。</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1">生效日期<input className={control} type="date" value={historyDate} onChange={event=>setHistoryDate(event.target.value)}/></label>
        <label className="grid gap-1">外幣<select className={control} value={historyCurrency} onChange={event=>setHistoryCurrency(event.target.value)}>
          <option value="">請選擇</option>{currencies.filter(code=>code!==draft.currency).map(code=><option key={code}>{code}</option>)}
        </select></label>
        <label className="grid gap-1">歷史匯率<input className={control} inputMode="decimal" value={historyRate} onChange={event=>setHistoryRate(event.target.value)}/></label>
        <button type="button" className={control} disabled={!historyDate||!historyCurrency||historyCurrency===draft.currency||!historyRate.trim()} onClick={()=>{
          const next={base:draft.currency,currency:historyCurrency,date:historyDate,rate:historyRate.trim()};
          const history=(draft.rateHistory??[]).filter(rate=>rate.base!==next.base||rate.currency!==next.currency||rate.date!==next.date);
          setDraft({...draft,rateHistory:[...history,next]});setHistoryRate("");
        }}>加入或更新匯率</button>
      </div>
      <ul className="my-2 space-y-1">{(draft.rateHistory??[]).map((rate,index)=><li key={rate.base+":"+rate.currency+":"+rate.date} className="flex flex-wrap items-center gap-2">
        <span>{rate.date} · 1 {rate.currency} = {rate.rate} {rate.base}</span>
        <button type="button" className={control} onClick={()=>setDraft({...draft,rateHistory:draft.rateHistory?.filter((_,i)=>i!==index)})}>移除匯率</button>
      </li>)}</ul>
    </details>
    <fieldset className="flex flex-wrap gap-3"><legend className="font-semibold">啟用子功能</legend>
      {(Object.keys(optionalFinanceSections) as (keyof typeof optionalFinanceSections)[]).map(key=><label key={key} className="flex min-h-11 items-center gap-2">
        <input type="checkbox" checked={!draft.hiddenSections?.includes(key)} onChange={event=>setDraft({
          ...draft,hiddenSections:event.target.checked?(draft.hiddenSections??[]).filter(section=>section!==key):[...(draft.hiddenSections??[]),key],
        })}/>{optionalFinanceSections[key]}</label>)}
    </fieldset>
    <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={!!draft.showCalendarTransactions}
      onChange={event => setDraft({ ...draft, showCalendarTransactions: event.target.checked })}/>在日曆顯示一般已入帳交易</label>
    <label className="grid gap-1">分類（每行一項）<textarea rows={6} className={control} value={categoryText} onChange={event => setCategoryText(event.target.value)}/></label>
    <button className={control} disabled={busy}>儲存設定</button>{message && <p role="status">{message}</p>}
  </form>;
}

export default function FinanceWorkspace({ records, repository, owner, anchor, upload, download, requested, focusId, focusDate, selectedMonth, onMonthChange, hideAmounts, onHideChange }: {
  selectedMonth?: string; onMonthChange?: (month:string)=>void; hideAmounts?:boolean; onHideChange?:(hide:boolean)=>void;
  records: FinanceRecord[]; repository: LifeRepository; owner: string | null; anchor: Date;
  upload?: (file: File) => Promise<string>; download?: (id: string) => Promise<void>; requested?: FinanceTab; focusId?: string; focusDate?: string;
}) {
  const [selectedTab, setTab] = useState<FinanceTab>(() => requested ?? (typeof window !== "undefined" ? financeTabFromUrl() : undefined) ?? "overview");
  useEffect(() => {
    const update = () => setTab(financeTabFromUrl() ?? "overview");
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  const navigate = (next: FinanceTab) => {
    if (next === selectedTab) return;
    const url = new URL(window.location.href);
    url.searchParams.set("finance", next);
    window.history.pushState(null, "", url);
    setTab(next);
  };
  const [localMonth, setLocalMonth] = useState(()=>localDateInput(new Date()).slice(0, 7));
  const month=selectedMonth??localMonth;
  const setMonth=(next:string)=>{setLocalMonth(next);onMonthChange?.(next);};
  const [localHide, setLocalHide] = useState(false);
  const hide=hideAmounts??localHide;
  const setHide=(next:boolean)=>{setLocalHide(next);onHideChange?.(next);};
  const [transactionType, setTransactionType] = useState("all");
  const [analysisRange, setAnalysisRange] = useState("6");
  const [analysisFrom, setAnalysisFrom] = useState("");
  const [analysisTo, setAnalysisTo] = useState("");
  const [query, setQuery] = useState("");
  const [fromDate,setFromDate]=useState("");
  const [toDate,setToDate]=useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editor, setEditor] = useState<FinanceEdit | undefined>(() => {
    const row=records.find(item=>item.id===focusId);
    return row&&row.kind!=="preferences"?{kind:row.kind,row,occurrence: row.kind === "subscription" && row.payload.state === "active" ? focusDate : undefined}:focusId==="new-transaction"?{kind:"transaction"}:undefined;
  });
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const prefsRow = financeRows(records, "preferences")[0];
  const prefs = prefsRow?.payload ?? defaultPreferences;
  const hidden = prefs.hiddenSections ?? [];
  const shown = (key:FinanceTab)=>!hidden.some(section=>key===section);
  const tab=shown(selectedTab)?selectedTab:"overview";
  const activeGroup = navigation.find(group => group.views.some(view => view === tab));
  const today = localDateInput(new Date());
  const first = month + "-01";
  const last = civilAdvance(civilAdvance(first, "month", 1), "day", -1);
  const totals = useMemo(() => financeTotals(records, first, last), [records, first, last]);
  const current = useMemo(() => financeTotals(records, today, today), [records, today]);
  const isCurrentMonth = today.startsWith(month);
  const historicalNetAvailable = last < today && hasHistoricalNet(records, last, totals);
  const netValues = isCurrentMonth ? current : historicalNetAvailable ? totals : null;
  const accounts = financeRows(records, "account");
  const subscriptions = financeRows(records, "subscription");
  const budgets = financeRows(records, "budget").filter(row => row.payload.month === month);
  const goals = financeRows(records, "goal");
  const overviewGoals = goals.filter(row => !row.payload.state || row.payload.state === "active");
  const contributions = financeRows(records, "contribution");
  const write = (value: bigint, currency = prefs.currency) => hide ? "••••" : money(value, currency);
  const text = (row: FinanceRecord) => "title" in row.payload ? row.payload.title : "";
  const edit = (row: FinanceRecord) => { if (row.kind !== "preferences") setEditor({ kind: row.kind, row }); };
  const accountName = (id: string) => accounts.find(item => item.id === id)?.payload.title ?? "未指定";
  const empty = (label: string) => <p className={surface}>尚無{label}。</p>;
  const button = (title: string, action: () => void) => <button type="button" className={control} onClick={action}>{title}</button>;
  const actualRows = financeRows(records, "transaction");
  const recentRows = actualRows.filter(row => row.payload.date >= first && row.payload.date <= last).sort((a,b) => b.payload.date.localeCompare(a.payload.date));
  const transactionRows = actualRows.filter(({payload: p}) =>
    (transactionType === "all" || (transactionType === "transfer" ? isTransfer(p.type) : p.type === transactionType)) &&
    p.date >= (fromDate||first) && p.date <= (toDate||last) && (!accountFilter || p.account === accountFilter || p.target === accountFilter)
    && (!categoryFilter || p.category === categoryFilter) &&
    (p.title + " " + p.notes).toLowerCase().includes(query.trim().toLowerCase())).sort((a,b) => b.payload.date.localeCompare(a.payload.date));
  const upcoming = subscriptions.filter(row => row.payload.state === "active" && (!row.payload.until || row.payload.next <= row.payload.until)).sort((a,b) => a.payload.next.localeCompare(b.payload.next));
  let planned = BigInt(0);
  const withheld = new Set([...totals.missing, ...(isCurrentMonth || tab === "account" || tab === "asset" ? current.missing : [])]);
  for (const {payload} of upcoming.filter(row => !row.payload.type || row.payload.type === "expense")) {
    const converted = convertFinance(subscriptionMonthly(payload), payload.currency, prefs);
    if (converted === null) withheld.add(payload.currency); else planned += converted;
  }
  const reportFrom = analysisRange === "custom" ? analysisFrom : analysisRange === "year" ? month.slice(0, 4) + "-01-01"
    : civilAdvance(first, "month", 1 - Number(analysisRange));
  const reportTo = analysisRange === "custom" ? analysisTo : last;
  const reportValid = tab === "analysis" && financeDate(reportFrom) && financeDate(reportTo) && reportFrom <= reportTo
    && Number(reportTo.slice(0, 4)) - Number(reportFrom.slice(0, 4)) <= 10;
  const report = useMemo(() => reportValid ? financeTotals(records, reportFrom, reportTo) : undefined,
    [records, reportFrom, reportTo, reportValid]);
  const history = useMemo(() => {
    if (!reportValid) return [];
    const months = [];
    for (let start = reportFrom.slice(0, 7) + "-01"; start <= reportTo; start = civilAdvance(start, "month", 1)) {
      const end = civilAdvance(civilAdvance(start, "month", 1), "day", -1);
      const value = financeTotals(records, start < reportFrom ? reportFrom : start, end > reportTo ? reportTo : end);
      const historyAvailable = end <= reportTo && end < today && hasHistoricalNet(records, end, value);
      months.push({ start, end, ...value, historyAvailable });
    }
    return months;
  }, [records, reportFrom, reportTo, reportValid, today]);
  const fixedReport = useMemo(() => reportValid
    ? financeTotals(records.filter(row => row.kind !== "transaction" || row.payload.source), reportFrom, reportTo)
    : undefined, [records, reportFrom, reportTo, reportValid]);
  const trendMax=history.flatMap(item=>[item.income,item.expense]).reduce((maximum,value)=>value>maximum?value:maximum,BigInt(1));
  const shareColors=["#6b8d75","#bb9d74","#809ab7","#a085ad","#9d9d78","#ba8275"];
  const breakdown=[...totals.categories].sort((a,b)=>a[1]===b[1]?0:a[1]>b[1]?-1:1).map(([label,value],index)=>({
    label,value,color:shareColors[index%shareColors.length],
  }));
  let cumulative=BigInt(0);
  const gradient=totals.expense>BigInt(0)?breakdown.map(({value,color})=>{
    const from=Number(cumulative*BigInt(10000)/totals.expense)/100;
    cumulative+=value;
    const to=Number(cumulative*BigInt(10000)/totals.expense)/100;
    return `${color} ${from}% ${to}%`;
  }).join(", "):"";
  const rowList = (items: FinanceRecord[], details: (item: FinanceRecord) => React.ReactNode, label: string) => items.length
    ? <ul className="divide-y divide-[var(--color-border)]">{items.map(row => <li key={row.id}>
      <button type="button" className="min-h-11 w-full break-words py-2 text-left" onClick={() => edit(row)}>
        <strong>{text(row)}</strong><div className="text-sm opacity-80">{details(row)}</div>
      </button></li>)}</ul> : empty(label);
  const budgetCards = budgets.length ? <div className="divide-y divide-[var(--color-border)]">{budgets.map(row => {
    const p = row.payload, spent = p.category ? totals.categories.get(p.category) ?? BigInt(0) : totals.expense;
    const max = convertFinance(BigInt(p.amount), p.currency, prefs,last);
    return <article className="space-y-1 py-2" key={row.id}><button type="button" className="min-h-11 font-semibold" onClick={() => edit(row)}>{p.title}</button>
      <p>已用 {write(spent)} ・剩餘 {max === null ? "待設定匯率" : write(max - spent)}</p>
      {max !== null && <Progress value={spent} max={max} hidden={hide}/>}</article>;
  })}</div> : empty("本月預算");
  const goalCards = goals.length ? <div className="grid gap-3 sm:grid-cols-2">{goals.map(row => {
    const p = row.payload, amount = goalProgress(records, row, today, current.balances);
    return <article key={row.id} className={surface + " space-y-2"}><button type="button" className="min-h-11 font-semibold" onClick={() => edit(row)}>
      {p.icon} {p.title}</button><p className="text-sm opacity-75">{({ active:"進行中", paused:"暫停", completed:"已完成", archived:"已封存" })[p.state ?? "active"]}</p><p>{write(amount, p.currency)} / {write(BigInt(p.amount), p.currency)}</p>
      <p className="text-sm opacity-75">尚差 {write(amount >= BigInt(p.amount) ? BigInt(0) : BigInt(p.amount) - amount, p.currency)}{p.due && " ・" + p.due}</p>
      <Progress value={amount} max={BigInt(p.amount)} hidden={hide}/>
      {tab === "goal" && <><button className={control} type="button" onClick={() => setEditor({kind:"contribution",preset:{goal:row.id,title:"資金異動"}})}>記錄資金異動</button>
        <ul>{contributions.filter(item => item.payload.goal === row.id).sort((a,b)=>b.payload.date.localeCompare(a.payload.date)).map(item =>
          <li key={item.id}><button className="min-h-11 w-full break-words text-left" onClick={() => edit(item)}>{item.payload.date} ・{item.payload.title} ・{write(BigInt(item.payload.amount),p.currency)}</button></li>)}</ul></>}
    </article>;
  })}</div> : empty("財務目標");

  const newTransaction = (type: "expense" | "income" | "transfer") => setEditor({
    kind: "transaction", preset: { type, date: localDateInput(anchor).startsWith(month) ? localDateInput(anchor) : first },
  });
  const transactionActions = [
    { label: "記錄支出", action: () => newTransaction("expense") },
    { label: "記錄收入", action: () => newTransaction("income") },
    { label: "帳戶轉帳", action: () => newTransaction("transfer") },
    ...(shown("subscription") ? [{ label: "新增週期交易", action: () => setEditor({ kind: "subscription" }) }] : []),
  ];
  const assetActions = [
    { label: "新增帳戶", action: () => setEditor({ kind: "account" }) },
    ...(shown("instrument") ? [
      { label: "新增投資標的", action: () => setEditor({ kind: "instrument" }) },
      { label: "新增投資交易", action: () => setEditor({ kind: "trade" }) },
    ] : []),
    ...(shown("asset") ? [
      { label: "新增其他資產", action: () => setEditor({ kind: "asset", preset: { type: "asset" } }) },
      { label: "新增負債", action: () => setEditor({ kind: "asset", preset: { type: "liability" } }) },
    ] : []),
  ];
  const planActions = [
    ...(shown("budget") ? [{ label: "新增預算", action: () => setEditor({ kind: "budget", preset: { month } }) }] : []),
    ...(shown("goal") ? [{ label: "新增財務目標", action: () => setEditor({ kind: "goal" }) }] : []),
  ];
  const addActions = activeGroup?.title === "資產" ? assetActions : activeGroup?.title === "規劃" ? planActions
    : [
      ...transactionActions.map(action => ({ ...action, group: "交易" })),
      ...assetActions.map(action => ({ ...action, group: "資產管理" })),
      ...planActions.map(action => ({ ...action, group: "財務規劃" })),
    ];

  return <section aria-label="財務" className="min-w-0 space-y-3">
    <header className="flex flex-wrap items-center gap-2">
      <input aria-label="統計月份" className={control} type="month" value={month} onChange={event => event.target.value && setMonth(event.target.value)}/>
      {tab === "transaction" ? button("＋ 新增", () => newTransaction("expense"))
        : tab === "subscription" ? button("＋ 新增", () => setEditor({ kind: "subscription" }))
        : tab !== "settings" && addActions.length > 0 && <AddMenu items={addActions}/>}
      <div className="ml-auto flex gap-1">
        <button type="button" className={control + " flex items-center gap-2"} aria-pressed={hide} aria-label={hide ? "顯示金額" : "隱藏金額"} onClick={() => setHide(!hide)}>
          {hide ? <Eye size={17}/> : <EyeOff size={17}/>}<span className="hidden sm:inline">{hide ? "顯示金額" : "隱藏金額"}</span>
        </button>
        <button type="button" className={control} aria-label="財務設定" aria-pressed={tab === "settings"} onClick={() => navigate(tab === "settings" ? "overview" : "settings")}><Settings size={17}/></button>
      </div>
    </header>
    <nav aria-label="財務功能" className="grid grid-cols-5 gap-1 rounded-xl bg-[var(--color-panel-bg)] p-1">
      {navigation.map(group => {
        const firstView = group.views.find(shown);
        return firstView && <button type="button" key={group.title} aria-pressed={activeGroup === group}
          className={`min-h-11 min-w-0 rounded-lg text-sm ${activeGroup === group ? "bg-zinc-500/15 font-semibold" : ""}`}
          onClick={() => { navigate(firstView); setProblem(""); }}>{group.title}</button>;
      })}
    </nav>
    {activeGroup && activeGroup.views.length > 1 && <nav aria-label={activeGroup.title + "檢視"} className="flex flex-wrap gap-1">
      {activeGroup.views.filter(shown).map(view => <button key={view} type="button" aria-pressed={tab === view}
        className={control + (tab === view ? " bg-zinc-500/15 font-semibold" : "")} onClick={() => navigate(view)}>{tabs[view]}</button>)}
    </nav>}
    {withheld.size > 0 && <p className="rounded-xl bg-amber-500/10 p-3 text-sm" role="status">尚缺 {Array.from(withheld).join("、")} 匯率，合計暫未納入這些金額。</p>}
    {totals.portfolios.some(item => item.market === null) && <p className="text-sm opacity-75">未填目前價格的持倉暫不納入淨資產。</p>}
    {problem && <p role="alert">{problem}</p>}
    {tab === "overview" && <>
      <section className="rounded-2xl bg-[#2e483c] p-4 text-white">
        <div className="text-sm text-white/80">{isCurrentMonth ? "目前淨資產 · " + today : "月底淨資產 · " + last}</div><p className="my-1 break-all text-2xl font-semibold">{netValues ? write(netValues.net) : "歷史資料不足"}</p>
        {netValues && <dl className="grid grid-cols-2 gap-2 border-t border-white/30 pt-2">
          <div><dt className="text-sm text-white/80">總資產</dt><dd>{write(netValues.assets)}</dd></div>
          <div><dt className="text-sm text-white/80">總負債</dt><dd>{write(netValues.debts)}</dd></div>
        </dl>}
      </section>
      <dl className="grid grid-cols-3 divide-x divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
        {([["收入", totals.income], ["支出", totals.expense], ["結餘", totals.income - totals.expense]] as const).map(([label, amount]) =>
          <div key={label} className="min-w-0 p-2 sm:p-3"><dt className="text-sm">{label}</dt><dd className="break-words font-semibold tabular-nums">{write(amount)}</dd></div>)}
      </dl>
      <div className="grid gap-3 lg:grid-cols-2">
      <section className={surface + " space-y-2"}><h3 className="font-semibold">近期交易</h3>
        {rowList(recentRows.slice(0,5),row=>row.kind==='transaction'?row.payload.date+' · '+transactionKinds[row.payload.type]+' · '+write(BigInt(row.payload.amount),accounts.find(account=>account.id===row.payload.account)?.payload.currency):'',"交易")}
        <button type="button" className={control} onClick={()=>navigate('transaction')}>查看所有交易</button>
      </section>
      {shown("budget")&&<section className={surface}><h3 className="font-semibold">預算進度</h3>{budgetCards}{button("查看預算", () => navigate("budget"))}</section>}
      <section className={surface + " space-y-3"}><h3 className="font-semibold">支出分類</h3>
        {breakdown.length?<div className="flex flex-wrap items-center gap-6">
          {!hide&&gradient&&<div className="grid size-40 shrink-0 place-items-center rounded-full" role="img" aria-label="支出分類比例圖"
            style={{background:`conic-gradient(${gradient})`}}>
            <div className="grid size-28 place-items-center rounded-full bg-[var(--color-panel-bg)] text-center text-xs">{write(totals.expense)}</div>
          </div>}
          <ul className="min-w-0 flex-1 space-y-3">{breakdown.map(({label,value,color})=><li key={label} className="flex justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><i aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{background:color}}/>{label}</span>
            <span className="shrink-0">{write(value)}{!hide && totals.expense > BigInt(0) && " · " + String(value * BigInt(100) / totals.expense) + "%"}</span>
          </li>)}</ul>
        </div>:<p>這個月尚無支出。</p>}</section>

      {shown("subscription") && <section className={surface}><h3 className="font-semibold">即將扣款</h3>
        {rowList(upcoming.slice(0,4),row => {
          if (row.kind !== "subscription") return null;
          const terms = recurringTerms(row.payload, row.payload.next);
          return row.payload.next + " ・" + write(BigInt(terms.amount), terms.currency);
        }, "使用中訂閱")}
        {button("查看週期交易", () => navigate("subscription"))}
      </section>}
      {shown("goal") && overviewGoals.length > 0 && <section className={surface}><h3 className="font-semibold">財務目標</h3>
        {rowList(overviewGoals.slice(0, 3), row => row.kind === "goal" ? write(goalProgress(records, row, today, current.balances), row.payload.currency) + " / " + write(BigInt(row.payload.amount), row.payload.currency) : null, "財務目標")}
        {button("查看財務目標", () => navigate("goal"))}
      </section>}
      </div>
    </>}
    {tab === "analysis" && <>
      <div className="flex flex-wrap gap-2">
        <select aria-label="分析期間" className={control} value={analysisRange} onChange={event => setAnalysisRange(event.target.value)}>
          <option value="1">選取月份</option><option value="3">近三個月</option><option value="6">近六個月</option>
          <option value="year">本年度至選取月份</option><option value="custom">自訂期間</option>
        </select>
        {analysisRange === "custom" && <>
          <input aria-label="分析起日" className={control} type="date" value={analysisFrom} onChange={event => setAnalysisFrom(event.target.value)}/>
          <input aria-label="分析迄日" className={control} type="date" value={analysisTo} onChange={event => setAnalysisTo(event.target.value)}/>
        </>}
      </div>
      {report && fixedReport ? <>
      <p className="text-sm opacity-75">{reportFrom} 至 {reportTo} · {prefs.currency}</p>
      {!!report.missing.length && <p role="status">分析未納入缺少匯率的 {report.missing.join("、")}</p>}
      <dl className="grid gap-2 sm:grid-cols-3">
        <div className={surface}><dt>已入帳週期支出</dt><dd>{write(fixedReport.expense)}</dd></div>
        <div className={surface}><dt>其他支出</dt><dd>{write(report.expense - fixedReport.expense)}</dd></div>
        <div className={surface}><dt>儲蓄率</dt><dd>{hide ? "••••" : report.income <= BigInt(0) || report.missing.length
          ? "資料不足" : decimalText(roundRatio((report.income - report.expense) * BigInt(10000), report.income), 2) + "%"}</dd></div>
      </dl>
      <section className={surface + " space-y-3"}><h3 className="font-semibold">收支趨勢</h3>
        {history.some(value=>value.income!==BigInt(0)||value.expense!==BigInt(0))?<>
        <p className="text-xs opacity-75">綠色：收入 · 琥珀色：支出</p>
        <ul className="grid grid-cols-[repeat(auto-fit,minmax(3rem,1fr))] gap-1">{history.slice(-12).map(value=><li key={value.start} className="min-w-0 text-center text-xs">
          {!hide&&<div className="flex h-24 items-end justify-center gap-1" aria-hidden="true">
            <span className="w-3 rounded-t bg-emerald-600/70" style={{height:Number(value.income*BigInt(100)/trendMax)+"%"}}/>
            <span className="w-3 rounded-t bg-amber-600/65" style={{height:Number(value.expense*BigInt(100)/trendMax)+"%"}}/>
          </div>}
          <span>{value.start.slice(5,7)} 月</span>
          <span className="sr-only">收入 {write(value.income)} · 支出 {write(value.expense)}</span>
        </li>)}</ul>
        <details><summary className="min-h-11 cursor-pointer text-sm">查看收支金額</summary><ul className="text-sm">{history.map(value=><li key={value.start}>{value.start.slice(0,7)} · 收入 {write(value.income)} · 支出 {write(value.expense)}</li>)}</ul></details>
        </>:<p className="text-sm opacity-75">所選期間尚無收支紀錄。</p>}
      </section>
      <section className={surface}><h3 className="font-semibold">每月結餘</h3>
        <ul className="divide-y divide-[var(--color-border)]">{history.map(item => <li key={item.start} className="flex justify-between gap-2 py-2">
          <span>{item.start.slice(0, 7)}</span><span>{write(item.income - item.expense)}</span>
        </li>)}</ul>
      </section>
      <div className="grid gap-3 lg:grid-cols-2">
        <section className={surface}><h3 className="font-semibold">支出分類</h3>
          {report.categories.size ? <ul className="divide-y divide-[var(--color-border)]">
            {[...report.categories].map(([label, value]) => <li className="flex justify-between gap-2 py-2" key={label}>
              <span>{label}</span><span>{write(value)}{!hide && report.expense > BigInt(0) && " · " + String(value * BigInt(100) / report.expense) + "%"}</span>
            </li>)}</ul> : <p>所選期間尚無支出。</p>}
        </section>
        <section className={surface}><h3 className="font-semibold">淨資產趨勢</h3>
          <ul className="divide-y divide-[var(--color-border)]">{history.map(item => <li key={item.start} className="flex justify-between gap-2 py-2">
            <span>{item.end}</span><span>{item.historyAvailable ? write(item.net) : "歷史資料不足"}</span>
          </li>)}</ul>
        </section>
        {shown("budget") && <section className={surface}><h3 className="font-semibold">預算使用趨勢</h3>
          {financeRows(records, "budget").filter(row => history.some(item => item.start.slice(0, 7) === row.payload.month)).map(row => {
            const budget = row.payload, start = budget.month + "-01", end = civilAdvance(civilAdvance(start, "month", 1), "day", -1);
            const stats = financeTotals(records, start, end);
            const spent = budget.category ? stats.categories.get(budget.category) ?? BigInt(0) : stats.expense;
            const limit = convertFinance(BigInt(budget.amount), budget.currency, prefs, end);
            return <div className="border-b border-[var(--color-border)] py-2" key={row.id}>{budget.month} · {budget.title} · {write(spent)}
              {limit !== null && <Progress value={spent} max={limit} hidden={hide}/>}</div>;
          })}
        </section>}
        {shown("instrument") && <section className={surface}><h3 className="font-semibold">投資績效</h3>
          {report.portfolios.length ? <ul className="divide-y divide-[var(--color-border)]">{report.portfolios.map(item => {
            const currency = item.instrument.payload.currency;
            const marketAvailable = reportTo >= today || !!item.instrument.payload.prices;
            return <li key={item.instrument.id} className="py-2">{item.instrument.payload.title} · 累計已實現 {write(item.realized, currency)}
              {" · 未實現 "}{marketAvailable && item.unrealized !== null ? write(item.unrealized, currency) : "缺少估值"}</li>;
          })}</ul> : <p>尚無投資標的。</p>}
        </section>}
      </div>
      </> : <p role="status">請選擇有效的期間，最多涵蓋十年。</p>}
    </>}
    {tab === "transaction" && <>
      <div className="flex flex-wrap gap-2">
        <select aria-label="交易類型" className={control} value={transactionType} onChange={event => setTransactionType(event.target.value)}>
          <option value="all">全部</option><option value="expense">支出</option><option value="income">收入</option><option value="transfer">轉帳</option>
        </select>
        <input aria-label="搜尋交易" className={control} type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="搜尋交易"/>
        <select aria-label="交易帳戶" className={control} value={accountFilter} onChange={event=>setAccountFilter(event.target.value)}>
          <option value="">所有帳戶</option>{accounts.map(row=><option key={row.id} value={row.id}>{row.payload.title}</option>)}</select>
        <select aria-label="交易分類" className={control} value={categoryFilter} onChange={event=>setCategoryFilter(event.target.value)}>
          <option value="">所有分類</option>{prefs.categories.map(category=><option key={category}>{category}</option>)}</select>
      </div>
      <div className="flex flex-wrap gap-2">
       <label className="grid gap-1">交易起日<input className={control} type="date" value={fromDate} onChange={event=>setFromDate(event.target.value)}/></label>
       <label className="grid gap-1">交易迄日<input className={control} type="date" value={toDate} onChange={event=>setToDate(event.target.value)}/></label>
      </div>
      {transactionRows.length ? [...new Set(transactionRows.map(row => row.payload.date))].map(date =>
        <section key={date}><h3 className="text-sm font-semibold">{date}</h3>
          {rowList(transactionRows.filter(row => row.payload.date === date), row => {
            if (row.kind !== "transaction") return null;
            const p = row.payload, account = accounts.find(item => item.id === p.account);
            return <>{transactionKinds[p.type]} ・{accountName(p.account)}{p.target && " → " + accountName(p.target)}
              {p.category && " ・" + p.category} ・{write(BigInt(p.amount), account?.payload.currency)}
              {p.interest && BigInt(p.interest) > BigInt(0) && " ・利息 " + write(BigInt(p.interest), account?.payload.currency)}</>;
          }, "交易")}
        </section>) : empty("交易")}
      <section className={surface}>
        <h3 className="font-semibold">預估支出</h3>
        <p className="text-sm opacity-75">預估金額不計入帳戶餘額及實際收支。</p>
        {rowList(financeRows(records,"estimate").filter(row=>row.payload.date>=first&&row.payload.date<=last),
          row=>row.kind==="estimate"?row.payload.date+" ・"+write(BigInt(row.payload.amount),row.payload.currency):null,"預估支出")}
      </section>
    </>}
    {tab === "account" && <>
      <dl className="grid grid-cols-3 gap-2">{([["總資產",current.assets],["總負債",current.debts],["淨資產",current.net]] as const).map(([label,value]) =>
        <div key={label} className={surface}><dt>{label}</dt><dd className="break-words font-semibold">{write(value)}</dd></div>)}</dl>
      {[false, true].map(debt => <section key={String(debt)} className={surface}><h3 className="font-semibold">{debt ? "負債帳戶" : "資金帳戶"}</h3>
        {rowList(accounts.filter(row => isDebt(row.payload.type) === debt), row => {
          if (row.kind !== "account") return null;
          const p = row.payload, value = current.balances.get(row.id) ?? BigInt(0);
          return <>{p.icon} {accountKinds[p.type]} ・{write(value,p.currency)}{p.archived ? " ・已封存" : ""}
            {p.type === "card" && <span className="block">已使用 {write(value < BigInt(0) ? -value : BigInt(0),p.currency)} / 額度 {write(BigInt(p.limit),p.currency)} ・結帳 {p.statementDay} 日 ・繳款 {p.paymentDay} 日</span>}</>;
        }, debt ? "負債帳戶" : "資金帳戶")}
      </section>)}
    </>}
    {tab === "budget" && budgetCards}
    {tab === "subscription" && <>
      <div className={surface + " space-y-2"}><h3 className="font-semibold">週期支出預估</h3>
        <p className="text-2xl font-semibold">{write(planned)} / 月</p><p>年度 {write(planned*BigInt(12))} ・使用中 {upcoming.length} 項</p></div>
      {subscriptions.length ? <ul className="space-y-2">{subscriptions.map(row=>{const terms=recurringTerms(row.payload,row.payload.next);return <li key={row.id} className={surface + " space-y-2"}>
        <button type="button" className="block min-h-11 w-full text-left" onClick={()=>edit(row)}><strong>{row.payload.icon} {terms.title}</strong>
          <span className="block text-sm">{status[row.payload.state]} ・{write(BigInt(terms.amount),terms.currency)}{row.payload.state==="active" && " ・下次 " + row.payload.next}</span></button>
        {row.payload.state === "active" && (!row.payload.until || row.payload.next <= row.payload.until) && <>
          {terms.account && <button type="button" className={control} disabled={busy} onClick={async()=>{
          if(busy)return;
          if(!await confirmDialog({title:"確認入帳",message:`以今天的日期記錄「${terms.title}」的 ${row.payload.next} 期交易？`}))return;
          setBusy(true);setProblem("");
          try { await repository.confirmSubscription(row,localDateInput(new Date())); }
          catch(error){setProblem(error instanceof Error?error.message:"無法記帳");}
          finally {setBusy(false);}
        }}>確認入帳</button>}
          <button type="button" className={control} disabled={busy} onClick={async () => {
            if (!await confirmDialog({ title: "跳過本期", message: `跳過 ${row.payload.next} 的預定交易？` })) return;
            setBusy(true); setProblem("");
            try { await repository.resolveRecurringFinance(row); }
            catch (error) { setProblem(error instanceof Error ? error.message : "無法跳過本期"); }
            finally { setBusy(false); }
          }}>跳過本期</button>
        </>}
        {!!row.payload.skipped?.length && <details><summary>已跳過的期數</summary>
          <ul>{row.payload.skipped.map(date => <li key={date}>{date}</li>)}</ul>
        </details>}
      </li>})}</ul> : empty("週期交易")}
    </>}
    {tab === "asset" && <>
      <p className="text-sm opacity-75">現金、帳戶與已估值持倉已納入合計。此處填寫其他資產與負債。</p>
      {(["asset", "liability"] as const).map(type => {
        const rows = latestAssetValues(records, today).filter(row => row.payload.type === type);
        return <section key={type} className={surface}><h3 className="font-semibold">{type === "asset" ? "其他資產" : "其他負債"}</h3>
          {rowList(rows, row => row.kind === "asset" ? write(BigInt(row.payload.amount), row.payload.currency) + " ・" + row.payload.date : null,
            type === "asset" ? "其他資產" : "其他負債")}
          {rows.map(row => <button key={row.id} type="button" className={control} onClick={() =>
            setEditor({kind:"asset",preset:{series:row.payload.series||row.id,title:row.payload.title,type:row.payload.type,currency:row.payload.currency,due:row.payload.due}})}>
            更新估值 · {row.payload.title}</button>)}
          {rows.length > 0 && <details><summary className="min-h-11">估值紀錄</summary>
            {rowList(financeRows(records, "asset").filter(row => row.payload.type === type).sort((a,b) => b.payload.date.localeCompare(a.payload.date)),
              row => row.kind === "asset" ? row.payload.date + " ・" + write(BigInt(row.payload.amount), row.payload.currency) : null, "估值")}
          </details>}
        </section>;
      })}
    </>}
    {tab === "goal" && goalCards}
    {tab === "instrument" && <>
      {totals.portfolios.length ? <div className="grid gap-3 sm:grid-cols-2">{totals.portfolios.map(item=>{
        const p=item.instrument.payload, profit=item.unrealized===null?null:item.unrealized+item.realized+item.dividends;
        return <article className={surface} key={item.instrument.id}>
          <button type="button" className="min-h-11 font-semibold" onClick={()=>edit(item.instrument)}>{p.title}</button>
          <p>持有 {decimalText(item.quantity,6)} ・成本 {write(item.cost,p.currency)}</p>
          <p>市值 {item.market===null?"待填價格":write(item.market,p.currency)}</p>
          <p>已實現 {write(item.realized,p.currency)} ・未實現 {item.unrealized===null?"待估值":write(item.unrealized,p.currency)}</p>
          <p>股息 {write(item.dividends,p.currency)} ・報酬率 {hide?"••••":profit===null||!item.invested?"待估值":decimalText(roundRatio(profit*BigInt(10000),item.invested),2)+"%"}</p>
          {!hide&&item.market!==null&&totals.assets>BigInt(0)&&<p className="text-sm opacity-75">占總資產 {decimalText(roundRatio((convertFinance(item.market,p.currency,prefs,last)??BigInt(0))*BigInt(10000),totals.assets),2)}%</p>}
        </article>;
      })}</div> : empty("投資標的")}
      <h3 className="font-semibold">交易歷史</h3>{rowList(financeRows(records,"trade"),row=>row.kind==="trade"?row.payload.date+" ・"+({buy:"買入",sell:"賣出",dividend:"股息"}[row.payload.type]):"", "投資交易")}
    </>}
    {tab === "settings" && <PreferenceEditor key={prefsRow?.revision??0} prefs={prefs} row={prefsRow} owner={owner} repository={repository} hide={hide} setHide={setHide}/>}
    {editor && <FinanceEditor key={editor.row?.id??editor.kind} editor={editor} base={prefs.currency} categories={prefs.categories}
      date={anchor} hideAmounts={hide} repository={repository} records={records} owner={owner} close={()=>setEditor(undefined)} upload={upload} download={download}/>}

  </section>;
}
