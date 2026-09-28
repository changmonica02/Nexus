// Internal encyclopedia contract, not a claim about the missing batch-08 Markdown format.
export const VERIFICATIONS = ["unverified", "pending", "verified", "disputed"] as const;
export type Verification = typeof VERIFICATIONS[number];
export type Family = "prefix" | "root";
export type ClaimKind = "historical_etymology" | "learning_decomposition" | "mnemonic_story" | "historical_scene";
export interface Source { id: string; path: string; raw_markdown: string; sha256: string; metadata: Record<string, unknown> }
export interface Entry { id: string; label: string; family: Family; kind: "prefix" | "root" | "combining_form" | "variant"; variant_of: string | null; source_id: string }
export interface Sense { id: string; entry_id: string; gloss: string; source_id: string }
export interface Category { id: string; label: string; source_id: string }
export interface Word { id: string; lemma: string; definition: string; source_id: string }
export interface WordSense { word_id: string; entry_id: string; sense_id: string; relation_kind: "historical_etymology" | "learning_decomposition"; verification: Verification; verification_note: string; source_id: string }
export interface Claim { id: string; entry_id: string | null; sense_id: string | null; word_id: string | null; kind: ClaimKind; body: string; verification: Verification; verification_note: string; review_note: string; source_id: string }
export interface Catalog {
  sources: Source[]; entries: Entry[]; senses: Sense[]; categories: Category[];
  entry_categories: { entry_id: string; category_id: string }[];
  words: Word[]; word_senses: WordSense[]; claims: Claim[];
}

export const verificationLabel: Record<Verification, string> = {
  verified: "已查證", unverified: "未查證", pending: "待審核", disputed: "有爭議",
};
export const kindLabel: Record<Entry["kind"], string> = { prefix: "一般字首", root: "字根", combining_form: "構詞形式", variant: "變體" };
export function claimLabel(kind: ClaimKind, verification: Verification): string {
  if (kind === "historical_scene") return verification === "verified" ? "歷史場景（已查證）" : "記憶情境";
  if (kind === "historical_etymology") return verification === "verified" ? "已查證詞源" : "詞源說法（尚未確認）";
  return kind === "learning_decomposition" ? "學習用構詞拆解" : "記憶故事";
}
export const entryHref = (entry: Entry) => `/etymology/${entry.family === "prefix" ? "prefixes" : "roots"}/${encodeURIComponent(entry.id)}`;
export const wordHref = (word: Word) => `/etymology/words/${encodeURIComponent(word.id)}`;

/** Reject malformed/unknown states instead of upgrading them to verified or hiding broken links. */
export function parseCatalog(value: unknown): Catalog {
  const fail = (message: string): never => { throw new Error(`字源資料驗證失敗：${message}`); };
  const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return fail("預期物件");
    return value as Record<string, unknown>;
  };
  const root = object(value);
  const tables = ["sources", "entries", "senses", "categories", "entry_categories", "words", "word_senses", "claims"] as const;
  const rows = {} as Record<typeof tables[number], Record<string, unknown>[]>;
  const ids = new Map<string, Set<string>>();
  const string = (row: Record<string, unknown>, key: string, empty = false): string => {
    const value = row[key];
    return typeof value === "string" && (empty || value.trim()) ? value : fail(`${String(row.id ?? "關聯")} 缺少或無效欄位 ${key}`);
  };
  const oneOf = (row: Record<string, unknown>, key: string, options: readonly string[]) => {
    if (!options.includes(string(row, key))) fail(`${String(row.id ?? "關聯")} 未知 ${key}: ${String(row[key])}`);
  };
  for (const table of tables) {
    if (!Array.isArray(root[table])) fail(`缺少 ${table}`);
    rows[table] = (root[table] as unknown[]).map(object);
    const seen = new Set<string>(); ids.set(table, seen);
    for (const row of rows[table]) {
      const key = table === "entry_categories" ? JSON.stringify([string(row,"entry_id"),string(row,"category_id")])
        : table === "word_senses" ? JSON.stringify([string(row,"word_id"),string(row,"sense_id"),string(row,"relation_kind")]) : string(row,"id");
      if (seen.has(key)) fail(`${table} 重複 ID ${key}`);
      seen.add(key);
    }
  }
  const ref = (row: Record<string, unknown>, key: string, table: string) => {
    if (!ids.get(table)!.has(string(row, key))) fail(`${String(row.id ?? "關聯")} 無效關聯 ${key}=${String(row[key])}`);
  };
  for (const row of rows.sources) {
    string(row,"path"); string(row,"raw_markdown",true); object(row.metadata);
    if (!/^[0-9a-f]{64}$/.test(string(row,"sha256"))) fail(`無效 SHA256 ${String(row.id)}`);
  }
  if (new Set(rows.sources.map(row=>row.path)).size !== rows.sources.length) fail("重複來源路徑");
  for (const table of ["entries", "senses", "categories", "words", "word_senses", "claims"] as const) {
    for (const row of rows[table]) ref(row,"source_id","sources");
  }
  for (const row of rows.entries) {
    string(row,"label"); oneOf(row,"family",["prefix","root"]); oneOf(row,"kind",Object.keys(kindLabel));
    if ((row.kind === "prefix" || row.kind === "root") && row.family !== row.kind) fail("條目種類與分類不符");
    if (row.kind === "variant") {
      ref(row,"variant_of","entries");
      const visited = new Set([row.id]); let current = row;
      while (current.variant_of != null) {
        if (visited.has(current.variant_of)) fail(`循環變體關聯 ${String(row.id)}`);
        visited.add(current.variant_of);
        const target = rows.entries.find(entry=>entry.id===current.variant_of);
        if (!target) fail("無效變體關聯");
        current = target!;
      }
    } else if (row.variant_of !== null) fail("非變體不得指定 variant_of");
  }
  for (const row of rows.senses) { string(row,"gloss"); ref(row,"entry_id","entries"); }
  for (const row of rows.categories) string(row,"label");
  for (const row of rows.words) { string(row,"lemma"); string(row,"definition",true); }
  for (const row of rows.entry_categories) { ref(row,"entry_id","entries"); ref(row,"category_id","categories"); }
  for (const row of [...rows.claims,...rows.word_senses]) {
    oneOf(row,"verification",VERIFICATIONS);
    string(row,"verification_note",row.verification!=="verified");
  }
  for (const row of rows.word_senses) {
    ref(row,"word_id","words"); ref(row,"entry_id","entries"); ref(row,"sense_id","senses");
    if (!rows.senses.some(sense=>sense.id===row.sense_id && sense.entry_id===row.entry_id)) fail("義項不屬於指定條目");
    oneOf(row,"relation_kind",["historical_etymology","learning_decomposition"]);
  }
  for (const row of rows.claims) {
    string(row,"body"); string(row,"review_note",true);
    oneOf(row,"kind",["historical_etymology","learning_decomposition","mnemonic_story","historical_scene"]);
    const targets = [["entry_id","entries"],["sense_id","senses"],["word_id","words"]] as const;
    if (targets.filter(([key])=>row[key]!==null).length!==1) fail("說明必須且只能指向一個條目、義項或單字");
    for (const [key,table] of targets) if (row[key]!==null) ref(row,key,table);
  }
  return value as Catalog;
}

export function searchEntries(catalog: Catalog, family: Family, query = "", category = ""): Entry[] {
  const needle = query.trim().toLocaleLowerCase();
  return catalog.entries.filter(entry => entry.family===family
    && (!category || catalog.entry_categories.some(link=>link.entry_id===entry.id&&link.category_id===category))
    && [entry.label,...catalog.senses.filter(sense=>sense.entry_id===entry.id).map(sense=>sense.gloss)]
      .some(text=>text.toLocaleLowerCase().includes(needle)))
    .sort((a,b)=>a.label.localeCompare(b.label,"en")||a.id.localeCompare(b.id));
}

export async function loadCatalog(client: { rpc: (name: string) => PromiseLike<{data: unknown; error: {message: string} | null}> }): Promise<Catalog> {
  const {data,error} = await client.rpc("get_etymology_catalog");
  if (error) throw new Error(`百科尚未就緒或無法讀取，請確認 migration 與連線：${error.message}`);
  return parseCatalog(data);
}
