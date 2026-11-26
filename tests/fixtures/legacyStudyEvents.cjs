const { createStudyEvent } = require('../../src/features/study/studyFSRS.ts');
const { effectiveEvent, projectStudyEvent } = require('../../src/features/study/studyReliability.ts');

// Seed the durable records and pending upload left by an older client.
async function recordLegacyEvent(db, cardId, kind, now, device, id, rating) {
  const tx = db.transaction(['study_cards', 'study_states', 'study_events', 'study_outbox', 'study_sync_meta'], 'readwrite');
  const card = await tx.objectStore('study_cards').get(cardId);
  const state = await tx.objectStore('study_states').get(cardId);
  const clear = await tx.objectStore('study_sync_meta').get(JSON.stringify([card.owner_id, 'clear', card.deck_id]));
  let event = createStudyEvent(card, state, kind, now, device, id, rating);
  if (clear) event = projectStudyEvent(event, state, clear.clear.cleared_at);
  await tx.objectStore('study_events').add(event);
  await tx.objectStore('study_states').put(effectiveEvent(event).after);
  await tx.objectStore('study_outbox').put({ id: crypto.randomUUID(), owner_id: card.owner_id, kind: 'event', value: event });
  await tx.done;
  return event;
}

module.exports = { recordLegacyEvent };
