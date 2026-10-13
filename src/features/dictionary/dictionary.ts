import {applyBundle} from './adminImport';
import type { SupabaseClient } from "@supabase/supabase-js";

export type DictionaryKind = "word" | "prefix" | "root";
export type DictionaryVerification = "unverified" | "pending" | "verified" | "disputed";
export interface DictionaryEntry {
  id: string;
  kind: DictionaryKind;
  headword: string;
  status: "draft" | "published";
  published_at: string | null;
  revision: number;
  updated_at: string;
}
interface ContentRow {
  id: string;
  entry_id: string;
  revision: number;
  updated_at: string;
}
export interface DictionarySense extends ContentRow {
  part_of_speech: string | null;
  gloss_zh_tw: string;
}
export interface DictionaryRelation extends ContentRow {
  sense_id: string;
  target_entry_id: string;
  target_sense_id: string;
  relation_kind: "historical_etymology" | "learning_decomposition";
  verification: DictionaryVerification;
  verification_note: string;
}
export interface DictionaryEtymology extends ContentRow {
  sense_id: string | null;
  body: string;
  verification: DictionaryVerification;
  verification_note: string;
}
export interface DictionaryLearningNote extends ContentRow {
  sense_id: string | null;
  kind: "learning_decomposition" | "mnemonic_scenario";
  body: string;
}
export interface DictionaryExtra extends ContentRow {sense_id:string|null;body:string;sort_order:number;kind?:"source_forms"|"relation_hint"}
export interface DictionaryPronunciation extends ContentRow {sense_id:string|null;locale:string|null;ipa:string;note:string|null;sort_order:number}
export interface DictionaryInflection extends ContentRow {sense_id:string|null;form_kind:import('./inflections').InflectionKind;form:string;sort_order:number}
export interface DictionaryDetail {
  inflections?:DictionaryInflection[];
  pronunciations?:DictionaryPronunciation[];
  examples?:DictionaryExtra[];
  lexical_annotations?:DictionaryExtra[];
  entry: DictionaryEntry;
  senses: DictionarySense[];
  relations: DictionaryRelation[];
  etymologies: DictionaryEtymology[];
  learning_notes: DictionaryLearningNote[];
}
/** Optional separate relationship; never replaces learner-authored card content. */
export interface StudyCardDictionaryLink {
  owner_id: string;
  card_id: string;
  dictionary_entry_id: string;
}

type RpcClient = Pick<SupabaseClient, "rpc">;
export async function getDictionaryEntry(client: RpcClient, id: string): Promise<DictionaryDetail | null> {
  const { data, error } = await client.rpc("get_dictionary_entry", { entry_uuid: id });
  if (error) throw new Error(`無法讀取公共字典：${error.message}`);
  // RLS intentionally gives the same null result for hidden drafts and missing IDs.
  return data as DictionaryDetail | null;
}

/** Uses the existing Supabase client; all authority is checked by database RLS. */
export async function publishDictionaryEntry(client: RpcClient, id: string): Promise<DictionaryEntry> {
  const { data, error } = await client.rpc("publish_dictionary_entry", { entry_uuid: id });
  if (error) throw new Error(`無法發布公共字典：${error.message}`);
  return data as DictionaryEntry;
}

type DraftRow<T> = Omit<T, "revision" | "updated_at">;
export interface DictionaryDraftTables {
  dictionary_entries: Omit<DictionaryEntry, "status" | "published_at" | "revision" | "updated_at">;
  dictionary_senses: DraftRow<DictionarySense>;
  dictionary_pronunciations: DraftRow<DictionaryPronunciation>;
  dictionary_relations: DraftRow<DictionaryRelation>;
  dictionary_etymologies: DraftRow<DictionaryEtymology>;
  dictionary_learning_notes: DraftRow<DictionaryLearningNote>;
}
export async function saveDictionaryDraft<T extends keyof DictionaryDraftTables>(
  client: Pick<SupabaseClient, "rpc">, table: T, row: DictionaryDraftTables[T],
): Promise<void> {
  await applyBundle(client,{[table]:[row as unknown as Record<string,unknown>]},false,true);
}
