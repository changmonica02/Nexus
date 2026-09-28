-- M7-10. One transaction for preview/import/edit. No public content or roles seeded.
begin;
create function public.apply_dictionary_bundle(bundle jsonb, preview boolean default true, allow_edits boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
  t text; row_data jsonb; existing jsonb; incoming jsonb; cols text; vals text; key text;
  permitted text[]; inserted integer:=0; skipped integer:=0; updated integer:=0; result jsonb;
  warnings jsonb:='[]'::jsonb; matches jsonb; comparison text;
begin
  if not public.is_dictionary_admin() then raise exception 'Dictionary admin required'; end if;
  if jsonb_typeof(bundle) is distinct from 'object' then raise exception 'Expected bundle object'; end if;
  if exists(select 1 from jsonb_object_keys(bundle) k where k not in ('dictionary_sources','dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes')) then
    raise exception 'Unknown bundle table';
  end if;
  -- Serialize bundle operations; row locks/revisions also protect against direct API edits.
  perform pg_advisory_xact_lock(710,1);
  begin
    foreach t in array array['dictionary_sources','dictionary_entries','dictionary_senses','dictionary_relations','dictionary_etymologies','dictionary_learning_notes'] loop
      if jsonb_typeof(coalesce(bundle->t,'[]')) <> 'array' then raise exception 'Expected array: %',t; end if;
      if exists(select 1 from jsonb_array_elements(coalesce(bundle->t,'[]')) r group by r->>'id' having count(*)>1) then raise exception 'Duplicate ID in %',t; end if;
      permitted := case t
        when 'dictionary_sources' then array['id','citation','source_url','license','license_note','raw_text','verification','verification_note']
        when 'dictionary_entries' then array['id','kind','headword','source_id','revision']
        when 'dictionary_senses' then array['id','entry_id','part_of_speech','gloss_zh_tw','source_id','revision']
        when 'dictionary_relations' then array['id','entry_id','sense_id','target_entry_id','target_sense_id','relation_kind','source_id','verification','verification_note','revision']
        when 'dictionary_etymologies' then array['id','entry_id','sense_id','body','source_id','verification','verification_note','revision']
        else array['id','entry_id','sense_id','kind','body','source_id','revision'] end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        if jsonb_typeof(row_data) <> 'object' or row_data->>'id' is null then raise exception 'Missing row ID in %',t; end if;
        for key in select jsonb_object_keys(row_data) loop
          if not key=any(permitted) then raise exception 'Unexpected field %.%',t,key; end if;
        end loop;
        execute format('select to_jsonb(r) from public.%I r where id=$1::uuid for update',t) into existing using row_data->>'id';
        incoming := row_data - 'revision';
        if existing is not null then
          if existing @> incoming then skipped:=skipped+1; continue; end if;
          if not allow_edits or t='dictionary_sources' then raise exception 'ID conflict in %: %',t,row_data->>'id'; end if;
          if row_data->>'revision' is null or (row_data->>'revision')::bigint <> (existing->>'revision')::bigint then raise exception 'Revision conflict in %: %',t,row_data->>'id'; end if;
          select string_agg(format('%I = p.%I',k,k),',') into cols from jsonb_object_keys(incoming) k where k<>'id';
          execute format('update public.%I r set %s from jsonb_populate_record(null::public.%I,$1) p where r.id=p.id',t,cols,t) using incoming;
          updated:=updated+1;
        else
          select string_agg(format('%I',k),','),string_agg(format('p.%I',k),',') into cols,vals from jsonb_object_keys(incoming) k;
          execute format('insert into public.%I (%s) select %s from jsonb_populate_record(null::public.%I,$1) p',t,cols,vals,t) using incoming;
          inserted:=inserted+1;
        end if;
      end loop;
    end loop;
    -- Advisory only: homographs/different origins keep independent stable IDs.
    -- Run after staged inserts so both existing data and this batch are compared.
    foreach t in array array['dictionary_entries','dictionary_senses','dictionary_etymologies','dictionary_learning_notes'] loop
      comparison:=case t
        when 'dictionary_entries' then 'a.kind=b.kind and lower(btrim(a.headword))=lower(btrim(b.headword))'
        when 'dictionary_senses' then 'a.entry_id=b.entry_id and a.part_of_speech is not distinct from b.part_of_speech and btrim(a.gloss_zh_tw)=btrim(b.gloss_zh_tw)'
        when 'dictionary_etymologies' then 'a.entry_id=b.entry_id and a.sense_id is not distinct from b.sense_id and btrim(a.body)=btrim(b.body)'
        else 'a.entry_id=b.entry_id and a.sense_id is not distinct from b.sense_id and a.kind=b.kind and btrim(a.body)=btrim(b.body)' end;
      for row_data in select value from jsonb_array_elements(coalesce(bundle->t,'[]')) loop
        execute format('select coalesce(jsonb_agg(x.id),''[]''::jsonb) from (select b.id from public.%I a join public.%I b on a.id<>b.id and %s where a.id=$1::uuid order by b.id limit 5) x',t,t,comparison)
          into matches using row_data->>'id';
        if jsonb_array_length(matches)>0 then
          warnings:=warnings||jsonb_build_array(jsonb_build_object('table',t,'id',row_data->>'id','similar_ids',matches));
        end if;
      end loop;
    end loop;
    result:=jsonb_build_object('inserted',inserted,'updated',updated,'skipped',skipped,'preview',preview,'warnings',warnings);
    -- Roll back all preview writes AND audit entries, using a private subtransaction.
    if preview then raise exception using errcode='ZX710',detail=result::text; end if;
    return result;
  exception when sqlstate 'ZX710' then
    get stacked diagnostics vals=pg_exception_detail;
    return vals::jsonb;
  end;
end $$;
revoke all on function public.apply_dictionary_bundle(jsonb,boolean,boolean) from public,anon;
grant execute on function public.apply_dictionary_bundle(jsonb,boolean,boolean) to authenticated;
commit;
