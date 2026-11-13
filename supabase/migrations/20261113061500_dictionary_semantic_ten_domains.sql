-- Ten semantic domains (58 selectable subcategories). Retain previous category codes in the validator for existing/offline snapshots; do not rewrite published senses.
begin;
create or replace function public.dictionary_valid_morpheme_sense(domain text, subdomain text, forms jsonb)
returns boolean language plpgsql immutable set search_path='' as $body$
declare categories jsonb:='{"action":["posture","movement","force","separation","joining","holding","operation","cutting"],"space_time":["orientation","distance","position","time","sequence","scope"],"nature":["celestial","geography","elements","plants","animals","natural_phenomena","flora_fauna"],"life_body":["body","physiology","senses","life_activity","health_disease"],"language_mind":["speech","cognition","thinking","learning","memory","emotion","will"],"society_culture":["interpersonal","law","politics","power","culture","religion","conflict"],"life_work":["housing","food","clothing","manufacturing","agriculture","tools","trade"],"states_properties":["size","shape","quantity","degree","merit","quality","existence","change","part_whole"],"grammar_affixes":["negation","reversal","repetition","grammatical_relation","derivation"],"derivation":[]}'::jsonb; r jsonb; seen text[]:='{}';
begin
 if domain is null then if subdomain is not null then return false;end if;
 elsif not categories ? domain or (subdomain is not null and not(categories->domain ? subdomain)) then return false;end if;
 if forms is null or forms='null'::jsonb then return true;end if;
 if jsonb_typeof(forms)<>'array' then return false;end if;
 for r in select value from jsonb_array_elements(forms) loop
  if jsonb_typeof(r)<>'object' or exists(select 1 from jsonb_object_keys(r) k where k not in ('id','form','condition'))
   or jsonb_typeof(r->'id') is distinct from 'string' or (r->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
   or lower(r->>'id')=any(seen) or jsonb_typeof(r->'form') is distinct from 'string' or btrim(r->>'form')=''
   or jsonb_typeof(r->'condition') is distinct from 'string' then return false;end if;
  seen:=array_append(seen,lower(r->>'id'));
 end loop;return true;
end $body$;
-- Existing published classification data must remain valid; no automatic remapping.
do $verify$ begin
 if exists(select 1 from public.dictionary_senses s join public.dictionary_entries e on e.id=s.entry_id
  where e.kind in ('prefix','root','suffix') and not public.dictionary_valid_morpheme_sense(s.semantic_domain,s.semantic_subdomain,s.variants))
 then raise exception 'Existing morpheme category or variant would become invalid';end if;
end $verify$;
commit;
