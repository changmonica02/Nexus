require('./loadStudy.cjs');
const test = require('node:test'), assert = require('node:assert/strict');
const { calendarDaysForMonth, localDateKey, todosForDay } = require('../src/lib/todoCalendar.ts');
test('home and full calendar share six local weeks and exclude removed or unscheduled tasks', () => {
  const month = new Date(2026, 10, 14), days = calendarDaysForMonth(month);
  assert.equal(days.length, 42); assert.equal(days[0].getDay(), 0);
  assert.equal(days.filter(day => day.getMonth() === 10).length, 30);
  assert.equal(new Set(days.map(localDateKey)).size, 42);
  const page = { id: 'a', kind: 'todo', due_date: new Date(2026, 10, 14, 0, 1).getTime() };
  assert.deepEqual(todosForDay([page, { ...page, id: 'done', completed: true }, { ...page, id: 'trash', deleted_at: 1 }, { ...page, id: 'undated', due_date: null }, { ...page, id: 'note', kind: 'note' }, { ...page, id: 'tomorrow', due_date: new Date(2026, 10, 15).getTime() }], month).map(p => p.id), ['a', 'done']);
});

test('local date inputs preserve civil dates, leap years and DST boundaries',()=>{
 const {localDateInput,localDateTimeInput}=require('../src/lib/todoCalendar.ts');
 for(const [year,month,day] of [[2024,1,29],[2026,2,8],[2026,10,1]]){const date=new Date(year,month,day,9,30);assert.equal(localDateInput(date),`${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`);assert.equal(localDateTimeInput(date.getTime()),localDateInput(date)+'T09:30');}
 assert.equal(localDateTimeInput(null),'');
});
