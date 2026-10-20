// The editor runs with an opaque origin. These are session-only preferences,
// never Nexus account storage. Native projects are persisted by the parent.
import 'fake-indexeddb/auto';
function memoryStorage() {
  const data = new Map();
  const storage = { get length() { return data.size; }, key: i => [...data.keys()][i] ?? null,
    getItem: k => data.get(String(k)) ?? null, setItem: (k, v) => { data.set(String(k), String(v)); },
    removeItem: k => { data.delete(String(k)); }, clear: () => data.clear() };
  return new Proxy(storage, { get: (target, key) => key in target ? Reflect.get(target, key) : data.get(String(key)),
    set: (_, key, value) => { data.set(String(key), String(value)); return true; },
    deleteProperty: (_, key) => data.delete(String(key)) });
}
Object.defineProperty(window, 'localStorage', { value: memoryStorage() });
Object.defineProperty(window, 'sessionStorage', { value: memoryStorage() });
