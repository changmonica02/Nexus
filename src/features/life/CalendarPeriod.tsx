import { addDays, localDateKey } from "../../lib/todoCalendar";
import type { LifeCalendarEvent } from "./calendarSources";
import { control, surface } from "./dashboard/styles";

export type CalendarView = "month" | "week" | "day";
export function calendarWeek(date: Date) {
  const first = addDays(date, -date.getDay());
  return Array.from({length:7},(_,index)=>addDays(first,index));
}
const sourceLabels: Record<LifeCalendarEvent["source"],string> = {
  schedule:"行程", taskStart:"任務開始", tasks:"任務截止", milestones:"重要日期", habits:"習慣", finance:"財務",
};
export function CalendarPeriod({days,events,locale,open,select}:{
  days:Date[];events:Map<string,LifeCalendarEvent[]>;locale:string;
  open:(event:LifeCalendarEvent)=>void;select:(date:Date)=>void;
}){
  const clock=new Intl.DateTimeFormat(locale,{hour:"2-digit",minute:"2-digit",hourCycle:"h23"});
  return <div className={days.length===1?"grid gap-3":"grid gap-3 sm:grid-cols-2 xl:grid-cols-7"}>
    {days.map(day=>{
      const key=localDateKey(day);
      const items=[...(events.get(key)??[])].sort((a,b)=>(a.startsAt??-Infinity)-(b.startsAt??-Infinity));
      return <section key={key} className={surface+" p-3"}>
        <button className={control+" mb-2 w-full text-left font-semibold"} type="button" onClick={()=>select(day)}>
          {day.toLocaleDateString(locale,{weekday:"short",month:"numeric",day:"numeric"})}</button>
        {items.length===0?<p className="text-sm opacity-65">沒有事項</p>:<ul className="space-y-2">{items.map(item=>
          <li key={item.source+":"+item.sourceId+":"+(item.occurrence??"")}>
            <button type="button" className="min-h-11 w-full break-words rounded-lg bg-zinc-500/10 p-2 text-left text-sm" onClick={()=>open(item)}>
              <span className="block text-xs opacity-75">{item.allDay?"全天":item.startsAt!=null?clock.format(item.startsAt):"當日"} ・{sourceLabels[item.source]}</span>
              <span className={item.completed?"line-through":""}>{item.title}</span>
            </button>
          </li>)}</ul>}
      </section>;
    })}
  </div>;
}
