require("../loadStudy.cjs");
const test=require("node:test"),assert=require("node:assert/strict");
const {defaultTaskSettings,editTaskPlan,executionHistory,makeExecution,taskSlots,taskStatistics}=require("../../src/features/life/taskPlan.ts");
const day=key=>new Date(key+"T00:00:00");
const blank={segments:[],excluded:[],overrides:{}};
const fixed=(anchor,rule={})=>({...defaultTaskSettings(day(anchor)),recurrence:{mode:"fixed",rule:{
  frequency:"day",interval:1,weekdays:[],until:"",count:null,exceptions:[],zone:"UTC",overrides:{},...rule,
}}});
const page={id:"book",workspace_owner_id:"owner"};
test("fixed rules preserve civil timing through DST and separate deadline from a cross-midnight execution",()=>{
  const settings={...fixed("2026-03-07"),zone:"America/New_York",
    startsAt:Date.parse("2026-03-08T03:00Z"),endsAt:Date.parse("2026-03-08T06:00Z"),dueAt:Date.parse("2026-03-08T20:00Z")};
  const plan=editTaskPlan(blank,undefined,"all",settings);
  const rows=taskSlots(plan,[],"2026-03-07","2026-03-09");
  assert.equal(new Date(rows[1].startsAt).toISOString(),"2026-03-09T02:00:00.000Z");
  assert.equal(new Date(rows[1].endsAt).toISOString(),"2026-03-09T05:00:00.000Z");
  assert.equal(new Date(rows[1].dueAt).toISOString(),"2026-03-09T20:00:00.000Z");
});
test("editing or removing one or future occurrences preserves recorded execution history",()=>{
  const start="2026-01-01",end="2026-01-05";
  const settings=fixed(start,{count:5});
  const plan=editTaskPlan(blank,undefined,"all",settings);
  const [first,second,third]=taskSlots(plan,[],start,end);
  const saved=makeExecution(page,second,"complete",1);
  const one=editTaskPlan(plan,second,"one",null);
  assert.equal(taskSlots(one,[saved],start,end).some(row=>row.key===second.key),false);
  assert.equal(executionHistory(one,[saved],end).find(row=>row.key===second.key).status,"complete");
  const future=editTaskPlan(plan,third,"future",null);
  assert.deepEqual(taskSlots(future,[saved],start,end).map(row=>[row.key,row.status]),[[first.key,"pending"],[second.key,"complete"]]);
});
test("flexible periods aggregate by cycle and skipped and unfinished current periods do not count",()=>{
  const settings={...defaultTaskSettings(day("2026-09-03")),tracking:true,
    goal:{kind:"duration",target:30,unit:"分鐘"},recurrence:{mode:"flexible",period:"monthly"}};
  const plan=editTaskPlan(blank,undefined,"all",settings);
  const [september,october]=taskSlots(plan,[],"2026-09-03","2026-10-31");
  const now=Date.parse("2026-11-04T10:00:00Z");
  const stats=taskStatistics(taskSlots(plan,[makeExecution(page,september,"complete",30,now),makeExecution(page,october,"skipped",0,now)],
    "2026-09-03","2026-11-04",now),"2026-11-04","daily");
  assert.equal(stats.rate,100);
  assert.equal(stats.current,1);
  assert.equal(stats.periods[0][0],"2026-09-01");
});
test("after completion owns one deterministic successor and undo retains the recorded prior execution identity",()=>{
  const settings={...defaultTaskSettings(day("2026-11-01")),zone:"UTC",recurrence:{mode:"after",days:3}};
  const plan=editTaskPlan(blank,undefined,"all",settings);
  const [first]=taskSlots(plan,[],"2026-11-01","2026-11-30");
  const record=makeExecution(page,first,"complete",1,Date.parse("2026-11-05T22:00:00Z"));
  const [done,next]=taskSlots(plan,[record],"2026-11-01","2026-11-30");
  assert.equal(next.day,"2026-11-08");
  const undone=makeExecution(page,done,"pending",0);
  assert.equal(undone.id,record.id);
  assert.equal(taskSlots(plan,[undone],"2026-11-01","2026-11-30").length,1);
});

test("series splitting keeps the original occurrence ID on the shared dates",()=>{
  const start="2026-11-27",end="2026-11-29";
  const settings=fixed(start,{count:3});
  const plan=editTaskPlan(blank,undefined,"all",settings);
  const [,slot]=taskSlots(plan,[],start,end);
  const completed=makeExecution(page,slot,"complete",1);
  const edited=editTaskPlan(plan,slot,"future",{...settings,anchor:slot.day,notes:"新版",recurrence:{
    ...settings.recurrence,rule:{...settings.recurrence.rule,count:2},
  }});
  const rows=taskSlots(edited,[completed],start,"2026-11-30");
  assert.equal(rows.length,3);
  assert.equal(rows[1].key,slot.key);
  assert.equal(rows[1].status,"complete");
  assert.equal(rows[1].settings.notes,"新版");
});
