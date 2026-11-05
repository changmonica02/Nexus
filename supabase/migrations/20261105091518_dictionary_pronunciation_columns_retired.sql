-- Physical retirement only. No IPA/ID/sense/order deletion; no unrelated cleanup.
begin;
create function public.dictionary_clean_ipa_rows(rows jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when jsonb_typeof(rows)='array' then coalesce((select jsonb_agg(value-array['locale','note'] order by ordinality) from jsonb_array_elements(rows) with ordinality),'[]'::jsonb) else rows end;
$$;
create function public.dictionary_clean_ipa_snapshot(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when s#>'{detail,pronunciations}' is null then s else jsonb_set(s,'{detail,pronunciations}',public.dictionary_clean_ipa_rows(s#>'{detail,pronunciations}')) end;
$$;
create function public.dictionary_clean_ipa_candidate(c jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when c ? 'pronunciations' then jsonb_set(c,'{pronunciations}',public.dictionary_clean_ipa_rows(c->'pronunciations')) else c end;
$$;
-- Retired metadata is excluded from comparison only, preserving all other content/CAS.
create or replace function public.dictionary_normalize_snapshot(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 with cleaned as (select public.dictionary_clean_ipa_snapshot(s) as v), segments as (select case when v#>'{detail,entry,word_segments}'='null'::jsonb then v#-'{detail,entry,word_segments}' else v end as v from cleaned)
 select case when v is null then null else jsonb_set(jsonb_set(v,'{detail,inflections}',coalesce(v#>'{detail,inflections}','[]'::jsonb)),'{detail,relations}',coalesce((select jsonb_agg(value-'relation_kind'-'verification'-'verification_note' order by value->>'id') from jsonb_array_elements(coalesce(v#>'{detail,relations}','[]'::jsonb))),'[]'::jsonb)) end from segments;
$$;
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('public.apply_dictionary_drafts(jsonb,boolean,boolean)'::regprocedure);
 anchor:=$a$elsif tbl='dictionary_pronunciations' then$a$;
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>3 then raise exception 'Unexpected pronunciation branches';end if;
 definition:=replace(definition,anchor,anchor||$a$ r:=r-array['locale','note'];$a$);
 definition:=replace(definition,$a$,locale=r->>'locale',note=r->>'note'$a$,'');
 definition:=replace(definition,'(id,entry_id,sense_id,locale,ipa,note,sort_order)','(id,entry_id,sense_id,ipa,sort_order)');
 definition:=replace(definition,$a$(r->>'sense_id')::uuid,r->>'locale',r->>'ipa',r->>'note',$a$,$a$(r->>'sense_id')::uuid,r->>'ipa',$a$);
 -- Known retired keys are stripped above; the original unknown-key validation remains.
 execute definition;
 definition:=pg_get_functiondef('public.get_published_dictionary_entry(uuid)'::regprocedure);
 if strpos(definition,'id,entry_id,sense_id,locale,ipa,note,sort_order')=0 then raise exception 'Unexpected published pronunciation projection';end if;
 definition:=replace(definition,'id,entry_id,sense_id,locale,ipa,note,sort_order','id,entry_id,sense_id,ipa,sort_order');
 execute definition;
 definition:=pg_get_functiondef('public.dictionary_exchange_record(uuid)'::regprocedure);
 anchor:=$a$return jsonb_build_object('snapshot',s,'reviews',reviews,'version'$a$;
 if strpos(definition,anchor)=0 then raise exception 'Unexpected exchange record';end if;
 definition:=replace(definition,anchor,$a$s:=public.dictionary_clean_ipa_snapshot(s);
 select coalesce(jsonb_agg(jsonb_set(jsonb_set(value,'{base_snapshot}',public.dictionary_clean_ipa_snapshot(value->'base_snapshot')),'{candidate}',public.dictionary_clean_ipa_candidate(value->'candidate')) order by value->>'id'),'[]'::jsonb) into reviews from jsonb_array_elements(reviews);
 return jsonb_build_object('snapshot',s,'reviews',reviews,'version'$a$);execute definition;
end $$;
drop trigger if exists dictionary_pronunciation_ipa_only on public.dictionary_pronunciations;
drop function if exists public.dictionary_pronunciation_ipa_only();
alter table public.dictionary_pronunciations drop column locale,drop column note;
revoke all on function public.dictionary_clean_ipa_rows(jsonb),public.dictionary_clean_ipa_snapshot(jsonb),public.dictionary_clean_ipa_candidate(jsonb),public.dictionary_normalize_snapshot(jsonb) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
