-- Independent, account-scoped encyclopedia. No changes to Study/Quiz tables.
-- No seed data: batch-08 originals must be reviewed before import.
begin;

create table public.etymology_sources (
  owner_id uuid not null, id text not null check (length(id)>0),
  path text not null, raw_markdown text not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata)='object'),
  updated_at timestamptz not null default now(),
  primary key(owner_id,id), unique(owner_id,path)
);
create table public.etymology_entries (
  owner_id uuid not null, id text not null check (length(id)>0),
  label text not null check (length(trim(label))>0),
  family text not null check (family in ('prefix','root')),
  kind text not null check (kind in ('prefix','root','combining_form','variant')),
  variant_of text, source_id text not null,
  primary key(owner_id,id),
  foreign key(owner_id,source_id) references public.etymology_sources(owner_id,id),
  foreign key(owner_id,variant_of) references public.etymology_entries(owner_id,id) deferrable initially deferred,
  check ((kind='variant' and variant_of is not null and variant_of<>id) or (kind<>'variant' and variant_of is null)),
  check ((kind<>'prefix' or family='prefix') and (kind<>'root' or family='root'))
);
create table public.etymology_senses (
  owner_id uuid not null, id text not null check(length(id)>0),
  entry_id text not null, gloss text not null check(length(trim(gloss))>0), source_id text not null,
  primary key(owner_id,id), unique(owner_id,entry_id,id),
  foreign key(owner_id,entry_id) references public.etymology_entries(owner_id,id),
  foreign key(owner_id,source_id) references public.etymology_sources(owner_id,id)
);
create table public.etymology_categories (
  owner_id uuid not null, id text not null check(length(id)>0),
  label text not null check(length(trim(label))>0), source_id text not null,
  primary key(owner_id,id),
  foreign key(owner_id,source_id) references public.etymology_sources(owner_id,id)
);
create table public.etymology_entry_categories (
  owner_id uuid not null, entry_id text not null, category_id text not null,
  primary key(owner_id,entry_id,category_id),
  foreign key(owner_id,entry_id) references public.etymology_entries(owner_id,id),
  foreign key(owner_id,category_id) references public.etymology_categories(owner_id,id)
);
-- Encyclopedia lexemes are not learner-owned Study cards; homographs may have distinct IDs.
create table public.etymology_words (
  owner_id uuid not null, id text not null check(length(id)>0),
  lemma text not null check(length(trim(lemma))>0), definition text not null, source_id text not null,
  primary key(owner_id,id),
  foreign key(owner_id,source_id) references public.etymology_sources(owner_id,id)
);
create table public.etymology_word_senses (
  owner_id uuid not null, word_id text not null, entry_id text not null, sense_id text not null,
  relation_kind text not null check(relation_kind in ('historical_etymology','learning_decomposition')),
  verification text not null check(verification in ('unverified','pending','verified','disputed')),
  verification_note text not null default '', source_id text not null,
  primary key(owner_id,word_id,sense_id,relation_kind),
  foreign key(owner_id,word_id) references public.etymology_words(owner_id,id),
  foreign key(owner_id,entry_id,sense_id) references public.etymology_senses(owner_id,entry_id,id),
  foreign key(owner_id,source_id) references public.etymology_sources(owner_id,id),
  check(verification<>'verified' or length(trim(verification_note))>0)
);
create table public.etymology_claims (
  owner_id uuid not null, id text not null check(length(id)>0),
  entry_id text, sense_id text, word_id text,
  kind text not null check(kind in ('historical_etymology','learning_decomposition','mnemonic_story','historical_scene')),
  body text not null check(length(trim(body))>0),
  verification text not null check(verification in ('unverified','pending','verified','disputed')),
  verification_note text not null default '', review_note text not null default '', source_id text not null,
  primary key(owner_id,id),
  check(num_nonnulls(entry_id,sense_id,word_id)=1),
  check(verification<>'verified' or length(trim(verification_note))>0),
  foreign key(owner_id,entry_id) references public.etymology_entries(owner_id,id),
  foreign key(owner_id,sense_id) references public.etymology_senses(owner_id,id),
  foreign key(owner_id,word_id) references public.etymology_words(owner_id,id),
  foreign key(owner_id,source_id) references public.etymology_sources(owner_id,id)
);
create index etymology_entries_family on public.etymology_entries(owner_id,family,label);
create index etymology_senses_entry on public.etymology_senses(owner_id,entry_id);
create index etymology_categories_reverse on public.etymology_entry_categories(owner_id,category_id);
create index etymology_words_lemma on public.etymology_words(owner_id,lemma);
create index etymology_senses_reverse on public.etymology_word_senses(owner_id,entry_id,sense_id);
create index etymology_claims_entry on public.etymology_claims(owner_id,entry_id);
create index etymology_claims_sense on public.etymology_claims(owner_id,sense_id);
create index etymology_claims_word on public.etymology_claims(owner_id,word_id);

-- Read-only client surface. Import writes are intentionally not exposed yet.
do $$ declare t text; begin
  foreach t in array array['etymology_sources','etymology_entries','etymology_senses','etymology_categories',
    'etymology_entry_categories','etymology_words','etymology_word_senses','etymology_claims'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy etymology_owner_read on public.%I for select to authenticated using (owner_id=auth.uid())',t);
    execute format('revoke all on public.%I from public,anon,authenticated',t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;

-- One statement gives a consistent relational snapshot. RLS remains in force.
create function public.get_etymology_catalog() returns jsonb
language sql stable security invoker set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'sources',coalesce((select jsonb_agg(s order by id) from etymology_sources s where owner_id=auth.uid()),'[]'::jsonb),
    'entries',coalesce((select jsonb_agg(e order by id) from etymology_entries e where owner_id=auth.uid()),'[]'::jsonb),
    'senses',coalesce((select jsonb_agg(s order by id) from etymology_senses s where owner_id=auth.uid()),'[]'::jsonb),
    'categories',coalesce((select jsonb_agg(c order by id) from etymology_categories c where owner_id=auth.uid()),'[]'::jsonb),
    'entry_categories',coalesce((select jsonb_agg(c order by entry_id,category_id) from etymology_entry_categories c where owner_id=auth.uid()),'[]'::jsonb),
    'words',coalesce((select jsonb_agg(w order by id) from etymology_words w where owner_id=auth.uid()),'[]'::jsonb),
    'word_senses',coalesce((select jsonb_agg(w order by word_id,sense_id,relation_kind) from etymology_word_senses w where owner_id=auth.uid()),'[]'::jsonb),
    'claims',coalesce((select jsonb_agg(c order by id) from etymology_claims c where owner_id=auth.uid()),'[]'::jsonb)
  );
$$;
revoke all on function public.get_etymology_catalog() from public,anon;
grant execute on function public.get_etymology_catalog() to authenticated;
commit;
