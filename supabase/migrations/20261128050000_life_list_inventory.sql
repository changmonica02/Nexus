begin;
create unique index life_items_owner_identity on public.life_items(owner_id,id);

create table public.life_stock_positions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null, revision bigint not null check(revision>0),
  created_at bigint not null, updated_at bigint not null, deleted_at bigint,
  title text not null check(length(btrim(title)) between 1 and 120), parent_id text,
  primary key(owner_id,id),
  foreign key(owner_id,parent_id) references public.life_stock_positions(owner_id,id)
);
create table public.life_stock_events (
  owner_id uuid not null references auth.users(id) on delete cascade,
  id text not null, revision bigint not null check(revision=1),
  created_at bigint not null, updated_at bigint not null, deleted_at bigint check(deleted_at is null),
  item_id text not null, container_id text not null, lot_id text not null,
  sequence integer not null check(sequence>0),
  action text not null check(action in ('purchase','open','use','estimate','adjust','move','discard','undo')),
  capacity numeric not null check(capacity>0 and capacity<=1000000000 and scale(capacity)<=6),
  remaining numeric not null check(remaining>=0 and remaining<=capacity and scale(remaining)<=6),
  unit text not null check(length(unit) between 1 and 20),
  position_id text, purchased_on date not null, expiry date, opened_on date,
  state text not null check(state in ('sealed','open','used','discarded')),
  note text not null default '' check(length(note)<=1000),
  price text,currency text,
  primary key(owner_id,id), unique(owner_id,container_id,sequence),
  foreign key(owner_id,item_id) references public.life_items(owner_id,id),
  foreign key(owner_id,position_id) references public.life_stock_positions(owner_id,id),
  check(id=container_id||':'||sequence::text),
  check(opened_on is null or opened_on>=purchased_on),
  check((price is null and currency is null) or coalesce(price ~ '^[0-9]{1,14}(\.[0-9]{1,4})?$' and currency ~ '^[A-Z]{3}$',false)),
  check((state='sealed' and opened_on is null and remaining=capacity) or
        (state='open' and opened_on is not null and remaining>0) or (state in ('used','discarded') and remaining=0))
);
create index life_stock_events_item on public.life_stock_events(owner_id,item_id);
create index life_stock_events_pull on public.life_stock_events(owner_id,updated_at,id);
create index life_stock_positions_pull on public.life_stock_positions(owner_id,updated_at,id);

alter table public.life_stock_events enable row level security;
alter table public.life_stock_positions enable row level security;
revoke all on public.life_stock_events,public.life_stock_positions from public,anon,authenticated;
grant select on public.life_stock_events,public.life_stock_positions to authenticated;
create policy read_own on public.life_stock_events for select to authenticated using ((select auth.uid())=owner_id);
create policy read_own on public.life_stock_positions for select to authenticated using ((select auth.uid())=owner_id);

create function public.check_life_stock_event() returns trigger language plpgsql set search_path='' as $$
declare prev public.life_stock_events; prior public.life_stock_events;
begin
  if tg_op<>'INSERT' then raise exception 'Stock history is append only'; end if;
  if not exists(select 1 from public.life_items i join public.life_lists l on l.owner_id=i.owner_id and l.id=i.list_id
    where i.owner_id=new.owner_id and i.id=new.item_id and i.deleted_at is null and l.deleted_at is null and l.configuration->>'inventory'='true')
    then raise exception 'Stock requires an active item with inventory enabled'; end if;
  if new.position_id is not null and not exists(select 1 from public.life_stock_positions p
    where p.owner_id=new.owner_id and p.id=new.position_id and p.deleted_at is null) then raise exception 'Invalid stock position'; end if;
  if new.sequence=1 then
    if new.action<>'purchase' or new.state<>'sealed' then raise exception 'Stock must start with a receipt'; end if;
    return new;
  end if;
  select * into prev from public.life_stock_events where owner_id=new.owner_id and container_id=new.container_id and sequence=new.sequence-1;
  if not found or (new.item_id,new.lot_id,new.capacity,new.unit,new.purchased_on,new.expiry,new.price,new.currency)
    is distinct from (prev.item_id,prev.lot_id,prev.capacity,prev.unit,prev.purchased_on,prev.expiry,prev.price,prev.currency)
    then raise exception 'Invalid stock sequence or immutable batch data'; end if;
  if new.action='undo' then
    select * into prior from public.life_stock_events where owner_id=new.owner_id and container_id=new.container_id and sequence=new.sequence-2;
    if found and prev.action<>'undo' and (new.remaining,new.state,new.opened_on,new.position_id)
      is not distinct from (prior.remaining,prior.state,prior.opened_on,prior.position_id) then return new; end if;
  elsif new.action='move' and prev.state in ('sealed','open') and new.position_id is distinct from prev.position_id
    and (new.remaining,new.state,new.opened_on) is not distinct from (prev.remaining,prev.state,prev.opened_on) then return new;
  elsif new.position_id is not distinct from prev.position_id then
    if new.action='open' and prev.state='sealed' and new.state='open' and new.remaining=prev.remaining then return new; end if;
    if new.opened_on is not distinct from prev.opened_on then
      if new.action='discard' and prev.state in ('sealed','open') and new.state='discarded' then return new; end if;
      if prev.state='open' and new.state in ('open','used') and
        ((new.action='use' and new.remaining<prev.remaining) or new.action in ('estimate','adjust')) then return new; end if;
    end if;
  end if;
  raise exception 'Invalid stock transition';
end $$;
create trigger life_stock_event_integrity before insert or update on public.life_stock_events
for each row execute function public.check_life_stock_event();

create function public.check_life_stock_position() returns trigger language plpgsql set search_path='' as $$
begin
  if new.deleted_at is not null then
    if exists(select 1 from public.life_stock_positions p where p.owner_id=new.owner_id and p.parent_id=new.id and p.deleted_at is null)
      or exists(select 1 from (select distinct on (container_id) position_id,state
        from public.life_stock_events where owner_id=new.owner_id order by container_id,sequence desc) e
        where e.position_id=new.id and e.state in ('sealed','open')) then
      raise exception 'Stock position still has contents';
    end if;
  elsif new.parent_id is not null and (
      not exists(select 1 from public.life_stock_positions where owner_id=new.owner_id and id=new.parent_id and deleted_at is null)
      or exists(with recursive parents(id,parent_id) as (
        select p.id,p.parent_id from public.life_stock_positions p where p.owner_id=new.owner_id and p.id=new.parent_id
        union select p.id,p.parent_id from public.life_stock_positions p join parents a on a.parent_id=p.id where p.owner_id=new.owner_id
      ) select from parents where id=new.id)) then
    raise exception 'Invalid position hierarchy';
  end if;
  return new;
end $$;
create trigger life_stock_position_integrity before insert or update on public.life_stock_positions
for each row execute function public.check_life_stock_position();

revoke all on function public.check_life_stock_event(),public.check_life_stock_position() from public,anon,authenticated;
do $migration$
declare definition text := pg_get_functiondef('public.apply_workspace_operations(jsonb)'::regprocedure);
begin
  definition:=replace(definition,$$'life_automation_runs','life_task_executions')$$,
    $$'life_automation_runs','life_task_executions','life_stock_events','life_stock_positions')$$);
  definition:=replace(definition,$$when entity='life_automation_runs' then array['run']$$,
    $$when entity='life_automation_runs' then array['run']
      when entity='life_stock_positions' then array['title','parent_id']
      when entity='life_stock_events' then array['item_id','container_id','lot_id','sequence','action','capacity','remaining','unit','position_id','purchased_on','expiry','opened_on','state','note','price','currency']$$);
  definition:=replace(definition,$$    if entity='life_task_executions' then$$,
    $$    if (entity='life_stock_events' and (action<>'save' or current_revision<>0))
       or (entity='life_stock_positions' and action not in ('save','soft_delete','restore')) then
       raise exception 'Invalid inventory operation';
    end if;
    if entity='life_task_executions' then$$);
  if strpos(definition,$$'life_task_executions','life_stock_events','life_stock_positions')$$)=0
    or strpos(definition,$$when entity='life_stock_events'$$)=0 or strpos(definition,'Invalid inventory operation')=0 then
    raise exception 'Unable to register inventory with workspace sync';
  end if;
  execute definition;
end $migration$;
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    alter publication supabase_realtime add table public.life_stock_events,public.life_stock_positions;
  end if;
end $$;
commit;
