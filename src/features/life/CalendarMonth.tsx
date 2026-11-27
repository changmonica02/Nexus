import { localDateKey } from "../../lib/todoCalendar";
import type { LifeCalendarEvent } from "./calendarSources";

export default function CalendarMonth({ days, events, selected, today, month, locale, select }: {
  days: Date[]; events: Map<string, LifeCalendarEvent[]>; selected: Date; today: Date; month: Date; locale: string;
  select: (date: Date)=>void;
}) {
  const selectedKey=localDateKey(selected), todayKey=localDateKey(today);
  const clock=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  return <div className="overflow-hidden rounded-xl border border-[var(--color-border)]">
    <div className="grid grid-cols-7 bg-[var(--color-sidebar-bg)]">{Array.from({length:7},(_,index)=><span key={index} className="py-2 text-center text-xs">
      {new Intl.DateTimeFormat(locale,{weekday:'narrow'}).format(new Date(2026,10,1+index))}
    </span>)}</div>
    <div className="grid grid-cols-7">{days.map(date=>{
      const key=localDateKey(date), items=events.get(key)??[];
      const labels=items.filter(item=>!['tasks','taskStart','habits'].includes(item.source)).sort((a,b)=>(a.startsAt??-Infinity)-(b.startsAt??-Infinity));
      const tasks=[...new Map(items.filter(item=>item.source==='tasks'||item.source==='taskStart').map(item=>[item.sourceId,item])).values()];
      const habits=items.filter(item=>item.source==='habits');
      return <button data-calendar-day type="button" key={key} aria-label={`${date.toLocaleDateString(locale)} · ${items.length} 筆事項`}
        aria-pressed={key===selectedKey} aria-current={key===todayKey?'date':undefined} onClick={()=>select(date)}
        className={'flex min-h-16 min-w-0 flex-col items-stretch border-t border-[var(--color-border)] p-1 text-left text-xs sm:min-h-24 '+
          (date.getMonth()!==month.getMonth()?'opacity-40 ':'')+(key===selectedKey?'ring-2 ring-inset ring-blue-500 ':'')+(key===todayKey?'bg-blue-500/10':'')}>
        <span className="block">{date.getDate()}</span>
        {labels.slice(0,3).map(item=><span key={item.source+':'+item.sourceId+':'+(item.occurrence??'')} className={'mt-1 block truncate rounded px-1 text-[10px] '+(item.source==='schedule'?'bg-emerald-500/15 ':'bg-violet-500/15 ')}>
          {item.source==='milestones'?'◆ ':item.startsAt!=null?clock.format(item.startsAt)+' ':''}{item.title}
        </span>)}
        {[["任務",tasks],["習慣",habits]].map(([label,rows])=>{
          const entries=rows as LifeCalendarEvent[];
          return entries.length?<span className="mt-1 block truncate text-[10px]" key={label as string}>{label as string} {entries.filter(item=>item.completed).length}/{entries.length}</span>:null;
        })}
        {labels.length>3&&<span className="block truncate text-[10px]">＋{labels.length-3} 筆</span>}
      </button>;
    })}</div>
  </div>;
}
