import { IndexedDBAdapter } from '../../src/infrastructure/storage/IndexedDBAdapter';
import { SyncEngine } from '../../src/infrastructure/sync/syncEngine';
const owner = 'browser-owner';
const storage = new IndexedDBAdapter();
await storage.init();
storage.setWorkspaceOwner(owner);
const client = {
  from(table) {
    const request = { table, columns: '*', filters: [] };
    let signal;
    return {
      select(columns) { request.columns = columns; return this; },
      eq(key, value) { request.filters.push([key, value]); return this; },
      order() { return this; }, limit() { return this; },
      gt(key, value) { request.cursor = [key, value]; return this; },
      abortSignal(value) { signal = value; return this; },
      async then(resolve, reject) {
        try { resolve(await (await fetch('/query', { method: 'POST', body: JSON.stringify(request), signal })).json()); }
        catch (error) { reject(error); }
      },
      async maybeSingle() { const result = await this; return { ...result, data: result.data?.[0] ?? null }; },
    };
  },
};
const engine = new SyncEngine(client, storage, 'browser-device', owner);
// Study SQL is covered separately; this fixture exercises real attachment code.
engine.syncStudyNow = async () => {};
window.sync = () => engine.fullSync();
window.read = async () => (await storage.readBinary('pdf'))?.text() ?? null;
window.owner = value => storage.setWorkspaceOwner(value);
window.ready = true;
