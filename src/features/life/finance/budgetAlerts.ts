import { convertFinance, financeTotals } from "./ledger";
import { financeRows, type FinanceRecord } from "./model";

export function budgetAlerts(records:FinanceRecord[],day:string) {
  const month=day.slice(0,7);
  const budgets=financeRows(records,"budget").filter(row=>row.payload.month===month);
  if(!budgets.length||financeRows(records,"preferences")[0]?.payload.hiddenSections?.includes("budget"))return [];
  const totals=financeTotals(records,month+"-01",day);
  return budgets.flatMap(row=>{
    const limit=convertFinance(BigInt(row.payload.amount),row.payload.currency,totals.prefs,day);
    const spent=row.payload.category?totals.categories.get(row.payload.category)??BigInt(0):totals.expense;
    if(limit===null||limit<=BigInt(0)||totals.missing.length)return [];
    const percent=spent*BigInt(100)/limit;
    return [{id:row.id,title:row.payload.title,percent:Number(percent>BigInt(100000)?BigInt(100000):percent)}];
  });
}
