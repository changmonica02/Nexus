require("../loadStudy.cjs");
const test = require("node:test");
const assert = require("node:assert/strict");
const { makeHealth, toItem, shared, validateHealth } = require("../../src/features/life/health/model.ts");
const { bmi, totals, healthEvents } = require("../../src/features/life/health/summary.ts");

const day = "2026-11-26";
const record = (kind, data) => makeHealth(null, kind, { date: day, time: "08:00", ...data });

test("food conversion preserves meal snapshots and treats absent nutrients distinctly", () => {
  const food = record("food", { title: "豆漿", unit: "ml", ml: 250, kcal: 42, sugar: 0 });
  validateHealth(food);
  const item = toItem(food, 2, "份");
  const meal = record("meal", {title:"早點", items:[item]});
  validateHealth(meal);
  food.data.kcal = 55;
  const { nutrients } = totals([meal], day, "2026-11-27");
  assert.deepEqual(nutrients.kcal, {amount:210, missing:0});
  assert.deepEqual(nutrients.sugar, {amount:0, missing:0});
  assert.deepEqual(nutrients.protein, {amount:null, missing:1});
  assert.throws(() => toItem(food, 200, "g"), /換算/);
});

test("health projections opt in and plans never count as completed workouts", () => {
  const size = record("body", {weight:65,height:170});
  const plan = record("plan", {title:"散步",minutes:30,weekdays:"4"});
  const exercise = record("exercise", {title:"散步",minutes:20});
  const rows = [size, plan, exercise];
  const days = [new Date(2026, 10, 26)];
  assert.equal(bmi(rows, day).toFixed(2), "22.49");
  assert.deepEqual(shared(rows,{}),[]);
  assert.deepEqual(shared(rows,{share_body:true}),[size]);
  assert.deepEqual(healthEvents(rows,days,{calendar:true,off_exercise:true}),[]);
  assert.equal(healthEvents(rows,days,{calendar:true}).length,2);
  assert.equal(totals(rows,day,"2026-11-27").minutes,20);
});

test("cycle estimates need three distinct starts and respect completed durations", () => {
  const {cycleSummary}=require("../../src/features/life/health/sensitive.ts");
  const first=record("cycle",{date:"2026-09-01",until:"2026-09-05"});
  const second=record("cycle",{date:"2026-09-29",until:"2026-10-02"});
  assert.equal(cycleSummary([first,second]).next,null);
  const complete=cycleSummary([first,second,record("cycle",{date:"2026-10-27"})]);
  assert.equal(complete.next,"2026-11-24");
  assert.equal(complete.duration,4.5);
});

test("medication stock tracks actual doses, and sensitive calendar events require their own permission", () => {
  const {medicationDue,medicationStock}=require("../../src/features/life/health/sensitive.ts");
  const item=record("medication",{title:"私人名稱",quantity:1,unit:"份",frequency:"interval",interval:2,stock:12});
  const taken=record("dose",{medication:item.id,title:"私人名稱",status:"taken",actual:day+"T08:30",planned:"08:00",quantity:2});
  const skipped=record("dose",{medication:item.id,title:"私人名稱",status:"skipped",quantity:2});
  validateHealth(item);
  validateHealth(taken);
  assert.equal(medicationStock(item,[taken,skipped]),10);
  assert.equal(medicationStock(item,[skipped]),12);
  assert.equal(medicationDue(item,"2026-11-27"),false);
  const days=[new Date(2026,10,26)];
  assert.deepEqual(healthEvents([item,taken],days,{calendar:true}),[]);
  assert.equal(healthEvents([item,taken],days,{calendarMedication:true})[0].title,"服用提醒");
  assert.deepEqual(healthEvents([item,taken],days,{calendarMedication:true,off_medication:true}),[]);
});

test("multiple medication times render distinct privacy-gated occurrences and deduplicate each slot", () => {
  const {medicationStock,doseIsDuplicate}=require("../../src/features/life/health/sensitive.ts");
  const medication=record("medication",{title:"個人項目",quantity:1,unit:"份",frequency:"daily",times:"08:00, 20:00, 08:00",stock:10});
  validateHealth(medication);
  const dose=(id,planned,quantity,updated_at)=>({...record("dose",{medication:medication.id,planned,status:"taken",quantity}),id,updated_at});
  const morning=dose("a","08:00",1,1), morningNew=dose("b","08:00",2,2), evening=dose("c","20:00",1,3);
  const rows=[medication,morning,morningNew,evening];
  assert.equal(medicationStock(medication,rows),7);
  assert.equal(doseIsDuplicate(morning,rows),true);
  assert.equal(doseIsDuplicate(evening,rows),false);
  assert.deepEqual(healthEvents(rows,[new Date(2026,10,26)],{calendarMedication:true}).map(event=>event.occurrence),["08:00","20:00"]);
});

test("reminders have stable per-date identities, priority and reversible visibility",()=>{
  const {ruleOccurrence,previewRule,visibleReminders}=require("../../src/features/life/reminderModel.ts");
  const rule={id:"rule-a",title:"檢查庫存",start:"2026-11-20",interval:3,enabled:true};
  const reminder=ruleOccurrence(rule,day);
  assert.ok(reminder);
  assert.equal(previewRule(rule,"2026-11-27"),"2026-11-29");
  assert.equal(ruleOccurrence(rule,"2026-11-27"),null);
  const urgent={id:"late",day:"2026-11-25",title:"逾期",priority:2,source:"待辦"};
  assert.deepEqual(visibleReminders([reminder,urgent,reminder],{},day,0,"").map(row=>row.id),["late",reminder.id]);
  assert.deepEqual(visibleReminders([reminder],{[reminder.id]:{hiddenUntil:"2026-11-27"}},day,0,""),[]);
});

test("reminder rules honor completion and retain stable identity after editing the task",()=>{
  const {ruleOccurrence,isReminderPreferences,visibleReminders}=require("../../src/features/life/reminderModel.ts");
  const rule={id:"a",title:"整理資料",start:"2026-11-26",interval:1,enabled:true,trigger:"task-completed",task:"t"};
  const date="2026-11-26";
  assert.equal(ruleOccurrence(rule,date,[{id:"t",completed:false,day:date}]),null);
  const row=ruleOccurrence(rule,date,[{id:"t",completed:true,day:date}]);
  const edited=ruleOccurrence(rule,date,[{id:"t",completed:true,day:"2026-11-27"}]);
  assert.equal(row.id,edited.id);
  assert.equal(visibleReminders([row],{[row.id]:{priority:3}},date,0,"")[0].priority,3);
  assert.equal(isReminderPreferences({lead:1,rules:[rule],status:{[row.id]:{priority:3,handled:true}}}),true);
  assert.equal(isReminderPreferences({lead:1,rules:[{...rule,start:"2026-02-30"}],status:{}}),false);
});

test("overdue thresholds and opted-in list date reminders respect source state",()=>{
  const {ruleOccurrence,listDateReminders}=require("../../src/features/life/reminderModel.ts");
  const day="2026-11-27";
  const rule={id:"threshold",title:"補看待辦",start:day,interval:1,enabled:true,trigger:"overdue-count",threshold:1};
  assert.equal(ruleOccurrence(rule,day,[{id:"a",completed:true,due:"2026-11-26",day}]),null);
  assert.equal(ruleOccurrence(rule,day,[{id:"a",due:"2026-11-26",day}]).title,"補看待辦");
  const list={id:"l",deleted_at:null,fields:[{id:"expiry",name:"效期",type:"date",reminder:true},{id:"private",name:"私人日期",type:"date"}]};
  const item={id:"i",list_id:"l",deleted_at:null,title:"食材",values:{expiry:day,private:day}};
  const rows=listDateReminders({life_lists:[list],life_items:[item],life_categories:[]},day,day);
  assert.deepEqual(rows.map(row=>row.title),["食材 · 效期"]);
  assert.deepEqual(listDateReminders({life_lists:[{...list,deleted_at:1}],life_items:[item],life_categories:[]},day,day),[]);
});

test("record and budget rules use stable revision and month receipts",()=>{
 const {ruleOccurrences}=require("../../src/features/life/reminderModel.ts");
 const day="2026-11-27", rule={id:"r",title:"提醒",start:day,interval:1,enabled:true};
 const list={...rule,trigger:"list-updated",listId:"l"};
 const entry={id:"i",listId:"l",revision:1,day};
 assert.notEqual(ruleOccurrences(list,day,[],[entry])[0].id,ruleOccurrences(list,day,[],[{...entry,revision:2}])[0].id);
 assert.deepEqual(ruleOccurrences(list,day,[],[{...entry,listId:"elsewhere"}]),[]);
 const budget={...rule,trigger:"budget-percent",budgetId:"b",threshold:80};
 assert.deepEqual(ruleOccurrences(budget,day,[],[],[{id:"b",percent:79}]),[]);
 assert.equal(ruleOccurrences(budget,day,[],[],[{id:"b",percent:80}])[0].id,
   ruleOccurrences(budget,"2026-11-30",[],[],[{id:"b",percent:95}])[0].id);
});

test("habit automation uses the selected habit and deduplicates a weekly goal from Monday", () => {
  const { ruleOccurrences } = require("../../src/features/life/reminderModel.ts");
  const rule = { id: "rule", trigger: "habit-completed", habitId: "habit", title: "習慣達標",
    start: "2026-11-23", enabled: true, interval: 1 };
  const habit = { id: "habit", cadence: "weekly", started_on: "2026-11-23", goal: 3,
    quantities: { "2026-11-23": 1, "2026-11-24": 2, "2026-11-30": 3 } };
  const occurrences = (day, habits = [habit]) => ruleOccurrences(rule, day, [], [], [], habits);
  assert.deepEqual(occurrences("2026-11-23"), []);
  assert.equal(occurrences("2026-11-24").length, 1);
  assert.equal(occurrences("2026-11-24")[0].id, occurrences("2026-11-29")[0].id);
  assert.notEqual(occurrences("2026-11-29")[0].id, occurrences("2026-11-30")[0].id);
  assert.deepEqual(occurrences("2026-11-24", []), []);
});
