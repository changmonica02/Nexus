import { localDateInput } from "../../../lib/todoCalendar";
import { civilAdvance } from "../civilPeriods";
import type { Card } from "../dashboard/model";
import { financeRows, type FinanceRecord } from "./model";
import { convertFinance, financeTotals, subscriptionMonthly } from "./ledger";
import { money } from "./money";

export default function FinanceCard({ card, records, anchor }: { card: Card; records: FinanceRecord[]; anchor: Date }) {
  const date=localDateInput(anchor), month=date.slice(0,7);
  const start=card.period==="all"?"1900-01-01":card.period==="month"?month+"-01":date;
  const end=card.period==="all"?date:card.period==="month"?civilAdvance(civilAdvance(start,"month",1),"day",-1):
    card.period==="week"?civilAdvance(date,"day",6):date;
  const stats=financeTotals(records,start,end), currency=stats.prefs.currency;
  const actual=(amount:bigint)=>money(amount,currency);
  const subscriptions=financeRows(records,"subscription").filter(row=>row.payload.state==="active").sort((a,b)=>a.payload.next.localeCompare(b.payload.next));
  let title:string, items:string[]=[];
  const missing=new Set(stats.missing);
  switch(card.type){
    case "financeIncome": title=actual(stats.income);break;
    case "financeExpense": title=actual(stats.expense);break;
    case "financeNet": title=actual(stats.net);items=["總資產 "+actual(stats.assets),"總負債 "+actual(stats.debts)];break;
    case "financeSummary": title=actual(stats.income-stats.expense);items=["收入 "+actual(stats.income),"支出 "+actual(stats.expense)];break;
    case "financeBudget": {
      const budgets=financeRows(records,"budget").filter(row=>row.payload.month>=start.slice(0,7)&&row.payload.month<=end.slice(0,7));
      items=budgets.map(row=>{
        const p=row.payload, from=p.month+"-01", to=civilAdvance(civilAdvance(from,"month",1),"day",-1);
        const period=financeTotals(records,from,to);
        const converted=convertFinance(BigInt(p.amount),p.currency,stats.prefs,to);
        if(converted===null)missing.add(p.currency);
        return p.title+" ・"+(converted===null?"待設定匯率":actual(converted-(p.category?period.categories.get(p.category)??BigInt(0):period.expense)));
      });
      title=budgets.length?budgets.length+" 項預算":"尚無預算";break;
    }
    case "financeUpcoming": {
      const upcoming=subscriptions.filter(row=>card.period==="all"||row.payload.next>=start&&row.payload.next<=end);
      title=upcoming.length+" 項預計扣款";
      items=upcoming.map(({payload:p})=>p.next+" ・"+p.title+" ・"+money(BigInt(p.amount),p.currency));break;
    }
    case "financeRecurring": {
      let sum=BigInt(0);
      for(const {payload} of subscriptions){
        const converted=convertFinance(subscriptionMonthly(payload),payload.currency,stats.prefs);
        if(converted===null)missing.add(payload.currency);else sum+=converted;
      }
      title=actual(sum)+" / 月";items=subscriptions.map(({payload:p})=>p.title+" ・"+money(subscriptionMonthly(p),p.currency)+"/月");break;
    }
    case "financeGoals": {
      const goals=financeRows(records,"goal").filter(row=>card.period==="all"||row.payload.due>=start&&row.payload.due<=end);
      title=goals.length+" 項目標";
      const progress=financeRows(records,"contribution");
      items=goals.map(row=>row.payload.title+" ・"+money(progress.filter(item=>item.payload.goal===row.id).reduce((sum,item)=>sum+BigInt(item.payload.amount),BigInt(0)),row.payload.currency)+" / "+money(BigInt(row.payload.amount),row.payload.currency));break;
    }
    default:
      title=stats.portfolios.length+" 項標的";
      items=stats.portfolios.map(item=>item.instrument.payload.title+" ・"+(item.market===null?"待估值":money(item.market,item.instrument.payload.currency)));
  }
  return <div className="space-y-2"><p className="break-all text-xl font-semibold">{title}</p>
    {missing.size>0&&<p className="text-xs opacity-75">待設定匯率：{[...missing].join("、")}</p>}
    {card.content==="items"&&<ul className="space-y-2">{items.slice(0,{small:2,medium:4,large:8}[card.size]).map((item,index)=><li key={index} className="break-words text-sm">{item}</li>)}</ul>}
  </div>;
}
