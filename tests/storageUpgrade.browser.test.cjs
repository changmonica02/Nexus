const test = require("node:test"),
  assert = require("node:assert/strict"),
  path = require("node:path");
const { build } = require("esbuild"),
  { chromium } = require("playwright"),
  { execFileSync } = require("node:child_process");
const { waitForAsync } = require("./pwaBrowser.cjs");
const root = path.resolve(__dirname, "..");
test(
  "actual v8 adapter blocks safely, v9 retains unsynced work, old client fails without wiping, and current UI explains recovery",
  { timeout: 90000 },
  async (t) => {
    const origin = process.env.NEXUS_PWA_URL || "http://127.0.0.1:32142";
    const legacy = execFileSync(
      "git",
      ["show", "a60f04d6df7f5209f8b32e025b5af20e698513f7:src/infrastructure/storage/IndexedDBAdapter.ts"],
      { encoding: "utf8" },
    );
    const bundle = await build({
      stdin: {
        contents: `import {IndexedDBAdapter as Legacy} from 'legacy-adapter';import {IndexedDBAdapter as Current} from './src/infrastructure/storage/IndexedDBAdapter';window.Legacy=Legacy;window.Current=Current;window.openOld=async()=>{window.old=new Legacy();await old.init();old.setWorkspaceOwner('upgrade-owner');await old.createPage({title:'unsynced v8 note'});const attachment=await old.createAttachment({kind:'file',name:'offline.txt',mime_type:'text/plain',size_bytes:7});await old.attachBinary(attachment.id,new Blob(['offline']));window.attachmentId=attachment.id;return (await old.getWorkspacePersistence().pending('upgrade-owner')).length;};`,
        resolveDir: root,
      },
      bundle: true,
      write: false,
      format: "esm",
      plugins: [
        {
          name: "old-adapter",
          setup(b) {
            b.onResolve({ filter: /^legacy-adapter$/ }, () => ({ path: "legacy", namespace: "legacy" }));
            b.onLoad({ filter: /.*/, namespace: "legacy" }, () => ({
              contents: legacy,
              loader: "ts",
              resolveDir: path.join(root, "src/infrastructure/storage"),
            }));
          },
        },
      ],
    });
    const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXECUTABLE, args: ["--no-sandbox"] });
    t.after(() => browser.close());
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      if (url.pathname === "/__storage_helper.js")
        return route.fulfill({ contentType: "text/javascript", body: bundle.outputFiles[0].text });
      if (url.pathname === "/__storage_fixture")
        return route.fulfill({
          contentType: "text/html",
          body: '<div>storage fixture</div><script type="module" src="/__storage_helper.js"></script>',
        });
      return route.continue();
    });
    const old = await context.newPage();
    await old.goto(origin + "/__storage_fixture");
    await old.waitForFunction(() => window.openOld);
    const pending = await old.evaluate(() => window.openOld());
    assert.equal(pending, 3);
    const before = await old.evaluate(async () => ({
      pages: await window.old.listPages(),
      attachments: await window.old.listAttachments(),
      outbox: await window.old.getWorkspacePersistence().pending("upgrade-owner"),
    }));
    const modern = await context.newPage();
    await modern.goto(origin);
    await modern.locator("main[role=alert]").waitFor();
    assert.match(await modern.locator("main[role=alert]").innerText(), /頁籤|tabs/);
    assert.match(await modern.locator("main[role=alert]").innerText(), /請勿清除|Do not clear/);
    assert.deepEqual(
      await old.evaluate(async () => ({
        pages: await window.old.listPages(),
        attachments: await window.old.listAttachments(),
        outbox: await window.old.getWorkspacePersistence().pending("upgrade-owner"),
      })),
      before,
    );
    await old.evaluate(() => window.old.close());
    // The abandoned open is eventually allowed to finish; the app must close it.
    await waitForAsync(old, async () => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("nexus");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      const v = db.version;
      db.close();
      return v === 9;
    });
    await modern.getByRole("button", { name: /重新載入 Nexus|Reload Nexus/ }).click();
    await modern.waitForLoadState("domcontentloaded");
    await modern.locator("main[role=alert]").waitFor({ state: "hidden" });
    await old.reload();
    await old.waitForFunction(() => window.Current);
    const state = await old.evaluate(async () => {
      const a = new Current();
      await a.init();
      a.setWorkspaceOwner("upgrade-owner");
      const result = {
        pages: await a.listPages(),
        attachments: await a.listAttachments(),
        outbox: await a.getWorkspacePersistence().pending("upgrade-owner"),
        binary: await (await a.readBinary((await a.listAttachments())[0].id)).text(),
      };
      await a.close();
      return result;
    });
    assert.deepEqual(state.pages, before.pages);
    assert.deepEqual(state.attachments, before.attachments);
    assert.deepEqual(state.outbox, before.outbox);
    assert.equal(state.binary, "offline");
    const oldError = await old.evaluate(async () => {
      try {
        await new Legacy().init();
        return null;
      } catch (e) {
        return e.name;
      }
    });
    assert.equal(oldError, "VersionError");
    // A stale/newer database must never be deleted to make an older build start.
    await modern.close();
    await old.evaluate(async () => {
      const db = await new Promise((resolve, reject) => {
        const r = indexedDB.open("nexus", 10);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
      db.close();
    });
    const stale = await context.newPage();
    await stale.goto(origin);
    await stale.locator("main[role=alert]").waitFor();
    assert.match(await stale.locator("main[role=alert]").innerText(), /較新版本|newer/);
    const stillThere = await old.evaluate(async () => {
      const db = await new Promise((resolve) => {
        const r = indexedDB.open("nexus");
        r.onsuccess = () => resolve(r.result);
      });
      const tx = db.transaction(["pages", "workspace_outbox"]);
      const rows = await Promise.all(
        ["pages", "workspace_outbox"].map(
          (s) =>
            new Promise((resolve) => {
              const r = tx.objectStore(s).getAll();
              r.onsuccess = () => resolve(r.result);
            }),
        ),
      );
      db.close();
      return rows;
    });
    assert.deepEqual(stillThere[0], before.pages);
    assert.deepEqual(
      stillThere[1].sort((a, b) => a.sequence - b.sequence),
      before.outbox,
    );
    await context.close();
  },
);
