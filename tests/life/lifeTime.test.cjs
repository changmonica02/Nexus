require("../loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"), assert = require("node:assert/strict");
const { IndexedDBAdapter } = require("../../src/infrastructure/storage/IndexedDBAdapter.ts");
const { taskCalendarEvents, scheduleCalendarEvents, schedulePeriodMatches } = require("../../src/features/life/calendarSources.ts");
const { milestoneTarget, milestoneOccurs, civilDay } = require("../../src/features/life/milestoneDates.ts");
const { habitQuantity, habitStats } = require("../../src/features/life/habits.ts");
const { nextTaskId } = require("../../src/features/life/taskRepeat.ts");
const date = (y, m, d) => new Date(y, m - 1, d);

test("all-day, overnight and milestone calendar projections use local civil dates", () => {
  const first = date(2026, 11, 26), second = date(2026, 11, 27);
  const event = { id: "all-day", title: "全天", starts_at: civilDay(first), ends_at: civilDay(second), all_day: true };
  assert.equal(scheduleCalendarEvents([event], [first, second]).length, 2);
  assert.equal(schedulePeriodMatches(event, "day", second), true);
  const timed = { ...event, all_day: false, starts_at: first.getTime() + 3600000, ends_at: second.getTime() };
  assert.equal(scheduleCalendarEvents([timed], [first, second]).length, 1);
  const anniversary = { ...event, starts_at: civilDay(date(2024, 2, 29)), milestone: { yearly: true, mode: "remaining" } };
  assert.equal(milestoneOccurs(anniversary, date(2026, 2, 28)), true);
  assert.equal(milestoneOccurs(anniversary, date(2028, 2, 28)), false);
  assert.equal(milestoneTarget(anniversary, date(2028, 2, 28)), civilDay(date(2028, 2, 29)));
  assert.deepEqual(taskCalendarEvents([{ kind: "todo", id: "task", title: "Task", task_start_at: first.getTime(),
    due_date: second.getTime() }]).map(item => item.source), ["taskStart", "tasks"]);
});

test("habit stats support calendar weeks, partial current periods and bounded history", () => {
  const habit = {
    started_on: "2026-11-16", cadence: "weekly", goal: 3,
    quantities: { "2026-11-16": 1, "2026-11-18": 2, "2026-11-23": 1, "2026-11-26": 2, "2026-11-30": 3 },
  };
  assert.equal(habitQuantity(habit, date(2026, 11, 25)), 1);
  assert.deepEqual(habitStats(habit, date(2026, 11, 25)), { streak: 1, percent: 100 });
  assert.deepEqual(habitStats(habit, date(2026, 11, 26)), { streak: 2, percent: 100 });
  const daily = { ...habit, cadence: "daily", started_on: "2026-11-24", goal: 1,
    quantities: { "2026-11-24": 1, "2026-11-25": 1, "2026-11-26": 1 } };
  assert.deepEqual(habitStats(daily, date(2026, 11, 27)), { streak: 3, percent: 75 });
});

test("completing a monthly task queues exactly one next occurrence atomically", async () => {
  const storage = new IndexedDBAdapter();
  await storage.init();
  const owner = "time-repeat-owner";
  storage.setWorkspaceOwner(owner);
  try {
    const original = await storage.createPage({ kind: "todo", title: "月底", due_date: date(2026, 1, 31).getTime() });
    const repeat = { ...original, task_repeat: "monthly", task_steps: [{ id: "step", title: "確認", done: true }] };
    await storage.savePage(repeat);
    await storage.savePage({ ...repeat, completed: true });
    const pending = await storage.getWorkspacePersistence().pending(owner);
    assert.equal(pending.at(-1).operations.length, 2);
    const nextId = await nextTaskId(original.id);
    const next = await storage.getPage(nextId);
    assert.equal(next.due_date, date(2026, 2, 28).getTime());
    assert.equal(next.completed, false);
    assert.equal(next.task_steps[0].done, false);
    await storage.savePage({ ...repeat, completed: false });
    await storage.savePage({ ...repeat, completed: true });
    assert.equal((await storage.listPages()).length, 2);
    await storage.savePage({ ...next, completed: true });
    assert.equal((await storage.getPage(await nextTaskId(nextId))).due_date, date(2026, 3, 31).getTime());
  } finally { await storage.close(); }
});
