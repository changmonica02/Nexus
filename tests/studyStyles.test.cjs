require("./loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test"),
  assert = require("node:assert/strict");
const { fixture, grade } = require("./fixtures/studyStyleRepository.cjs");
const {
  defaultStudyStyle,
  validateStudyStyle,
} = require("../src/features/study/studyStyles.ts");
const {
  State,
  createStudyEvent,
  emptyStudyState,
  activeFixed,
} = require("../src/features/study/studyFSRS.ts");
const {
  dueAt,
  isUnintroduced,
  dailyNewUsed,
  scheduledStatus,
} = require("../src/features/study/scheduledStudy.ts");
const { reliableEvent } = require("../src/features/study/studyReliability.ts");
const now = new Date(2026, 9, 14, 12).getTime();
async function style(f, patch = {}) {
  const s = { ...defaultStudyStyle(f.owner), ...patch };
  await f.repo.saveStyle(s);
  await f.repo.assignStyle("deck", s.id);
  return s;
}
for (const mode of ["scheduled", "endless"])
  for (const method of ["fixed", "fsrs"])
    test(`${mode} × ${method}: real histories, frozen settings, proper due and no extra practice`, async () => {
      const f = await fixture(3);
      try {
        await style(f, { study_mode: mode, scheduling_method: method });
        const initial = await f.repo.startSession("deck", "scheduled", now);
        assert.equal(initial.targets.length, 3);
        assert.equal(initial.quota_limit, 100);
        const first = await grade(f.repo, initial.id, 3, now);
        const saved = await f.repo.readDeck("deck", true),
          event = saved.events.find((e) => e.kind === "review");
        assert.equal(reliableEvent(event), true);
        assert.equal(event.scheduling_method, method);
        assert.equal(event.at, now);
        assert.equal(event.rating, 3);
        if (method === "fixed") {
          assert.equal(event.log.method, "fixed");
          assert.equal(event.log.interval_seconds, 86400);
          assert.equal(event.engine, "nexus-fixed@1");
          assert.equal(event.after.fsrs, null);
          assert.equal(event.after.fixed.state, State.Review);
          assert.equal(dueAt(event.after, now), now + 86400000);
          assert.ok(event.parameters.fixed_intervals);
        } else assert.equal(event.engine, "ts-fsrs@5.4.2/FSRS-6");
        await grade(f.repo, initial.id, 4, now);
        await grade(f.repo, initial.id, 4, now);
        assert.ok(
          (await f.repo.readSession(initial.id, now)).session.completed_at,
        );
        const second = await f.repo.startSession("deck", "scheduled", now + 1);
        assert.equal(second.targets.length, mode === "endless" ? 3 : 0);
        if (mode === "endless") {
          const early = await grade(f.repo, second.id, 3, now + 1);
          assert.equal(early.session.answers, 1);
          const events = (await f.repo.readDeck("deck", true)).events;
          assert.equal(events.filter((e) => e.kind === "review").length, 4);
          assert.equal(
            events.find(
              (e) => e.session_id === second.id && e.kind === "review",
            ).scheduling_method,
            method,
          );
        }
      } finally {
        await f.close();
      }
    });
test("fixed Review/ New / Relearning four-option transitions and independent configurable intervals; deterministic replay", async () => {
  const s = defaultStudyStyle(null);
  s.scheduling_method = "fixed";
  s.fixed_intervals.relearning = [17, 29, 41, 59];
  const card = {
    id: "c",
    deck_id: "d",
    owner_id: null,
    front: "a",
    back: "b",
    content_revision: 1,
  };
  for (const phase of [
    State.New,
    State.Learning,
    State.Relearning,
    State.Review,
  ])
    for (const rating of [1, 2, 3, 4]) {
      const before = {
        ...emptyStudyState(card),
        ...(phase === State.New
          ? {}
          : {
              scheduling_method: "fixed",
              fixed: {
                state: phase,
                due: now,
                last_review: now - 100,
                generation: 0,
              },
            }),
      };
      const event = createStudyEvent(
        card,
        before,
        "review",
        now,
        "device",
        `${phase}-${rating}`,
        rating,
        "scheduled",
        s,
      );
      const group =
        phase === State.Review
          ? "review"
          : phase === State.Relearning
            ? "relearning"
            : "new";
      assert.equal(
        event.after.fixed.due,
        now + s.fixed_intervals[group][rating - 1] * 1000,
      );
      assert.equal(
        event.after.fixed.state,
        phase === State.Review
          ? rating === 1
            ? State.Relearning
            : State.Review
          : rating >= 3
            ? State.Review
            : phase === State.Relearning
              ? State.Relearning
              : State.Learning,
      );
      assert.ok(reliableEvent(event));
    }
  assert.throws(() =>
    validateStudyStyle({
      ...s,
      fixed_intervals: { ...s.fixed_intervals, new: [0, 1, 2, 3] },
    }),
  );
});
test("fixed forgotten Review uses five minutes first, then Relearning intervals; waiting/reopen/repeat does not consume another quota", async () => {
  const f = await fixture(1);
  try {
    await style(f, { scheduling_method: "fixed" });
    let session = await f.repo.startSession("deck", "scheduled", now);
    await grade(f.repo, session.id, 4, now);
    session = await f.repo.startSession(
      "deck",
      "scheduled",
      now + 4 * 86400000,
    );
    const forgotten = await grade(f.repo, session.id, 1, now + 4 * 86400000);
    let data = await f.repo.readSession(session.id, now + 4 * 86400000);
    assert.equal(
      scheduledStatus(data.session, data.snapshot, now + 4 * 86400000).waiting,
      1,
    );
    assert.equal(data.session.targets.length, 1);
    const due = data.snapshot.states[0].fixed.due;
    assert.equal(due, now + 4 * 86400000 + 300000);
    await assert.rejects(
      () =>
        f.repo.rateSession({
          ...forgotten.input,
          revision: data.session.revision,
          expectedHead: data.snapshot.states[0].head,
          actionId: crypto.randomUUID(),
          now: due - 1,
        }),
      /題目|到期|進度/,
    );
    await grade(f.repo, session.id, 1, due);
    data = await f.repo.readSession(session.id, due);
    assert.equal(data.snapshot.states[0].fixed.due, due + 60000);
    await grade(f.repo, session.id, 3, due + 60000);
    assert.ok(
      (await f.repo.readSession(session.id, due + 60000)).session.completed_at,
    );
  } finally {
    await f.close();
  }
});
test("100 slots count every distinct card; 200 due threshold suspends and resumes New in both modes; midnight replenishes remaining 20", async () => {
  for (const mode of ["scheduled", "endless"]) {
    const f = await fixture(225);
    try {
      await style(f, { study_mode: mode, scheduling_method: "fixed" });
      const initial = await f.repo.readDeck("deck");
      for (const card of initial.cards.slice(0, 200)) {
        const e = createStudyEvent(
          card,
          emptyStudyState(card),
          "review",
          now - 8 * 86400000,
          "fixture",
          "old-" + card.id,
          4,
          "scheduled",
          { ...defaultStudyStyle(null), scheduling_method: "fixed" },
        );
        await f.db.put("study_states", e.after);
        await f.db.put("study_events", e);
      }
      const session = await f.repo.startSession("deck", "scheduled", now);
      assert.equal(session.targets.length, 100);
      assert.equal(
        session.targets.some(
          (t) =>
            isUnintroduced(initial.states.find((s) => s.id === t.card_id)) &&
            initial.cards.slice(200).some((c) => c.id === t.card_id),
        ),
        false,
      );
      assert.equal(
        dailyNewUsed(await f.repo.readScheduledDeck("deck", now), now),
        0,
      );
      for (let i = 0; i < 100; i++) await grade(f.repo, session.id, 4, now);
      const next = await f.repo.startSession("deck", "scheduled", now);
      assert.equal(next.targets.length, 100);
      assert.equal(
        (await f.repo.presentScheduled(next.id, now)).snapshot.events.filter(
          (e) => e.kind === "introduce",
        ).length,
        1,
      );
      for (let i = 0; i < 100; i++) await grade(f.repo, next.id, 4, now);
      assert.equal(
        dailyNewUsed(await f.repo.readScheduledDeck("deck", now), now),
        20,
      );
      const later = await f.repo.startSession(
        "deck",
        "scheduled",
        now + 86400000,
      );
      assert.ok(later.targets.length);
      const data = await f.repo.presentScheduled(later.id, now + 86400000);
      assert.equal(dailyNewUsed(data.snapshot, now + 86400000), 1);
    } finally {
      await f.close();
    }
  }
});
test("shared styles use complete values; assignment and edits affect next sessions only; legacy customized values remain with notice", async () => {
  const f = await fixture(8);
  try {
    await f.repo.ensureDeck({
      id: "other",
      workspace_owner_id: null,
      study_items: [],
    });
    await f.repo.addCards("other", [{ front: "other", back: "字" }]);
    const custom = {
      ...defaultStudyStyle(null),
      id: "study-style:shared",
      name: "Shared",
      review_limit: 2,
      new_limit: 1,
      scheduling_method: "fixed",
    };
    await f.repo.saveStyle(custom);
    await f.repo.assignStyle("deck", custom.id);
    await f.repo.assignStyle("other", custom.id);
    const active = await f.repo.startSession("deck", "scheduled", now);
    await f.repo.saveStyle({
      ...custom,
      review_limit: 7,
      new_limit: 6,
      scheduling_method: "fsrs",
    });
    const recovered = await f.repo.readSession(active.id, now);
    assert.deepEqual(recovered.session.settings_snapshot, custom);
    assert.equal(recovered.snapshot.settings.new_limit, 1);
    assert.equal((await f.repo.styleForDeck("other")).style.review_limit, 7);
    await grade(f.repo, active.id, 4, now);
    const next = await f.repo.startSession("deck", "scheduled", now);
    assert.equal(next.settings_snapshot.review_limit, 7);
    assert.equal(next.settings_snapshot.scheduling_method, "fsrs");
    await f.repo.ensureDeck({
      id: "legacy",
      workspace_owner_id: null,
      study_items: [],
    });
    await f.repo.configure("legacy", { review_limit: 50, new_limit: 3 });
    const migrated = await f.repo.styleForDeck("legacy");
    assert.equal(migrated.style.review_limit, 50);
    assert.equal(migrated.style.new_limit, 3);
    assert.equal(migrated.notice, true);
    assert.equal(
      (await f.repo.listStyles()).find((s) => s.id.includes(":default:"))
        .review_limit,
      100,
    );
  } finally {
    await f.close();
  }
});
test("FSRS ↔ fixed preserves memory/history, actual answers initialize missing memory, same action replay is idempotent, reset generation invalidates archived fixed state", async () => {
  const f = await fixture(1);
  try {
    await style(f);
    let session = await f.repo.startSession("deck", "scheduled", now);
    await grade(f.repo, session.id, 4, now);
    const original = (await f.repo.readDeck("deck", true)).states[0].fsrs;
    await style(f, { scheduling_method: "fixed", study_mode: "endless" });
    session = await f.repo.startSession("deck", "scheduled", now + 1);
    const action = await grade(f.repo, session.id, 4, now + 1);
    const fixed = (await f.repo.readDeck("deck", true)).states[0];
    assert.deepEqual(fixed.fsrs, original);
    assert.ok(activeFixed(fixed));
    const count = (await f.repo.readDeck("deck", true)).events.length;
    await f.repo.rateSession(action.input);
    assert.equal((await f.repo.readDeck("deck", true)).events.length, count);
    await style(f, { study_mode: "endless" });
    session = await f.repo.startSession("deck", "scheduled", now + 2);
    await grade(f.repo, session.id, 4, now + 2);
    const final = await f.repo.readDeck("deck", true);
    assert.equal(final.states[0].scheduling_method, "fsrs");
    assert.deepEqual(final.states[0].fixed, fixed.fixed);
    assert.equal(
      final.events.find((e) => e.id === final.states[0].head).method_transition,
      "resume-preserved-fsrs-memory",
    );
    assert.ok(final.events.every(reliableEvent));
    const resetByServer = {
      ...fixed,
      fsrs: null,
      introduced_at: null,
      legacy_due_at: null,
      learned_at: null,
      generation: 1,
    };
    assert.equal(activeFixed(resetByServer), false);
    assert.equal(isUnintroduced(resetByServer), true);
  } finally {
    await f.close();
  }
});
test("actual workspace backup v3 retains style catalogue, fixed history and frozen session; missing/invalid style fails before any restore write", async () => {
  const {
      IndexedDBAdapter,
    } = require("../src/infrastructure/storage/IndexedDBAdapter.ts"),
    { deleteDB } = require("idb");
  await deleteDB("nexus");
  let adapter = new IndexedDBAdapter();
  await adapter.init();
  try {
    const page = await adapter.createPage({ kind: "study_set" }),
      repo = adapter.getStudyRepository();
    await repo.ensureDeck(page);
    await repo.addCards(page.id, [{ front: "backup", back: "備份" }]);
    const s = { ...defaultStudyStyle(null), scheduling_method: "fixed" };
    await repo.saveStyle(s);
    await repo.assignStyle(page.id, s.id);
    const session = await repo.startSession(page.id, "scheduled", now);
    await grade(repo, session.id, 1, now);
    const backup = await adapter.exportWorkspaceBackup();
    assert.ok(backup.study.settings.some((r) => r.record_type === "style"));
    assert.equal(
      backup.study.sessions[0].settings_snapshot.scheduling_method,
      "fixed",
    );
    const missing = structuredClone(backup);
    missing.study.settings = missing.study.settings.filter(
      (r) => r.record_type !== "style",
    );
    await assert.rejects(
      () => adapter.importWorkspaceBackup(missing),
      /missing assigned/,
    );
    assert.deepEqual((await repo.exportData()).events, backup.study.events);
    const bad = structuredClone(backup);
    bad.study.settings.find(
      (r) => r.record_type === "style",
    ).style.fixed_intervals.new[0] = -1;
    await assert.rejects(() => adapter.importWorkspaceBackup(bad), /interval/i);
    await adapter.close();
    await deleteDB("nexus");
    adapter = new IndexedDBAdapter();
    await adapter.init();
    await adapter.importWorkspaceBackup(backup);
    const reloaded = adapter.getStudyRepository();
    const recovered = await reloaded.readSession(session.id, now);
    assert.equal(
      recovered.session.settings_snapshot.scheduling_method,
      "fixed",
    );
    assert.equal(recovered.snapshot.states[0].fixed.due, now + 60000);
    assert.equal((await reloaded.readDeck(page.id, true)).events.length, 2);
  } finally {
    await adapter.close();
    await deleteDB("nexus");
  }
});
test("legacy unfinished FSRS session cannot silently switch method when a newly selected style uses fixed intervals", async () => {
  const f = await fixture(1);
  try {
    const created = await f.repo.startSession("deck", "scheduled", now);
    delete created.settings_snapshot;
    created.quota_limit = 50;
    await f.db.put("study_sessions", created);
    await style(f, { scheduling_method: "fixed" });
    const recovered = await f.repo.readSession(created.id, now);
    assert.equal(recovered.session.settings_snapshot.scheduling_method, "fsrs");
    assert.equal(recovered.session.settings_snapshot.review_limit, 50);
    assert.equal(recovered.session.compatibility_notice, true);
    await grade(f.repo, created.id, 4, now);
    const e = (await f.repo.readDeck("deck", true)).events.find(
      (e) => e.kind === "review",
    );
    assert.equal(e.engine, "ts-fsrs@5.4.2/FSRS-6");
  } finally {
    await f.close();
  }
});
