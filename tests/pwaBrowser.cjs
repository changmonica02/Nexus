const assert = require('node:assert/strict');
const sessions = new WeakMap();

// Explicit polling is required: the installed Chromium/Playwright combination
// treats an async waitForFunction predicate's Promise as truthy before it settles.
async function waitForAsync(page, predicate, arg, timeout = 30000) {
  const end = Date.now() + timeout;
  while (!await page.evaluate(predicate, arg)) {
    assert.ok(Date.now() < end, 'Timed out waiting for browser data condition');
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}

// Apply both network transport AND navigator state to each new target; context
// offline emulation alone does not carry navigator.onLine into reopened targets.
async function setNetwork(page, offline) {
  let state = sessions.get(page);
  if (!state) { state = { session: await page.context().newCDPSession(page) }; sessions.set(page, state); }
  const { session } = state;
  await session.send('Network.emulateNetworkConditions', { offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1 });
  await session.send('Network.overrideNetworkState', { offline, latency: 0, downloadThroughput: offline ? 0 : -1, uploadThroughput: offline ? 0 : -1 });
  // This Chromium resets navigator state on navigation even with the CDP override.
  // Keep the browser signal consistent with the blocked transport in new documents.
  await page.addInitScript(defaultOffline => {
    let offline = defaultOffline;
    try { const saved = localStorage.getItem('__nexus_pwa_test_offline'); if (saved !== null) offline = saved === '1'; } catch {}
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: !offline });
  }, offline);
  await page.evaluate(online => {
    try { localStorage.setItem('__nexus_pwa_test_offline', online ? '0' : '1'); } catch {}
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: online });
    window.dispatchEvent(new Event(online ? 'online' : 'offline'));
  }, !offline);
}
module.exports = { waitForAsync, setNetwork };
