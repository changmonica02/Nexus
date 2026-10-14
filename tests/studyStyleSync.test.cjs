require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const { PGlite } = require("@electric-sql/pglite");
const { fixture, grade } = require("./fixtures/studyStyleRepository.cjs");
const { syncStudy } = require("../src/features/study/studySync.ts");
const { defaultStudyStyle } = require("../src/features/study/studyStyles.ts");
const { reliableEvent } = require("../src/features/study/studyReliability.ts");
const { activeFixed } = require("../src/features/study/studyFSRS.ts");
const owner = "11111111-1111-4111-8111-111111111111",
  now = new Date(2026, 9, 14, 12).getTime();
test("original Supabase SQL: style JSON, fixed events and method switches replay after dropped replies, second-device settings/state, backup and owner isolation", async () => {
  const pg = new PGlite(),
    one = await fixture(1, owner),
    two = await fixture(0, owner),
    restored = await fixture(0, owner);
  try {
    await pg.exec(
      "create schema auth;create role authenticated;create role anon;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth,public to authenticated,anon;",
    );
    for (const file of [
      "20260922_study_fsrs.sql",
      "20261016_study_reliability.sql",
    ])
      await pg.exec(fs.readFileSync("supabase/migrations/" + file, "utf8"));
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      owner,
    ]);
    const fixed = {
      ...defaultStudyStyle(owner),
      scheduling_method: "fixed",
      study_mode: "endless",
    };
    await one.repo.saveStyle(fixed);
    await one.repo.assignStyle("deck", fixed.id);
    const session = await one.repo.startSession("deck", "scheduled", now);
    await grade(one.repo, session.id, 1, now);
    await grade(one.repo, session.id, 3, now + 60000);
    await one.repo.saveStyle({ ...fixed, scheduling_method: "fsrs" });
    const switched = await one.repo.startSession(
      "deck",
      "scheduled",
      now + 60001,
    );
    await grade(one.repo, switched.id, 4, now + 60001);
    let lost = true;
    const client = {
      rpc: async (name, args) => {
        try {
          if (name === "pull_study_changes")
            return {
              data: (
                await pg.query("select pull_study_changes($1) v", [
                  args.after_sequence,
                ])
              ).rows[0].v,
              error: null,
            };
          if (name === "apply_study_resolution")
            return {
              data: (
                await pg.query("select apply_study_resolution($1) v", [
                  JSON.stringify(args.operation),
                ])
              ).rows[0].v,
              error: null,
            };
          assert.equal(name, "apply_study_operation");
          assert.ok(!("session" in args.operation));
          await pg.query("select apply_study_operation($1)", [
            JSON.stringify(args.operation),
          ]);
          if (
            lost &&
            args.operation.kind === "event" &&
            args.operation.value.engine === "nexus-fixed@1"
          ) {
            lost = false;
            return { error: { message: "lost fixed receipt" } };
          }
          return { data: true, error: null };
        } catch (e) {
          return { error: { message: e.message } };
        }
      },
    };
    await assert.rejects(
      () => syncStudy(one.repo, client, owner),
      /lost fixed receipt/,
    );
    await syncStudy(one.repo, client, owner);
    assert.equal((await one.repo.pending()).length, 0);
    const events = (
      await pg.query("select payload from study_review_events")
    ).rows.map((r) => r.payload);
    assert.equal(events.filter((e) => e.engine === "nexus-fixed@1").length, 2);
    assert.ok(events.every(reliableEvent));
    await syncStudy(two.repo, client, owner);
    const remote = await two.repo.readScheduledDeck("deck", now + 60001);
    assert.equal(remote.settings.style.scheduling_method, "fsrs");
    assert.equal(remote.settings.review_limit, 100);
    assert.equal(remote.states[0].scheduling_method, "fsrs");
    assert.ok(remote.states[0].fixed);
    assert.ok(remote.states[0].fsrs);
    assert.equal(remote.states[0].conflict, false);
    await two.repo.saveStyle({ ...fixed, name: "共用自訂樣式" });
    const next = await two.repo.startSession("deck", "scheduled", now + 60002);
    await grade(two.repo, next.id, 2, now + 60002);
    await syncStudy(two.repo, client, owner);
    await syncStudy(one.repo, client, owner);
    const reconciled = await one.repo.readScheduledDeck("deck", now + 60002);
    assert.ok(activeFixed(reconciled.states[0]));
    assert.equal(reconciled.settings.style.name, "共用自訂樣式");
    const backup = await one.repo.exportData();
    await restored.repo.mergeRemote(backup);
    const recovered = await restored.repo.readDeck("deck", true);
    assert.equal(recovered.events.length, backup.events.length);
    assert.deepEqual(
      recovered.states,
      (await one.repo.readDeck("deck", true)).states,
    );
    assert.equal(
      (await restored.repo.listStyles()).length,
      (await one.repo.listStyles()).length,
    );
    assert.ok(
      recovered.sessions.some(
        (s) => s.settings_snapshot?.scheduling_method === "fixed",
      ),
    );
    const branchOne = await one.repo.startSession(
        "deck",
        "scheduled",
        now + 60003,
      ),
      branchTwo = await two.repo.startSession("deck", "scheduled", now + 60003);
    await grade(one.repo, branchOne.id, 2, now + 60003);
    await grade(two.repo, branchTwo.id, 1, now + 60003);
    await syncStudy(one.repo, client, owner);
    await syncStudy(two.repo, client, owner);
    let conflict = (await two.repo.readDeck("deck", true)).states[0];
    assert.equal(conflict.conflict, true);
    assert.equal(conflict.ambiguity.candidates.length, 2);
    const retained = (await two.repo.readDeck("deck", true)).events.length;
    await two.repo.resolveSchedule(conflict.id, "relearn");
    await syncStudy(two.repo, client, owner);
    conflict = (await two.repo.readDeck("deck", true)).states[0];
    assert.equal(conflict.conflict, false);
    assert.equal(conflict.generation, 1);
    assert.equal(activeFixed(conflict), false);
    assert.equal(
      (await two.repo.readDeck("deck", true)).events.length,
      retained,
    );
    await pg.exec("set role authenticated");
    await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [
      "22222222-2222-4222-8222-222222222222",
    ]);
    assert.equal(
      (await pg.query("select * from study_deck_settings")).rows.length,
      0,
    );
    await assert.rejects(
      () =>
        pg.query("select apply_study_operation($1)", [
          JSON.stringify({ kind: "settings", value: backup.settings[0] }),
        ]),
      /owner/,
    );
    await pg.exec("reset role;set role anon");
    await assert.rejects(
      () =>
        pg.query("select apply_study_operation($1)", [
          JSON.stringify({ kind: "settings", value: backup.settings[0] }),
        ]),
      /permission/,
    );
  } finally {
    await one.close();
    await two.close();
    await restored.close();
    await pg.close();
  }
});
