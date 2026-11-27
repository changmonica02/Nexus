import { confirmDialog } from "../../../lib/confirmDialog";
import { useMemo, useState } from "react";
import AddMenu from "../AddMenu";
import { Eye, EyeOff } from "lucide-react";
import { localDateInput } from "../../../lib/todoCalendar";
import { civilAdvance } from "../civilPeriods";
import type { LifeRepository } from "../LifeRepository";
import { control, surface } from "../dashboard/styles";
import FinanceEditor, { type FinanceEdit } from "./FinanceEditor";
import { defaultPreferences, financeRow, financeRows, preferencesId, optionalFinanceSections, accountKinds, transactionKinds, type FinancePayloads, type FinanceRecord } from "./model";
import { convertFinance, financeTotals, subscriptionMonthly } from "./ledger";
import { currencies, decimalText, money, roundRatio } from "./money";

const tabs = { overview: "總覽", transaction: "記帳", account: "帳戶", budget: "預算", subscription: "訂閱", asset: "資產負債", goal: "財務目標", instrument: "投資", settings: "設定" } as const;
export type FinanceTab = keyof typeof tabs;
const status = { active: "使用中", paused: "暫停", cancelled: "已取消" };

function Progress({ value, max }: { value: bigint; max: bigint }) {
  const ratio = max > BigInt(0) ? value * BigInt(100) / max : BigInt(0);
  const bounded = Number(ratio < BigInt(0) ? BigInt(0) : ratio > BigInt(100) ? BigInt(100) : ratio);
  return <div>
    <progress className={"h-2 w-full " + (ratio >= BigInt(100) ? "accent-red-600" : ratio >= BigInt(80) ? "accent-amber-600" : "accent-emerald-600")} max={100} value={bounded}/>
    <p className="text-sm opacity-75">{ratio.toString()}%{ratio > BigInt(100) ? " · 已超出" : ratio >= BigInt(80) ? " · 接近上限" : ""}</p>
  </div>;
}

function PreferenceEditor({ prefs, row, owner, repository }: {
  prefs: FinancePayloads["preferences"]; row?: FinanceRecord<"preferences">; owner: string | null; repository: LifeRepository;
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
    <label className="grid gap-1">分類（每行一項）<textarea rows={6} className={control} value={categoryText} onChange={event => setCategoryText(event.target.value)}/></label>
    <button className={control} disabled={busy}>儲存設定</button>{message && <p role="status">{message}</p>}
  </form>;
}

export default function FinanceWorkspace({ records, repository, owner, anchor, upload, download, requested, focusId, selectedMonth, onMonthChange, hideAmounts, onHideChange }: {
  selectedMonth?: string; onMonthChange?: (month:string)=>void; hideAmounts?:boolean; onHideChange?:(hide:boolean)=>void;
  records: FinanceRecord[]; repository: LifeRepository; owner: string | null; anchor: Date;
  upload?: (file: File) => Promise<string>; download?: (id: string) => Promise<void>; requested?: FinanceTab; focusId?: string;
}) {
  const [selectedTab, setTab] = useState<FinanceTab>(requested ?? "overview");
  const [localMonth, setLocalMonth] = useState(()=>localDateInput(new Date()).slice(0, 7));
  const month=selectedMonth??localMonth;
  const setMonth=(next:string)=>{setLocalMonth(next);onMonthChange?.(next);};
  const [localHide, setLocalHide] = useState(false);
  const hide=hideAmounts??localHide;
  const setHide=(next:boolean)=>{setLocalHide(next);onHideChange?.(next);};
  const [query, setQuery] = useState("");
  const [fromDate,setFromDate]=useState("");
  const [toDate,setToDate]=useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editor, setEditor] = useState<FinanceEdit | undefined>(() => {
    const row=records.find(item=>item.id===focusId);
    return row&&row.kind!=="preferences"?{kind:row.kind,row}:focusId==="new-transaction"?{kind:"transaction"}:undefined;
  });
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const prefsRow = financeRows(records, "preferences")[0];
  const prefs = prefsRow?.payload ?? defaultPreferences;
  const hidden = prefs.hiddenSections ?? [];
  const shown = (key:FinanceTab)=>!hidden.some(section=>key===section);
  const tab=shown(selectedTab)?selectedTab:"overview";
  const first = month + "-01";
  const last = civilAdvance(civilAdvance(first, "month", 1), "day", -1);
  const totals = financeTotals(records, first, last);
  const accounts = financeRows(records, "account");
  const subscriptions = financeRows(records, "subscription");
  const budgets = financeRows(records, "budget").filter(row => row.payload.month === month);
  const goals = financeRows(records, "goal");
  const contributions = financeRows(records, "contribution");
  const write = (value: bigint, currency = prefs.currency) => hide ? "••••" : money(value, currency);
  const text = (row: FinanceRecord) => "title" in row.payload ? row.payload.title : "";
  const edit = (row: FinanceRecord) => { if (row.kind !== "preferences") setEditor({ kind: row.kind, row }); };
  const accountName = (id: string) => accounts.find(item => item.id === id)?.payload.title ?? "未指定";
  const empty = (label: string) => <p className={surface}>尚無{label}。</p>;
  const button = (title: string, action: () => void) => <button type="button" className={control} onClick={action}>{title}</button>;
  const transactionRows = financeRows(records, "transaction").filter(({payload: p}) =>
    p.date >= (fromDate||first) && p.date <= (toDate||last) && (!accountFilter || p.account === accountFilter || p.target === accountFilter)
    && (!categoryFilter || p.category === categoryFilter) &&
    (p.title + " " + p.notes).toLowerCase().includes(query.trim().toLowerCase())).sort((a,b) => b.payload.date.localeCompare(a.payload.date));
  const upcoming = subscriptions.filter(row => row.payload.state === "active").sort((a,b) => a.payload.next.localeCompare(b.payload.next));
  let planned = BigInt(0);
  const withheld = new Set(totals.missing);
  for (const {payload} of upcoming) {
    const converted = convertFinance(subscriptionMonthly(payload), payload.currency, prefs);
    if (converted === null) withheld.add(payload.currency); else planned += converted;
  }
  const history = useMemo(()=>Array.from({length:6},(_,index)=>{
    const start=civilAdvance(first,"month",index-5);
    const end=civilAdvance(civilAdvance(start,"month",1),"day",-1);
    return { start,...financeTotals(records,start,end) };
  }),[records,first]);
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
    ? <ul className="space-y-2">{items.map(row => <li key={row.id} className={surface}>
      <button type="button" className="min-h-11 w-full break-words text-left" onClick={() => edit(row)}>
        <strong>{text(row)}</strong><div className="text-sm opacity-80">{details(row)}</div>
      </button></li>)}</ul> : empty(label);
  const budgetCards = budgets.length ? <div className="grid gap-3 sm:grid-cols-2">{budgets.map(row => {
    const p = row.payload, spent = p.category ? totals.categories.get(p.category) ?? BigInt(0) : totals.expense;
    const max = convertFinance(BigInt(p.amount), p.currency, prefs,last);
    return <article className={surface + " space-y-2"} key={row.id}><button type="button" className="min-h-11 font-semibold" onClick={() => edit(row)}>{p.title}</button>
      <p>已用 {write(spent)} ・剩餘 {max === null ? "待設定匯率" : write(max - spent)}</p>
      {max !== null && <Progress value={spent} max={max}/>}</article>;
  })}</div> : empty("本月預算");
  const goalCards = goals.length ? <div className="grid gap-3 sm:grid-cols-2">{goals.map(row => {
    const p = row.payload, amount = contributions.filter(item => item.payload.goal === row.id).reduce((total, item) => total + BigInt(item.payload.amount), BigInt(0));
    return <article key={row.id} className={surface + " space-y-2"}><button type="button" className="min-h-11 font-semibold" onClick={() => edit(row)}>
      {p.icon} {p.title}</button><p>{write(amount, p.currency)} / {write(BigInt(p.amount), p.currency)}</p>
      <p className="text-sm opacity-75">尚差 {write(amount >= BigInt(p.amount) ? BigInt(0) : BigInt(p.amount) - amount, p.currency)}{p.due && " ・" + p.due}</p>
      <Progress value={amount} max={BigInt(p.amount)}/>
      {tab === "goal" && <><button className={control} type="button" onClick={() => setEditor({kind:"contribution",preset:{goal:row.id,title:"資金異動"}})}>記錄資金異動</button>
        <ul>{contributions.filter(item => item.payload.goal === row.id).sort((a,b)=>b.payload.date.localeCompare(a.payload.date)).map(item =>
          <li key={item.id}><button className="min-h-11 w-full break-words text-left" onClick={() => edit(item)}>{item.payload.date} ・{item.payload.title} ・{write(BigInt(item.payload.amount),p.currency)}</button></li>)}</ul></>}
    </article>;
  })}</div> : empty("財務目標");

  return <section aria-label="財務管理" className="min-w-0 space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-2xl font-semibold">財務管理</h2>
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">統計月份<input className={control} type="month" value={month} onChange={event => event.target.value && setMonth(event.target.value)}/></label>
        <button type="button" className={control + " flex items-center gap-2"} aria-pressed={hide} onClick={() => setHide(!hide)}>
          {hide ? <Eye size={17}/> : <EyeOff size={17}/>} {hide ? "顯示金額" : "隱藏金額"}</button>
      </div>
    </header>
    <nav aria-label="財務功能" className="flex flex-wrap gap-1 rounded-xl bg-[var(--color-panel-bg)] p-1">
      {(Object.keys(tabs) as FinanceTab[]).filter(shown).map(key => <button type="button" key={key} aria-pressed={tab === key}
        className={`min-h-11 shrink-0 rounded-lg px-3 text-sm ${tab===key?"bg-zinc-500/15 font-semibold":""}`} onClick={() => {setTab(key);setProblem("");}}>{tabs[key]}</button>)}
    </nav>
    <div className="flex flex-wrap gap-2">
      {(['expense','income','transfer'] as const).map(type=><button type="button" key={type} className={control} onClick={()=>setEditor({kind:'transaction',preset:{type,date:localDateInput(new Date())}})}>{type==='expense'?'記支出':type==='income'?'記收入':'帳戶轉帳'}</button>)}
      <AddMenu items={[
        {label:'新增交易',action:()=>setEditor({kind:'transaction'})},
        {label:'新增帳戶',action:()=>setEditor({kind:'account'})},
        ...(shown('budget')?[{label:'新增預算',action:()=>setEditor({kind:'budget',preset:{month}})}]:[]),
        ...(shown('subscription')?[{label:'新增訂閱',action:()=>setEditor({kind:'subscription'})}]:[]),
        ...(shown('asset')?[{label:'新增資產或負債',action:()=>setEditor({kind:'asset'})}]:[]),
        ...(shown('goal')?[{label:'新增財務目標',action:()=>setEditor({kind:'goal'})}]:[]),
        ...(shown('instrument')?[{label:'新增投資標的',action:()=>setEditor({kind:'instrument'})},{label:'新增投資交易',action:()=>setEditor({kind:'trade'})}]:[]),
      ]}/>
    </div>
    {withheld.size > 0 && <p className="rounded-xl bg-amber-500/10 p-3 text-sm" role="status">尚缺 {Array.from(withheld).join("、")} 匯率，合計暫未納入這些金額。</p>}
    {totals.portfolios.some(item => item.market === null) && <p className="text-sm opacity-75">未填目前價格的持倉暫不納入淨資產。</p>}
    {problem && <p role="alert">{problem}</p>}
    {tab === "overview" && <>
      <section className="rounded-2xl bg-[#2e483c] p-4 text-white">
        <div className="text-sm text-white/80">淨資產 · {month}</div><p className="my-1 break-all text-2xl font-semibold">{write(totals.net)}</p>
        <dl className="grid gap-3 border-t border-white/30 pt-2 sm:grid-cols-2">
          <div><dt className="text-sm text-white/80">總資產</dt><dd>{write(totals.assets)}</dd></div>
          <div><dt className="text-sm text-white/80">總負債</dt><dd>{write(totals.debts)}</dd></div>
        </dl>
      </section>
      <div className="grid gap-3 sm:grid-cols-2"><article className={surface}>本月收入 <strong className="block text-2xl">{write(totals.income)}</strong></article>
        <article className={surface}>本月支出 <strong className="block text-2xl">{write(totals.expense)}</strong></article></div>
      <section className={surface + " space-y-2"}><h3 className="font-semibold">近期交易</h3>
        {rowList(transactionRows.slice(0,5),row=>row.kind==='transaction'?row.payload.date+' · '+transactionKinds[row.payload.type]+' · '+write(BigInt(row.payload.amount),accounts.find(account=>account.id===row.payload.account)?.payload.currency):'',"交易")}
        <button type="button" className={control} onClick={()=>setTab('transaction')}>查看所有交易</button>
      </section>
      {shown("budget")&&<><h3 className="font-semibold">預算進度</h3>{budgetCards}</>}
      <section className={surface + " space-y-3"}><h3 className="font-semibold">近六個月收支</h3>
        {history.some(value=>value.income!==BigInt(0)||value.expense!==BigInt(0))?<>
        <p className="text-xs opacity-75">綠色：收入 · 琥珀色：支出</p>
        <ul className="grid grid-cols-6 gap-1">{history.map(value=><li key={value.start} className="min-w-0 text-center text-xs">
          {!hide&&<div className="flex h-24 items-end justify-center gap-1" aria-hidden="true">
            <span className="w-3 rounded-t bg-emerald-600/70" style={{height:Number(value.income*BigInt(100)/trendMax)+"%"}}/>
            <span className="w-3 rounded-t bg-amber-600/65" style={{height:Number(value.expense*BigInt(100)/trendMax)+"%"}}/>
          </div>}
          <span>{value.start.slice(5,7)} 月</span>
          <span className="sr-only">收入 {write(value.income)} · 支出 {write(value.expense)}</span>
        </li>)}</ul>
        <details><summary className="min-h-11 cursor-pointer text-sm">查看收支金額</summary><ul className="text-sm">{history.map(value=><li key={value.start}>{value.start.slice(0,7)} · 收入 {write(value.income)} · 支出 {write(value.expense)}</li>)}</ul></details>
        </>:<p className="text-sm opacity-75">近六個月尚無收支紀錄，記下第一筆交易即可查看趨勢。</p>}
      </section>
      <section className={surface + " space-y-3"}><h3 className="font-semibold">支出分類</h3>
        {breakdown.length?<div className="flex flex-wrap items-center gap-6">
          {!hide&&gradient&&<div className="grid size-40 shrink-0 place-items-center rounded-full" role="img" aria-label="支出分類比例圖"
            style={{background:`conic-gradient(${gradient})`}}>
            <div className="grid size-28 place-items-center rounded-full bg-[var(--color-panel-bg)] text-center text-xs">{write(totals.expense)}</div>
          </div>}
          <ul className="min-w-0 flex-1 space-y-3">{breakdown.map(({label,value,color})=><li key={label} className="flex justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2"><i aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{background:color}}/>{label}</span>
            <span className="shrink-0">{write(value)}</span>
          </li>)}</ul>
        </div>:<p>這個月尚無支出。</p>}</section>

      {shown("subscription")&&<><h3 className="font-semibold">即將扣款</h3>{rowList(upcoming.slice(0,4),row=>row.kind==="subscription"?row.payload.next+" ・"+write(BigInt(row.payload.amount),row.payload.currency):"", "使用中訂閱")}</>}
      {shown("goal")&&<><h3 className="font-semibold">財務目標</h3>{goalCards}</>}
      {shown("instrument")&&<><h3 className="font-semibold">投資摘要</h3>
      {totals.portfolios.length ? <div className={surface}>{totals.portfolios.map(item=><p key={item.instrument.id}>{item.instrument.payload.title} ・{item.market===null?"待填目前價格":write(item.market,item.instrument.payload.currency)}</p>)}</div> : empty("投資標的")}</>}
    </>}
    {tab === "transaction" && <>
      <section className={surface}>
        <h3 className="font-semibold">預估支出</h3>
        <p className="text-sm opacity-75">預估金額不計入帳戶餘額及實際收支。</p>
        {rowList(financeRows(records,"estimate").filter(row=>row.payload.date>=first&&row.payload.date<=last),
          row=>row.kind==="estimate"?row.payload.date+" ・"+write(BigInt(row.payload.amount),row.payload.currency):null,"預估支出")}
      </section>
      <div className="flex flex-wrap gap-2">
        {button("新增交易",()=>setEditor({kind:"transaction",preset:{date:localDateInput(anchor).startsWith(month)?localDateInput(anchor):first}}))}
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
      {rowList(transactionRows,row=>{
        if(row.kind!=="transaction")return null;
        const p=row.payload, account=accounts.find(item=>item.id===p.account);
        return <>{p.date} ・{transactionKinds[p.type]} ・{accountName(p.account)}{p.target&&" → "+accountName(p.target)} ・{write(BigInt(p.amount),account?.payload.currency)}</>;
      },"交易")}
    </>}
    {tab === "account" && <>{button("新增帳戶",()=>setEditor({kind:"account"}))}
      {rowList(accounts,row=>{
        if(row.kind!=="account")return null;
        const p=row.payload,value=totals.balances.get(row.id)??BigInt(0);
        return <>{p.icon} {accountKinds[p.type]} ・{write(value,p.currency)}{p.archived?" ・已封存":""}
          {p.type==="card"&&<span className="block">已使用 {write(value<BigInt(0)?-value:BigInt(0),p.currency)} / 額度 {write(BigInt(p.limit),p.currency)} ・結帳 {p.statementDay} 日 ・繳款 {p.paymentDay} 日</span>}</>;
      },"帳戶")}</>}
    {tab === "budget" && <>{button("新增預算",()=>setEditor({kind:"budget",preset:{month}}))}{budgetCards}</>}
    {tab === "subscription" && <>
      <div className={surface + " space-y-2"}><h3 className="font-semibold">訂閱預估</h3>
        <p className="text-2xl font-semibold">{write(planned)} / 月</p><p>年度 {write(planned*BigInt(12))} ・使用中 {upcoming.length} 項</p></div>
      {button("新增訂閱",()=>setEditor({kind:"subscription"}))}
      {subscriptions.length ? <ul className="space-y-2">{subscriptions.map(row=><li key={row.id} className={surface + " space-y-2"}>
        <button type="button" className="block min-h-11 w-full text-left" onClick={()=>edit(row)}><strong>{row.payload.icon} {row.payload.title}</strong>
          <span className="block text-sm">{status[row.payload.state]} ・{write(BigInt(row.payload.amount),row.payload.currency)} ・下次 {row.payload.next}</span></button>
        {row.payload.state==="active"&&row.payload.account&&<button type="button" className={control} disabled={busy} onClick={async()=>{
          if(busy)return;
          if(!await confirmDialog({title:"確認訂閱扣款",message:`以今天的日期記錄 ${row.payload.title} 的 ${row.payload.next} 期扣款？`}))return;
          setBusy(true);setProblem("");
          try { await repository.confirmSubscription(row,localDateInput(new Date())); }
          catch(error){setProblem(error instanceof Error?error.message:"無法記帳");}
          finally {setBusy(false);}
        }}>確認扣款並記帳</button>}
      </li>)}</ul> : empty("訂閱")}
    </>}
    {tab === "asset" && <>
      <div className="grid gap-3 sm:grid-cols-3">{([["總資產",totals.assets],["總負債",totals.debts],["淨資產",totals.net]] as const).map(([label,value])=>
        <article key={label} className={surface}>{label}<strong className="block text-xl">{write(value)}</strong></article>)}</div>
      <section className={surface}><h3 className="font-semibold">近六個月淨資產</h3>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">{history.map(item=><li key={item.start}>{item.start.slice(0,7)} ・{write(item.net)}</li>)}</ul></section>
      {button("新增手動資產或負債",()=>setEditor({kind:"asset"}))}
      <p className="text-sm opacity-75">現金、帳戶與已估值持倉已納入合計。此處填寫其他資產與負債。</p>
      {rowList(financeRows(records,"asset"),row=>row.kind==="asset"?(row.payload.type==="asset"?"資產":"負債")+" ・"+write(BigInt(row.payload.amount),row.payload.currency)+" ・"+row.payload.date:"","手動資產或負債")}
      {financeRows(records,"asset").map(row=><button type="button" className={control+" mr-2"} key={row.id} onClick={()=>
        setEditor({kind:"asset",preset:{series:row.payload.series||row.id,title:row.payload.title,type:row.payload.type,currency:row.payload.currency}})}>更新估值 · {row.payload.title}</button>)}
    </>}
    {tab === "goal" && <>{button("新增財務目標",()=>setEditor({kind:"goal"}))}{goalCards}</>}
    {tab === "instrument" && <>
      <div className="flex flex-wrap gap-2">{button("新增投資標的",()=>setEditor({kind:"instrument"}))}
        {button("新增投資交易",()=>setEditor({kind:"trade"}))}</div>
      {totals.portfolios.length ? <div className="grid gap-3 sm:grid-cols-2">{totals.portfolios.map(item=>{
        const p=item.instrument.payload, profit=item.unrealized===null?null:item.unrealized+item.realized+item.dividends;
        return <article className={surface} key={item.instrument.id}>
          <button type="button" className="min-h-11 font-semibold" onClick={()=>edit(item.instrument)}>{p.title}</button>
          <p>持有 {decimalText(item.quantity,6)} ・成本 {write(item.cost,p.currency)}</p>
          <p>市值 {item.market===null?"待填價格":write(item.market,p.currency)}</p>
          <p>已實現 {write(item.realized,p.currency)} ・未實現 {item.unrealized===null?"待估值":write(item.unrealized,p.currency)}</p>
          <p>股息 {write(item.dividends,p.currency)} ・報酬率 {profit===null||!item.invested?"待估值":decimalText(roundRatio(profit*BigInt(10000),item.invested),2)+"%"}</p>
          {item.market!==null&&totals.assets>BigInt(0)&&<p className="text-sm opacity-75">占總資產 {decimalText(roundRatio((convertFinance(item.market,p.currency,prefs,last)??BigInt(0))*BigInt(10000),totals.assets),2)}%</p>}
        </article>;
      })}</div> : empty("投資標的")}
      <h3 className="font-semibold">交易歷史</h3>{rowList(financeRows(records,"trade"),row=>row.kind==="trade"?row.payload.date+" ・"+({buy:"買入",sell:"賣出",dividend:"股息"}[row.payload.type]):"", "投資交易")}
    </>}
    {tab === "settings" && <PreferenceEditor key={prefsRow?.revision??0} prefs={prefs} row={prefsRow} owner={owner} repository={repository}/>}
    {editor && <FinanceEditor key={editor.row?.id??editor.kind} editor={editor} base={prefs.currency} categories={prefs.categories}
      date={anchor} repository={repository} records={records} owner={owner} close={()=>setEditor(undefined)} upload={upload} download={download}/>}

  </section>;
}
