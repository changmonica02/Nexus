import type { SupabaseClient } from "@supabase/supabase-js";

export type DictionaryKind = "word" | "prefix" | "root";
export type DictionaryVerification = "unverified" | "pending" | "verified" | "disputed";
export interface DictionaryEntry {
  id: string;
  kind: DictionaryKind;
  headword: string;
  source_id: string;
  status: "draft" | "published";
  published_at: string | null;
  revision: number;
  updated_at: string;
}
interface ContentRow {
  id: string;
  entry_id: string;
  source_id: string;
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
export interface DictionarySource {
  id: string;
  citation: string;
  source_url: string | null;
  license: string;
  license_note: string;
  raw_text: string;
  sha256: string;
  verification: DictionaryVerification;
  verification_note: string;
}
export interface DictionaryDetail {
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
  dictionary_relations: DraftRow<DictionaryRelation>;
  dictionary_etymologies: DraftRow<DictionaryEtymology>;
  dictionary_learning_notes: DraftRow<DictionaryLearningNote>;
}
export async function saveDictionaryDraft<T extends keyof DictionaryDraftTables>(
  client: Pick<SupabaseClient, "from">, table: T, row: DictionaryDraftTables[T],
): Promise<void> {
  const { error } = await client.from(table).upsert(row, { onConflict: "id" });
  if (error) throw new Error(`無法儲存字典草稿：${error.message}`);
}

export async function addDictionarySource(
  client: Pick<SupabaseClient, "from">, source: Omit<DictionarySource, "sha256">,
): Promise<void> {
  const { error } = await client.from("dictionary_sources").insert(source);
  if (error) throw new Error(`無法儲存字典來源：${error.message}`);
}
