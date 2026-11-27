require("../loadStudy.cjs");
const test = require("node:test"), assert = require("node:assert/strict");
const { layoutTimeline } = require("../../src/features/life/calendarTimeline.ts");
const { scheduleCalendarEvents, habitCalendarEvents } = require("../../src/features/life/calendarSources.ts");
const { scheduleOccurrences } = require("../../src/features/life/scheduleRecurrence.ts");
const { habitTrackingStats } = require("../../src/features/life/habits.ts");
const { nextTaskOccurrence } = require("../../src/features/life/taskRepeat.ts");
const local = (day, hour = 0) => new Date(2026, 10, day, hour);

test("timeline clips an overnight event at midnight and allocates lanes only within overlaps", () => {
  const day = local(27);
  const item = (id, start, end) => ({ source: "schedule", sourceId: id, title: id, completed: false,
    date: day.getTime(), startsAt: start.getTime(), endsAt: end.getTime() });
  const rows = layoutTimeline([
    item("overnight", local(26, 23), local(27, 2)),
    item("early", local(27, 1), local(27, 3)),
    item("late", local(27, 3), local(27, 4)),
  ], day);
  assert.deepEqual(rows.map(row => [row.start, row.end, row.lane, row.lanes]),
    [[0, 120, 0, 2], [60, 180, 1, 2], [180, 240, 0, 1]]);
});

test("monthly weekday rules skip months without a fifth Monday and respect exception counts", () => {
  const starts_at = Date.parse("2026-01-01T00:00:00Z");
  const record = { starts_at, ends_at: starts_at, all_day: true, repeat_rule: {
    frequency: "month", interval: 1, zone: "UTC", weekdays: [], until: "", count: 3,
    monthWeekday: { weekday: 1, ordinal: 5 }, exceptions: ["2026-06-29"], overrides: {},
  } };
  assert.deepEqual(scheduleOccurrences(record, "2026-12-31").map(row => row.key), ["2026-03-30", "2026-08-31"]);
});

test("annual milestones retain leap day intent and can skip one occurrence by identity", () => {
  const stamp = Date.parse("2024-02-29T00:00:00Z");
  const anniversary = { id: "birthday", starts_at: stamp, ends_at: stamp, all_day: true, milestone: { yearly: true } };
  const day = new Date(2026, 1, 28);
  assert.equal(scheduleCalendarEvents([anniversary], [day])[0].occurrence, "2026-02-28");
  const rule = { frequency: "year", interval: 1, zone: "UTC", weekdays: [], until: "", count: null,
    exceptions: ["2026-02-28"], overrides: {} };
  assert.equal(scheduleCalendarEvents([{ ...anniversary, repeat_rule: rule }], [day]).length, 0);
  assert.equal(scheduleCalendarEvents([{ ...anniversary, repeat_rule: rule }], [new Date(2028, 1, 29)])[0].sourceId, "birthday");
});

test("flexible monthly tasks aggregate actual records without projecting future appointments", () => {
  const habit = { id: "reading", title: "閱讀", cadence: "monthly", started_on: "2026-08-20", goal: 3,
    quantities: { "2026-08-25": 3, "2026-09-20": 3, "2026-10-01": 1, "2026-11-11": 2 } };
  const stats = habitTrackingStats(habit, local(27));
  assert.deepEqual(stats.history.map(row => row.status), ["complete", "complete", "missed", "partial"]);
  assert.deepEqual([stats.streak, stats.longest, stats.percent], [0, 2, 67]);
  assert.equal(habitCalendarEvents([habit], [local(27), local(28)], local(27)).length, 0);
});

test("completion-driven recurrence schedules relative to completion and resets the new task", t => {
  const completed = local(27, 14);
  t.mock.method(Date, "now", () => completed.getTime());
  const next = nextTaskOccurrence({ kind: "todo", completed: true, task_repeat: "after_completion",
    task_repeat_day: 3, due_date: local(20, 9).getTime(), task_steps: [{ id: "a", title: "a", done: true }] }, "next");
  assert.equal(next.due_date, local(30, 14).getTime());
  assert.equal(next.completed, false);
  assert.equal(next.task_steps[0].done, false);
});
