import { IndexedDBAdapter } from '../../src/infrastructure/storage/IndexedDBAdapter';
import { createBlankTemplate } from '../../src/lib/characterTemplates';
import { createClient } from '@supabase/supabase-js';

const storage = new IndexedDBAdapter();
await storage.init();
window.pwaData = {
  async auth(session) {
    const client = createClient('https://pwa-fixture.supabase.co', 'synthetic-pwa-public-key');
    return session ? client.auth.setSession(session) : client.auth.signOut({ scope: 'local' });
  },
  async seed(owner, pdf) {
    storage.setWorkspaceOwner(owner);
    await storage.setLanguagePreference('en');
    const create = async (title, kind = 'note', extra = {}) => {
      const page = await storage.createPage({ title, kind, format: 'flow' });
      return storage.savePage({ ...page, ...extra, content_json: { type: 'doc', retainedMetadata: 'KEEP', content: [{ type: 'paragraph', attrs: { id: 'pwa-body-' + page.id }, content: [{ type: 'text', text: title + ' original body' }] }] }, content_text: title + ' original body' });
    };
    const note = await create('PWA Note');
    const conflict = await create('PWA Conflict');
    const characterData = createBlankTemplate(); characterData.basic.name = 'PWA Character'; characterData.sections.push({ id: 'character-bio', type: 'rich_text', title: 'Biography', richText: 'CREATIVE_BODY' });
    const character = await create('PWA Character', 'creative', { creative_type: 'character', character_data: characterData });
    const worldData = createBlankTemplate(); worldData.basic.name = 'PWA World'; worldData.sections.push({ id: 'world-bio', type: 'rich_text', title: 'World description', richText: 'WORLD_BODY' });
    const world = await create('PWA World', 'creative', { creative_type: 'world', character_data: worldData });
    const cached = await storage.createAttachment({ kind: 'pdf', name: 'cached.pdf', mime_type: 'application/pdf', size_bytes: pdf.length });
    await storage.attachBinary(cached.id, new Blob([pdf], { type: 'application/pdf' }));
    const missing = await storage.createAttachment({ kind: 'pdf', name: 'missing.pdf', mime_type: 'application/pdf', size_bytes: pdf.length });
    const pdfPage = await create('PWA Cached PDF', 'note', { attachment_ids: [cached.id], primary_attachment_id: cached.id });
    const missingPage = await create('PWA Missing PDF', 'note', { attachment_ids: [missing.id], primary_attachment_id: missing.id });
    const deck = await create('PWA Study', 'study_set');
    const repo = storage.getStudyRepository(); await repo.ensureDeck(deck);
    await repo.addCards(deck.id, [{ front: 'offline word', back: 'offline answer' }]);
    await repo.configure(deck.id, { direction_confirmed: true });
    await storage.setActivePageId(null);
    return { note: note.id, conflict: conflict.id, character: character.id, world: world.id, deck: deck.id, pdf: pdfPage.id, missing: missingPage.id, attachment: cached.id };
  },
  async read(owner, id) { storage.setWorkspaceOwner(owner); return storage.getPage(id); },
  async pending(owner) { storage.setWorkspaceOwner(owner); return { workspace: await storage.getWorkspacePersistence().pending(owner), study: await storage.getStudyRepository().pending() }; },
  async study(owner, id) { storage.setWorkspaceOwner(owner); return storage.getStudyRepository().readDeck(id, true); },
  async edit(owner, id, text) { storage.setWorkspaceOwner(owner); const page = await storage.getPage(id); await storage.savePage({ ...page, content_text: text, content_json: { ...page.content_json, content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] } }); },
  async seedOther(owner) { storage.setWorkspaceOwner(owner); const page = await storage.createPage({ title: 'ACCOUNT B PRIVATE', kind: 'note', format: 'flow' }); return page.id; },
  async home() { await storage.setActivePageId(null); },
};
