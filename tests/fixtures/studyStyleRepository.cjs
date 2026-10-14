require("../loadStudy.cjs");
require("fake-indexeddb/auto");
const { openDB, deleteDB } = require("idb");
const {
  StudyRepository,
  STUDY_STORES,
} = require("../../src/features/study/StudyRepository.ts");
async function fixture(
  count = 0,
  owner = null,
  name = crypto.randomUUID(),
  device = "device",
) {
  const db = await openDB(name, 1, {
    upgrade(db) {
      for (const n of STUDY_STORES) {
        const s = db.createObjectStore(n, { keyPath: "id" });
        if (["study_cards", "study_states", "study_events"].includes(n)) {
          s.createIndex("deck", "deck_id");
          if (n === "study_events") {
            s.createIndex("deck_day", ["deck_id", "local_day"]);
            s.createIndex("deck_at", ["deck_id", "at"]);
          }
        }
      }
    },
  });
  const repo = new StudyRepository(db, () => owner, device);
  await repo.ensureDeck({
    id: "deck",
    workspace_owner_id: owner,
    study_items: [],
  });
  if (count)
    await repo.addCards(
      "deck",
      Array.from({ length: count }, (_, i) => ({
        front: "word" + i,
        back: "字" + i,
      })),
    );
  return {
    db,
    repo,
    name,
    owner,
    close: async () => {
      db.close();
      await deleteDB(name);
    },
  };
}
async function grade(repo, id, rating, at) {
  const { session, snapshot } = await repo.presentScheduled(id, at);
  const card = snapshot.cards.find((c) => c.id === session.queue[0]),
    state = snapshot.states.find((s) => s.id === card.id);
  if (!card) throw Error("No ready card");
  const input = {
    sessionId: id,
    cardId: card.id,
    revision: session.revision,
    contentRevision: card.content_revision,
    expectedHead: state.head,
    rating,
    actionId: crypto.randomUUID(),
    now: at,
  };
  return { input, session: await repo.rateSession(input) };
}
module.exports = { fixture, grade };
