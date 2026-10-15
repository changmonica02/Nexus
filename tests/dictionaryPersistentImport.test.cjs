require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict");
const {
  database,
  client,
  id,
  owner,
  sql,
  draft,
  migration,
} = require("./fixtures/persistentImportDatabase.cjs");
const {
  buildImportSession,
  chooseIssue,
} = require("../src/features/dictionary/importReview.ts");
const {
  mapDictionaryDraft,
} = require("../src/features/dictionary/draftPipeline.ts");
const {
  classifyPersistent,
  partialImportPlan,
  stagePersistentSession,
  applyPersistentRecords,
  recheckPersistent,
  reviewRPC,
  persistentImportAvailable,
} = require("../src/features/dictionary/persistentImport.ts");
const save = (pg, d) =>
  sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
    JSON.stringify([mapDictionaryDraft(d)]),
  ]);
const stage = async (c, d) => {
  const s = await buildImportSession(
    c,
    owner,
    "json",
    [d],
    [],
    crypto.randomUUID(),
    { exchange: true },
  );
  return { s, rows: await stagePersistentSession(c, s, "regression.json") };
};
const list = (c, work = "", query = "") =>
  reviewRPC(c, "list_dictionary_admin_work", {
    kind_filters: [],
    status_filters: [],
    query_text: query,
    work_filter: work,
    page_number: 0,
  });
const queue = (c) =>
  reviewRPC(c, "get_dictionary_import_reviews", {
    entry_key: null,
    page_number: 0,
  });
const decide = (c, r, i, a) =>
  reviewRPC(c, "decide_dictionary_import_review", {
    review_item_id: r.id,
    expected_revision: r.revision,
    issue_id: i.id,
    decision: a,
  });
test("actual SQL: throw safe Sense + suspicious past form are independent; Published protected, stable IDs, active Review update, saved versus applied, repeat dedupe and colors", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    assert.equal(await persistentImportAvailable(c), true);
    const d = draft(100);
    d.headword = "throw";
    d.inflections = [
      {
        id: id(102),
        sense_id: id(101),
        form_kind: "past",
        form: "threw",
        sort_order: 0,
      },
    ];
    await save(pg, d);
    await sql(pg, "select publish_dictionary_entry($1,true) v", [d.entry_id]);
    const incoming = structuredClone(d);
    incoming.senses.push({
      id: id(103),
      part_of_speech: "noun",
      gloss_zh_tw: "投擲動作",
    });
    incoming.inflections.push({
      id: id(104),
      sense_id: id(101),
      form_kind: "past",
      form: "throwed",
      sort_order: 1,
    });
    const { s, rows } = await stage(c, incoming);
    const plan = partialImportPlan(rows[0].item);
    assert.equal(plan.draft.senses.length, 2);
    assert.equal(plan.draft.inflections.length, 1);
    let [r] = await applyPersistentRecords(c, rows);
    assert.equal(r.pending_count, 1, JSON.stringify(r));
    assert.equal((await list(c)).stats.red, 1);
    assert.equal((await list(c)).total, 1);
    let review = (
      await pg.query(
        "select * from dictionary_review_drafts where state='active'",
      )
    ).rows[0];
    assert.equal(review.candidate.bundle.dictionary_senses.length, 2);
    assert.equal(review.candidate.inflections.length, 1);
    assert.equal(
      (await pg.query("select * from dictionary_senses")).rows.length,
      1,
    );
    const reviewID = review.id;
    let second = (await queue(client(pg))).items[0];
    assert.equal(second.id, r.id);
    const issue = second.item.issues.find((i) => !i.applied);
    assert.equal(issue.type, "ambiguous_content");
    second = await decide(c, second, issue, "keep");
    assert.equal(
      second.item.issues.find((i) => i.id === issue.id).applied,
      undefined,
    );
    assert.equal(second.pending_count, 1);
    [r] = await applyPersistentRecords(client(pg), [second], true);
    assert.equal(r.pending_count, 0);
    assert.equal((await list(c)).stats.yellow, 1);
    assert.equal((await queue(c)).total, 0);
    assert.equal(
      (
        await pg.query(
          "select * from dictionary_review_drafts where state='active'",
        )
      ).rows[0].id,
      reviewID,
    );
    const dup = await stagePersistentSession(c, s, "regression.json");
    assert.equal(dup[0].id, r.id);
    assert.equal((await applyPersistentRecords(c, dup)).length, 0);
    assert.equal(
      (await pg.query("select * from dictionary_import_review_items")).rows
        .length,
      1,
    );
    review = (
      await pg.query("select * from dictionary_review_drafts where id=$1", [
        reviewID,
      ])
    ).rows[0];
    await sql(pg, "select approve_dictionary_review($1,$2,true) v", [
      review.id,
      review.revision,
    ]);
    assert.equal((await list(c)).stats.green, 1);
    assert.equal(
      (await pg.query("select * from dictionary_inflections")).rows.length,
      1,
    );
  } finally {
    await pg.close();
  }
});
test("shoot/do: invalid POS form held with dependencies, new nonduplicate content automatic, identity conflicts never force, undecided fields do not block independent decisions", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(200);
    d.headword = "shoot";
    await save(pg, d);
    const changed = structuredClone(d);
    changed.senses[0].gloss_zh_tw = "射擊（需決策）";
    changed.examples = [
      { id: id(202), sense_id: null, body: "shoot the ball", sort_order: 0 },
    ];
    changed.inflections = [
      {
        id: id(203),
        sense_id: id(201),
        form_kind: "plural",
        form: "shoots",
        sort_order: 0,
      },
    ];
    const { rows } = await stage(c, changed); // Existing builder can hold invalid content; recheck obtains a safe observed-ID context.
    let r = await recheckPersistent(c, rows[0]);
    let plan = partialImportPlan(r.item);
    assert.equal(plan.draft.examples.length, 1);
    assert.equal(plan.draft.inflections.length, 0);
    [r] = await applyPersistentRecords(c, [r]);
    assert.equal(
      (await pg.query("select * from dictionary_examples")).rows.length,
      1,
      JSON.stringify(r.result),
    );
    assert.ok(r.pending_count >= 2);
    const gloss = r.item.issues.find((i) => i.field === "gloss_zh_tw");
    r = await decide(c, r, gloss, "incoming");
    [r] = await applyPersistentRecords(c, [r], true);
    assert.equal(
      (
        await pg.query(
          "select gloss_zh_tw from dictionary_senses where id=$1",
          [id(201)],
        )
      ).rows[0].gloss_zh_tw,
      "射擊（需決策）",
    );
    assert.ok(r.pending_count > 0);
    const other = draft(300);
    other.headword = "do";
    await save(pg, other);
    const collision = structuredClone(d);
    collision.senses[0].id = id(301);
    let st = await stage(c, collision);
    assert.ok(st.rows[0].item.issues.some((i) => i.type === "identity_owner"));
    assert.equal(partialImportPlan(st.rows[0].item).draft, null);
    await applyPersistentRecords(c, st.rows);
    assert.equal(
      (await pg.query("select count(*)::int n from dictionary_senses")).rows[0]
        .n,
      2,
    );
    const kind = structuredClone(d);
    kind.kind = "root";
    kind.senses[0].part_of_speech = null;
    st = await stage(c, kind);
    assert.equal(partialImportPlan(st.rows[0].item).draft, null);
    const homograph = draft(400);
    homograph.headword = "do";
    st = await stage(c, homograph);
    assert.ok(st.rows[0].item.issues.some((i) => i.type === "homograph"));
    assert.equal(partialImportPlan(st.rows[0].item).draft, null);
  } finally {
    await pg.close();
  }
});
test("durable receipts: lost reply, exact replay, version/CAS conflict, malicious child owner and RLS/anon protection", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(500);
    const { rows } = await stage(c, d);
    const p = partialImportPlan(rows[0].item),
      operation = {
        id: rows[0].id,
        revision: rows[0].revision,
        handled: p.handled,
        candidate: mapDictionaryDraft(p.draft),
        effect: p.effect,
      };
    const first = await reviewRPC(c, "apply_dictionary_import_reviews", {
      operations: [operation],
    });
    const again = await reviewRPC(
      client(pg),
      "apply_dictionary_import_reviews",
      { operations: [operation] },
    );
    assert.deepEqual(again, first);
    assert.equal(
      (await pg.query("select * from dictionary_entries")).rows.length,
      1,
    );
    const collision = await reviewRPC(c, "apply_dictionary_import_reviews", {
      operations: [{ ...operation, effect: "unchanged" }],
    });
    assert.match(collision[0].request_conflict, /identity collision/);
    assert.equal(
      (await pg.query("select * from dictionary_entries")).rows.length,
      1,
    );
    const changed = structuredClone(d);
    changed.examples = [
      { id: id(502), sense_id: id(501), body: "do it", sort_order: 0 },
    ];
    const staged = await stage(c, changed);
    await pg.query(
      "update dictionary_entries set headword='newer' where id=$1",
      [d.entry_id],
    );
    const [stale] = await applyPersistentRecords(c, staged.rows);
    assert.equal(stale.item.status, "stale");
    assert.equal(
      (await pg.query("select * from dictionary_examples")).rows.length,
      0,
    );
    await assert.rejects(
      () =>
        reviewRPC(c, "decide_dictionary_import_review", {
          review_item_id: staged.rows[0].id,
          expected_revision: 1,
          issue_id: "none",
          decision: "incoming",
        }),
      /revision conflict/,
    );
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      id(900001),
    ]);
    assert.equal(
      (await pg.query("select * from dictionary_import_review_items")).rows
        .length,
      0,
    );
    for (const name of [
      "get_dictionary_import_reviews",
      "list_dictionary_admin_work",
      "dictionary_import_review_capabilities",
    ])
      await assert.rejects(
        () =>
          reviewRPC(
            c,
            name,
            name === "get_dictionary_import_reviews"
              ? { entry_key: null, page_number: 0 }
              : name === "list_dictionary_admin_work"
                ? {
                    kind_filters: [],
                    status_filters: [],
                    query_text: "",
                    work_filter: "",
                    page_number: 0,
                  }
                : {},
          ),
        /admin required/,
      );
    await pg.exec("reset role;set role anon");
    await assert.rejects(
      () => pg.query("select dictionary_import_review_capabilities()"),
      /permission/,
    );
  } finally {
    await pg.close();
  }
});
test("dependency group and independent Sense decision allocate stable cloned IDs once; cross-device decision CAS protects newer edits", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(600);
    d.examples = [
      {
        id: id(603),
        sense_id: id(601),
        body: "unchanged old Sense example",
        sort_order: 0,
      },
    ];
    await save(pg, d);
    const incoming = structuredClone(d);
    incoming.senses[0].gloss_zh_tw = "different meaning";
    incoming.examples = [
      ...d.examples,
      {
        id: id(602),
        sense_id: id(601),
        body: "dependent example",
        sort_order: 0,
      },
    ];
    let { rows } = await stage(c, incoming);
    let r = rows[0];
    const issue = r.item.issues.find((i) => i.field === "gloss_zh_tw");
    assert.ok(issue.allowedActions.includes("new_sense"));
    r = await decide(c, r, issue, "new_sense");
    r = await decide(
      c,
      r,
      r.item.issues.find((i) => i.field === "examples"),
      "incoming",
    );
    await assert.rejects(
      () => decide(client(pg), rows[0], issue, "keep"),
      /revision conflict/,
    );
    const one = partialImportPlan(r.item, true),
      two = partialImportPlan(r.item, true);
    assert.deepEqual(
      one,
      two,
      "retry must never regenerate child or Sense IDs",
    );
    assert.equal(
      one.draft.examples.find((e) => e.body === "dependent example").sense_id,
      r.item.issues.find((i) => i.id === issue.id).proposedSenseID,
    );
    const request = {
      id: r.id,
      revision: r.revision,
      handled: one.handled,
      candidate: mapDictionaryDraft(one.draft),
      effect: one.effect,
    };
    const first = await reviewRPC(c, "apply_dictionary_import_reviews", {
      operations: [request],
    });
    assert.equal(
      first[0].result.status,
      "applied",
      JSON.stringify(first[0].result),
    );
    await reviewRPC(client(pg), "apply_dictionary_import_reviews", {
      operations: [request],
    });
    assert.equal(
      (await pg.query("select * from dictionary_senses")).rows.length,
      2,
    );
    assert.equal(
      (await pg.query("select * from dictionary_examples")).rows.length,
      2,
    );
    const doubtful = draft(700);
    doubtful.senses.push({ ...doubtful.senses[0], id: id(702) });
    doubtful.examples = [
      {
        id: id(703),
        sense_id: id(702),
        body: "must wait with ambiguous parent",
        sort_order: 0,
      },
    ];
    const staged = await stage(c, doubtful);
    const plan = partialImportPlan(staged.rows[0].item);
    assert.ok(!plan.draft || plan.draft.examples.length === 0);
    if (plan.draft) assert.ok(plan.draft.senses.every((s) => s.id !== id(702)));
  } finally {
    await pg.close();
  }
});
test("legacy transfer retains previous selections, receipt/Review IDs and archives original IndexedDB items before checkpoint replacement", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(800);
    await save(pg, d);
    const incoming = structuredClone(d);
    incoming.senses[0].gloss_zh_tw = "legacy proposed gloss";
    const session = await buildImportSession(c, owner, "json", [incoming]);
    const issue = session.items[0].issues.find(
      (i) => i.field === "gloss_zh_tw",
    );
    session.items[0] = chooseIssue(session.items[0], issue.id, "incoming");
    const original = structuredClone(session);
    const rows = await stagePersistentSession(c, session, "legacy.json");
    assert.equal(
      rows[0].item.issues.find((i) => i.field === "gloss_zh_tw").selectedAction,
      "incoming",
    );
    assert.deepEqual(session, original);
    const store = require("../src/features/dictionary/importSessionStore.ts");
    await store.archiveImportSession(original);
    await store.persistImportSession({
      ...original,
      id: crypto.randomUUID(),
      items: [],
      durable_review: true,
    });
    assert.deepEqual(await store.loadArchivedImportSession(owner), original);
    // A real lost legacy reply is reconciled by the same old operation, not a newly generated proposal.
    const fresh = draft(900),
      legacy = await buildImportSession(c, owner, "json", [fresh]);
    let saved;
    await require("../src/features/dictionary/importReview.ts").applyImportItems(
      c,
      legacy,
      false,
      async (s) => {
        saved = structuredClone(s);
      },
      { batched: true },
    );
    const oldOperation = saved.items[0].operation;
    saved.items[0].status = "failed";
    const migrated = await stagePersistentSession(c, saved, "previous.json");
    assert.equal(migrated.length, 0);
    assert.equal(
      saved.items[0].operation.operation_id,
      oldOperation.operation_id,
    );
    assert.equal(
      (
        await pg.query(
          "select count(*)::int n from dictionary_entries where id=$1",
          [fresh.entry_id],
        )
      ).rows[0].n,
      1,
    );
  } finally {
    await pg.close();
  }
});
test("work counts are distinct Entry counts, pending counts are differences, escaped literal search and 100-row pagination agree", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const drafts = Array.from({ length: 103 }, (_, n) => {
      const d = draft(1000 + n * 10);
      d.headword = "do_%" + String(n).padStart(3, "0");
      return d;
    });
    for (let n = 0; n < drafts.length; n += 25)
      await sql(pg, "select apply_dictionary_drafts($1,false,true) v", [
        JSON.stringify(drafts.slice(n, n + 25).map(mapDictionaryDraft)),
      ]);
    for (const d of drafts.slice(0, 2)) {
      const incoming = structuredClone(d);
      incoming.senses[0].gloss_zh_tw = "pending";
      await stage(c, incoming);
      incoming.headword += "x";
      await stage(c, incoming);
    }
    const first = await list(c, "", "do_%");
    assert.equal(first.total, 103);
    assert.equal(first.items.length, 100);
    assert.equal(first.stats.red, 2);
    assert.equal(first.items.filter((r) => r.work_status === "red").length, 2);
    assert.ok(
      first.items
        .filter((r) => r.work_status === "red")
        .every((r) => r.pending_count >= 2),
    );
    const last = await reviewRPC(c, "list_dictionary_admin_work", {
      kind_filters: ["word"],
      status_filters: [],
      query_text: "do_%",
      work_filter: "",
      page_number: 1,
    });
    assert.equal(last.total, 103);
    assert.equal(last.items.length, 3);
    assert.equal((await list(c, "red", "do_%")).total, 2);
  } finally {
    await pg.close();
  }
});
test("saved keep/later is never overridden by automatic resume; forged applied flags fail; local archive replacement preserves multiple original jobs", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(3000);
    await save(pg, d);
    const incoming = structuredClone(d);
    incoming.examples = [
      {
        id: id(3002),
        sense_id: id(3001),
        body: "new safe example",
        sort_order: 0,
      },
    ];
    let { rows } = await stage(c, incoming),
      r = rows[0];
    const issue = r.item.issues.find((i) => i.field === "examples");
    r = await decide(c, r, issue, "keep");
    const [resumed] = await applyPersistentRecords(c, [r]);
    assert.equal(
      (await pg.query("select * from dictionary_examples")).rows.length,
      0,
    );
    assert.equal(resumed.pending_count, 1);
    const forged = structuredClone(resumed.item);
    forged.issues[0].applied = true;
    await assert.rejects(
      () =>
        reviewRPC(c, "save_dictionary_import_review", {
          review_item_id: resumed.id,
          expected_revision: resumed.revision,
          review_item: forged,
        }),
      /cannot invent/,
    );
    const store = require("../src/features/dictionary/importSessionStore.ts");
    const a = await buildImportSession(c, owner, "json", [draft(4000)]),
      b = await buildImportSession(c, owner, "json", [draft(5000)]);
    await store.archiveImportSession(a);
    await store.archiveImportSession(b);
    assert.deepEqual(await store.loadArchivedImportSession(owner, a.id), a);
    assert.deepEqual(await store.loadArchivedImportSession(owner, b.id), b);
  } finally {
    await pg.close();
  }
});
test("all new RPCs retain admin guards/empty search_path/anon revokes and unknown raw candidates are retained instead of silently normalized", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const names = [
      "dictionary_import_review_capabilities",
      "stage_dictionary_import_reviews",
      "save_dictionary_import_review",
      "decide_dictionary_import_review",
      "apply_dictionary_import_reviews",
      "get_dictionary_import_reviews",
      "list_dictionary_admin_work",
    ];
    for (const name of names) {
      const row = (
        await pg.query(
          "select proconfig,pg_get_functiondef(oid) body,has_function_privilege('anon',oid,'execute') anon from pg_proc where proname=$1",
          [name],
        )
      ).rows[0];
      assert.ok(row.proconfig.some((x) => x === 'search_path=""'));
      assert.equal(row.anon, false);
      assert.match(row.body, /is_dictionary_admin/);
    }
    assert.equal(
      (
        await pg.query(
          "select has_table_privilege('authenticated','dictionary_import_review_items','insert') allowed",
        )
      ).rows[0].allowed,
      false,
    );
    const session = await buildImportSession(c, owner, "json", [draft(6000)]);
    session.items[0].raw_candidate = {
      unknown_column: "preserve exact candidate",
    };
    session.items[0].issues.push({
      id: crypto.randomUUID(),
      row: 1,
      kind: "word",
      headword: "entry6000",
      field: "exchange",
      type: "invalid",
      existing: null,
      incoming: null,
      reason: "unsupported column",
      allowedActions: ["keep", "later"],
      selectedAction: null,
    });
    const records = await stagePersistentSession(c, session, "unknown.json");
    assert.deepEqual(
      records[0].item.raw_candidate,
      session.items[0].raw_candidate,
    );
    assert.equal(partialImportPlan(records[0].item).draft, null);
    await assert.rejects(
      () => recheckPersistent(c, records[0]),
      /Original candidate retained/,
    );
  } finally {
    await pg.close();
  }
});
test("safe updates overlay the same active Review and retain manually edited fields; concurrent Review revisions block stale previews", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(7000);
    d.headword = "do";
    await save(pg, d);
    await sql(pg, "select publish_dictionary_entry($1,true) v", [d.entry_id]);
    const snapshot = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
      d.entry_id,
    ]);
    const manual = structuredClone(d);
    manual.senses[0].gloss_zh_tw = "manual review text";
    const review = await sql(
      pg,
      "select create_dictionary_review($1,$2,$3,'manual',false) v",
      [
        d.entry_id,
        JSON.stringify(snapshot),
        JSON.stringify(mapDictionaryDraft(manual)),
      ],
    );
    const incoming = structuredClone(d);
    incoming.senses.push({
      id: id(7002),
      part_of_speech: "noun",
      gloss_zh_tw: "a social event",
    });
    const { rows } = await stage(c, incoming);
    const [r] = await applyPersistentRecords(c, rows);
    assert.equal(r.result.status, "applied", JSON.stringify(r.result));
    assert.equal(r.result.effect, "review");
    assert.equal(r.result.result.id, review.id);
    const current = (
      await pg.query("select * from dictionary_review_drafts where id=$1", [
        review.id,
      ])
    ).rows[0];
    assert.equal(
      current.candidate.bundle.dictionary_senses[0].gloss_zh_tw,
      "manual review text",
    );
    assert.equal(current.candidate.bundle.dictionary_senses.length, 2);
    assert.equal(
      (await pg.query("select gloss_zh_tw from dictionary_senses")).rows[0]
        .gloss_zh_tw,
      d.senses[0].gloss_zh_tw,
    );
    const again = structuredClone(incoming);
    again.examples = [
      {
        id: id(7003),
        sense_id: id(7002),
        body: "The do was enjoyable.",
        sort_order: 0,
      },
    ];
    const pending = await stage(c, again);
    const next = structuredClone(current.candidate);
    next.bundle.dictionary_senses[0].gloss_zh_tw = "newer manual";
    await sql(pg, "select save_dictionary_review($1,$2,$3) v", [
      review.id,
      current.revision,
      JSON.stringify(next),
    ]);
    const [stale] = await applyPersistentRecords(c, pending.rows);
    assert.equal(stale.item.status, "stale");
    assert.ok(stale.item.issues.some((i) => i.type === "preview_changed"));
    assert.equal(
      (await pg.query("select count(*)::int n from dictionary_review_drafts"))
        .rows[0].n,
      1,
    );
  } finally {
    await pg.close();
  }
});
test("additive migration on populated legacy database preserves Published, active Review, old receipts and existing import API", async () => {
  const base = require("./fixtures/dictionaryExchangeDatabase.cjs"),
    pg = await base.database();
  try {
    const c = base.client(pg),
      d = draft(8000);
    await save(pg, d);
    await sql(pg, "select publish_dictionary_entry($1,true) v", [d.entry_id]);
    const snapshot = await sql(pg, "select get_dictionary_ai_snapshot($1) v", [
      d.entry_id,
    ]);
    await sql(
      pg,
      "select create_dictionary_review($1,$2,null,'manual',false) v",
      [d.entry_id, JSON.stringify(snapshot)],
    );
    const previous = await buildImportSession(c, owner, "json", [draft(8100)]);
    await require("../src/features/dictionary/importReview.ts").applyImportItems(
      c,
      previous,
      false,
      async () => {},
      { batched: true },
    );
    const tables = [
      "dictionary_entries",
      "dictionary_senses",
      "dictionary_review_drafts",
      "dictionary_import_operations",
    ];
    const before = await Promise.all(
      tables.map((t) => pg.query("select * from " + t + " order by 1")),
    );
    await pg.exec("reset role");
    await pg.exec(
      require("node:fs").readFileSync(
        "supabase/migrations/" + migration,
        "utf8",
      ),
    );
    await pg.exec("set role authenticated");
    const after = await Promise.all(
      tables.map((t) => pg.query("select * from " + t + " order by 1")),
    );
    for (let n = 0; n < tables.length; n++)
      assert.deepEqual(after[n].rows, before[n].rows);
    const next = await buildImportSession(c, owner, "json", [draft(8200)]);
    const result =
      await require("../src/features/dictionary/importReview.ts").applyImportItems(
        c,
        next,
        false,
        async () => {},
        { batched: true },
      );
    assert.equal(result.items[0].status, "applied");
  } finally {
    await pg.close();
  }
});
test("a stale device item does not abort independent items in the same bounded batch", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const session = await buildImportSession(
      c,
      owner,
      "json",
      [draft(9000), draft(9100)],
      [],
      crypto.randomUUID(),
      { exchange: true },
    );
    const records = await stagePersistentSession(
      c,
      session,
      "concurrency.json",
    );
    await recheckPersistent(client(pg), records[0]);
    const result = await applyPersistentRecords(c, records);
    assert.match(result[0].request_conflict, /revision conflict/);
    assert.equal(result[1].result.status, "applied");
    assert.equal(
      (await pg.query("select count(*)::int n from dictionary_entries")).rows[0]
        .n,
      1,
    );
  } finally {
    await pg.close();
  }
});
test("unresolved POS/inflection dependency and absent relation target do not block independent safe content", async () => {
  const pg = await database(),
    c = client(pg);
  try {
    const d = draft(10000);
    await save(pg, d);
    const incoming = structuredClone(d);
    incoming.senses[0].part_of_speech = "noun";
    incoming.inflections = [
      {
        id: id(10002),
        sense_id: id(10001),
        form_kind: "plural",
        form: "examples",
        sort_order: 0,
      },
    ];
    incoming.relations = [
      {
        id: id(10003),
        sense_id: id(10001),
        target_entry_id: id(11000),
        target_sense_id: id(11001),
      },
    ];
    incoming.examples = [
      {
        id: id(10004),
        sense_id: null,
        body: "independent safe example",
        sort_order: 0,
      },
    ];
    const { rows } = await stage(c, incoming);
    const plan = partialImportPlan(rows[0].item);
    assert.equal(plan.draft.inflections.length, 0);
    assert.equal(plan.draft.relations.length, 0);
    assert.equal(plan.draft.examples.length, 1);
    const [r] = await applyPersistentRecords(c, rows);
    assert.equal(r.result.status, "applied");
    assert.ok(r.pending_count >= 3);
    assert.equal(
      (await pg.query("select count(*)::int n from dictionary_examples"))
        .rows[0].n,
      1,
    );
    assert.equal(
      (await pg.query("select part_of_speech from dictionary_senses")).rows[0]
        .part_of_speech,
      "verb",
    );
  } finally {
    await pg.close();
  }
});
