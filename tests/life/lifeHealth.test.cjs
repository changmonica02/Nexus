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
