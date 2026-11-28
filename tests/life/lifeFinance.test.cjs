require("../loadStudy.cjs");
require("fake-indexeddb/auto");
const test=require("node:test"),assert=require("node:assert/strict");
const {IndexedDBAdapter}=require("../../src/infrastructure/storage/IndexedDBAdapter.ts");
const {financeRow,financeRows,preferencesId}=require("../../src/features/life/finance/model.ts");
const {minorUnits,exchange}=require("../../src/features/life/finance/money.ts");
const {financeTotals,holdings,subscriptionNext}=require("../../src/features/life/finance/ledger.ts");
const {scheduleOccurrences}=require("../../src/features/life/scheduleRecurrence.ts");
const owner="finance-unit-owner";
const common={title:"測試",notes:""};
const account=(id,type,currency,opening)=>financeRow(owner,"account",{...common,type,currency,opening,icon:"",color:"#000000",archived:false,limit:"0",statementDay:1,paymentDay:15,due:""},id);
const transaction=(id,type,account,amount,target="",targetAmount="0")=>financeRow(owner,"transaction",{...common,date:"2026-01-31",type,account,amount,target,targetAmount,category:"餐飲",source:"",attachment:""},id);
test("minor units, manual rates, card charges and transfers yield distinct cash flow and balances",()=>{
 assert.equal(minorUnits("0.10","USD")+minorUnits("0.20","USD"),30n);
 assert.equal(exchange(999n,"USD","TWD","32.543"),32510n);
 assert.throws(()=>minorUnits("14.1","JPY"));
 const records=[account("bank","bank","TWD","1000000"),account("visa","card","TWD","0"),account("usd","wallet","USD","100"),
 financeRow(owner,"preferences",{currency:"TWD",rates:{USD:"32.5"},categories:["餐飲"]},preferencesId(owner)),
 transaction("income","income","bank","50000"),transaction("meal","expense","visa","12000"),
 transaction("pay","cardPayment","bank","12000","visa","12000"),transaction("fx","transfer","bank","3250","usd","100")];
 const result=financeTotals(records,"2026-01-01","2026-01-31");
 assert.equal(result.income,50000n);assert.equal(result.expense,12000n);
 assert.equal(result.balances.get("visa"),0n);assert.equal(result.balances.get("usd"),200n);
 assert.equal(result.net,1041250n);assert.deepEqual(result.missing,[]);
});
test("weighted average retains exact remaining cost and omits missing market prices",()=>{
 const stock=financeRow(owner,"instrument",{...common,type:"etf",currency:"TWD",price:""},"stock");
 const trade=(id,type,quantity,price,fee,date)=>financeRow(owner,"trade",{...common,instrument:"stock",type,quantity,price,fee,date},id);
 const rows=[stock,trade("first","buy","2000000","150","1","2026-01-01"),trade("second","sell","1000000","200","2","2026-01-02")];
 const [position]=holdings(rows);
 assert.equal(position.cost,150n);assert.equal(position.realized,47n);assert.equal(position.market,null);
 assert.throws(()=>holdings([...rows,trade("third","sell","2000000","200","0","2026-01-03")]),/持倉/);
});
test("confirming the same subscription period concurrently leaves one expense and keeps the month anchor",async()=>{
 const db=new IndexedDBAdapter();await db.init();db.setWorkspaceOwner(owner);
 try{
  const repo=db.getLifeRepository();await repo.saveFinance(account("bank","bank","TWD","100000"));
  const record=financeRow(owner,"subscription",{...common,amount:"12900",currency:"TWD",cycle:"month",interval:1,anchorDay:31,next:"2026-01-31",account:"bank",category:"訂閱",state:"active",trial:"",url:"",icon:""},"sub");
  assert.equal(subscriptionNext({...record.payload,next:"2026-02-28"}),"2026-03-31");
  await repo.saveFinance(record);
  const active=financeRows(await repo.readFinance(),"subscription")[0];
  const results=await Promise.allSettled([repo.confirmSubscription(active,"2026-01-31"),repo.confirmSubscription(active,"2026-01-31")]);
  assert.equal(results.filter(result=>result.status==="fulfilled").length,1);
  const rows=await repo.readFinance();
  assert.equal(financeRows(rows,"transaction").length,1);
  assert.equal(financeRows(rows,"subscription")[0].payload.next,"2026-02-28");
  db.setWorkspaceOwner("another-finance-owner");
  assert.deepEqual(await db.getLifeRepository().readFinance(),[]);
 }finally{await db.close();}
});
test("repeat rules retain monthly anchor, handle weekly exceptions and preserve wall clock through DST",()=>{
 const iso=(value)=>Date.parse(value);
 const event={id:"s",title:"行程",category:"",notes:"",all_day:true,starts_at:iso("2024-01-31"),ends_at:iso("2024-01-31"),
 repeat_rule:{frequency:"month",interval:1,count:3,until:"",weekdays:[],zone:"UTC",exceptions:[],overrides:{}}};
 assert.deepEqual(scheduleOccurrences(event,"2024-06-01").map(item=>item.key),["2024-01-31","2024-02-29","2024-03-31"]);
 const weekly={...event,all_day:false,starts_at:iso("2026-03-01T14:00:00Z"),ends_at:iso("2026-03-01T15:00:00Z"),
 repeat_rule:{...event.repeat_rule,frequency:"week",count:4,weekdays:[0],zone:"America/New_York",exceptions:["2026-03-15"]}};
 const result=scheduleOccurrences(weekly,"2026-04-01");
 assert.deepEqual(result.map(item=>item.key),["2026-03-01","2026-03-08","2026-03-22"]);
 assert.deepEqual(result.map(item=>new Date(item.event.starts_at).getUTCHours()),[14,13,13]);
});

test("historical cash flow uses transaction-date rates and excludes future rates",()=>{
 const records=[account("usd","wallet","USD","0"),
   financeRow(owner,"preferences",{currency:"TWD",rates:{USD:"99"},categories:[],rateHistory:[
     {date:"2026-01-15",base:"TWD",currency:"USD",rate:"30"},
     {date:"2026-02-01",base:"TWD",currency:"USD",rate:"35"},
   ]},preferencesId(owner)),
   transaction("january","expense","usd","100"),
   {...transaction("early","expense","usd","100"),payload:{...transaction("early","expense","usd","100").payload,date:"2026-01-01"}},
 ];
 const january=financeTotals(records,"2026-01-01","2026-01-31");
 assert.equal(january.expense,3000n);
 assert.deepEqual(january.missing,["USD"]);
 const february=financeTotals(records,"2026-01-01","2026-02-28");
 assert.equal(february.expense,3000n);
 assert.equal(february.debts,7000n);
});

test("budget thresholds use dated currency conversion and exclude credit card settlement",()=>{
 const {budgetAlerts}=require("../../src/features/life/finance/budgetAlerts.ts");
 const prefs=financeRow(owner,"preferences",{currency:"TWD",rates:{USD:"99"},categories:[],rateHistory:[
  {date:"2026-01-01",base:"TWD",currency:"USD",rate:"30"},
  {date:"2026-02-01",base:"TWD",currency:"USD",rate:"40"},
 ]},preferencesId(owner));
 const budget=financeRow(owner,"budget",{...common,title:"餐飲",month:"2026-01",amount:"100",currency:"USD",category:"餐飲"},"budget");
 const records=[prefs,budget,account("bank","bank","TWD","10000"),account("card","card","TWD","0"),
  transaction("charge","expense","card","2400"),transaction("pay","cardPayment","bank","2400","card","2400")];
 assert.deepEqual(budgetAlerts(records,"2026-01-31"),[{id:"budget",title:"餐飲",percent:80}]);
 assert.deepEqual(budgetAlerts([{...prefs,payload:{...prefs.payload,hiddenSections:["budget"]}},...records.slice(1)],"2026-01-31"),[]);
});

test("scheduled income and a one-time override affect the ledger only on confirmation", async () => {
 const db = new IndexedDBAdapter();
 await db.init();
 const recurringOwner = owner + "-recurring";
 db.setWorkspaceOwner(recurringOwner);
 try {
  const repo = db.getLifeRepository();
  await repo.saveFinance({ ...account("salary-bank", "bank", "TWD", "1000"), workspace_owner_id: recurringOwner });
  const payload = { ...common, type: "income", amount: "500", currency: "TWD", cycle: "month",
   interval: 1, anchorDay: 31, next: "2026-01-31", account: "salary-bank", category: "薪資",
   state: "active", trial: "", url: "", icon: "", until: "2026-03-31" };
  await repo.saveFinance(financeRow(recurringOwner, "subscription", payload, "salary"));
  const series = async () => financeRows(await repo.readFinance(), "subscription")[0];
  await repo.editRecurringFinance(await series(), { ...payload, amount: "700" }, "2026-01-31", "single");
  await repo.skipRecurringFinance(await series(), "2026-02-28");
  assert.equal(financeTotals(await repo.readFinance(), "2026-01-01", "2026-01-31").income, 0n);
  await repo.resolveRecurringFinance(await series(), "2026-01-31");
  const totals = financeTotals(await repo.readFinance(), "2026-01-01", "2026-01-31");
  assert.equal(totals.income, 700n);
  assert.equal(totals.net, 1700n);
  assert.equal((await series()).payload.next, "2026-03-31");
  await repo.resolveRecurringFinance(await series());
  assert.equal((await series()).payload.state, "cancelled");
  assert.equal(financeRows(await repo.readFinance(), "transaction").length, 1);
 } finally {
  await db.close();
 }
});

test("a loan repayment reduces principal and counts only interest as spending", () => {
 const records = [account("cash", "bank", "TWD", "9000"), account("loan", "loan", "TWD", "-5000"),
  { ...transaction("settlement", "repayment", "cash", "1000", "loan", "1000"),
   payload: { ...transaction("settlement", "repayment", "cash", "1000", "loan", "1000").payload, interest: "100", category: "" } }];
 const totals = financeTotals(records, "2026-01-01", "2026-01-31");
 assert.equal(totals.balances.get("cash"), 7900n);
 assert.equal(totals.balances.get("loan"), -4000n);
 assert.equal(totals.net, 3900n);
 assert.equal(totals.expense, 100n);
 assert.equal(totals.categories.get("貸款利息"), 100n);
});
