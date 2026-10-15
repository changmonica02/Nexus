const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http");
const { build } = require("esbuild"),
  { chromium } = require("playwright");
const root = path.resolve(__dirname, "..");
async function until(page, predicate, arg) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (await page.evaluate(predicate, arg)) return;
    await page.waitForTimeout(25);
  }
  throw Error("Timed out waiting for persisted workspace state");
}

test(
  "actual shared workspace: overlay/focus/footer at four sizes, settings, tools, Web navigation, collection menus and dictionary union/pagination",
  { timeout: 180000 },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nexus-ui-"));
    await build({
      entryPoints: ["tests/fixtures/unifiedWorkspace.jsx"],
      outfile: path.join(tmp, "fixture.js"),
      bundle: true,
      format: "esm",
      loader: { ".woff2": "dataurl", ".woff": "dataurl", ".ttf": "dataurl" },
      jsx: "automatic",
      define: { "process.env.NODE_ENV": '"test"' },
      plugins: [
        {
          name: "isolated-services",
          setup(b) {
            b.onLoad(
              { filter: /infrastructure\/supabase\/client\.ts$/ },
              () => ({
                contents:
                  "export const getSupabase=()=>window.dictionaryClient;export const isSupabaseConfigured=()=>true;",
                loader: "js",
              }),
            );
            b.onLoad(
              { filter: /infrastructure\/sync\/syncEngine\.ts$/ },
              () => ({
                contents:
                  "export class SyncEngine { subscribe(){}setOnRemoteChange(){}async fullSync(){}startRealtime(){}destroy(){}pushPage(){}pushPages(){}pushPermanentDeletePage(){}pushPermanentDeleteAttachment(){} }",
                loader: "js",
              }),
            );
            b.onResolve({ filter: /^next\/link$/ }, () => ({
              path: "link",
              namespace: "mock",
            }));
            b.onLoad({ filter: /link/, namespace: "mock" }, () => ({
              contents: `import React from '${root}/node_modules/react/index.js';export default function Link({href,children,...props}){return <a href={href} {...props}>{children}</a>}`,
              loader: "jsx",
              resolveDir: root,
            }));
            b.onResolve({ filter: /^next\/navigation$/ }, () => ({
              path: "navigation",
              namespace: "mock",
            }));
            b.onLoad({ filter: /navigation/, namespace: "mock" }, () => ({
              contents: `import {useSyncExternalStore} from '${root}/node_modules/react/index.js';const subscribe=cb=>{window.addEventListener('fixture-nav',cb);return()=>window.removeEventListener('fixture-nav',cb)};const go=href=>{history.pushState(null,'',href);window.dispatchEvent(new Event('fixture-nav'));};export function usePathname(){return useSyncExternalStore(subscribe,()=>location.pathname)}export const useRouter=()=>({push:go,replace:go});export const useSearchParams=()=>new URLSearchParams(location.search);`,
              loader: "js",
              resolveDir: root,
            }));
          },
        },
      ],
    });
    const css = (
      await require("postcss")([
        require("@tailwindcss/postcss")({ base: root }),
      ]).process(fs.readFileSync("src/app/globals.css", "utf8"), {
        from: path.join(root, "src/app/globals.css"),
      })
    ).css;
    const server = http.createServer((req, res) => {
      if (req.url === "/fixture.js") {
        res.setHeader("content-type", "text/javascript");
        res.end(fs.readFileSync(path.join(tmp, "fixture.js")));
      } else if (req.url === "/fixture.css") res.end(css);
      else
        res.end(
          '<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/fixture.css"></head><body><div id="root"></div><script type="module" src="/fixture.js"></script></body></html>',
        );
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const browser = await chromium.launch({
      headless: true,
      executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    });
    const errors = [];
    try {
      for (const [width, height] of [
        [1440, 900],
        [820, 1180],
        [1180, 820],
        [390, 844],
      ]) {
        const context = await browser.newContext({
            viewport: { width, height },
          }),
          page = await context.newPage();
        page.on("pageerror", (e) => errors.push(e.message));
        await page.goto(`http://127.0.0.1:${server.address().port}`);
        const opener = page.getByRole("button", {
          name: "開啟導覽",
          exact: true,
        });
        await opener.waitFor();
        const mainWidth = await page
          .locator("main")
          .first()
          .evaluate((e) => e.getBoundingClientRect().width);
        await opener.click();
        const drawer = page.getByRole("dialog", {
          name: "開啟導覽",
          exact: true,
        });
        await drawer.waitFor();
        assert.equal(
          await page
            .locator("main")
            .first()
            .evaluate((e) => e.getBoundingClientRect().width),
          mainWidth,
        );
        const settings = drawer.getByRole("button", {
          name: "偏好設定",
          exact: true,
        }); // localized existing preference title
        const search = drawer.locator('input[type="text"]').first();
        await search.fill("Sample");
        await page.mouse.click(width - 4, height - 4);
        await drawer.waitFor({ state: "hidden" });
        await opener.click();
        assert.equal(await search.inputValue(), "Sample");
        await search.fill("");
        const preference = drawer.locator("button").filter({ hasText: "⚙" });
        await preference.click();
        await page.getByRole("button", { name: "設定", exact: true }).click();
        const dialog = page.getByRole("dialog", { name: "設定", exact: true });
        await dialog.waitFor();
        assert.equal(
          await dialog
            .getByRole("button", { name: "功能與導覽", exact: true })
            .count(),
          0,
        );
        const details = dialog
          .locator("details")
          .filter({ has: page.locator("summary", { hasText: "功能總覽" }) });
        assert.equal(await details.getAttribute("open"), null);
        await details.locator("summary").click();
        await details
          .getByRole("checkbox", { name: "網頁", exact: true })
          .uncheck();
        await dialog.getByRole("button", { name: "關閉設定" }).click();
        await drawer
          .getByRole("button", { name: "功能總覽", exact: true })
          .click();
        assert.equal(
          await drawer
            .getByRole("button", { name: "開啟 網頁", exact: true })
            .count(),
          0,
        );
        await drawer.getByRole("button", { name: "工具", exact: true }).click();
        await drawer
          .getByRole("button", { name: "＋ 計數", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "計數", exact: true })
          .waitFor();
        await opener.click();
        await page.keyboard.press("Escape");
        await drawer.waitFor({ state: "hidden" });
        assert.equal(
          await opener.evaluate((e) => document.activeElement === e),
          true,
        );
        await page
          .getByRole("button", { name: "功能總覽", exact: true })
          .click();
        await page.getByRole("button", { name: "網頁", exact: true }).click();
        await page
          .getByRole("heading", { name: "網頁", exact: true })
          .waitFor();
        await page.getByRole("button", { name: /^⌘ Sample web/ }).click();
        const title = page.locator("input").filter({ visible: true }).first();
        await title.fill("Saved web");
        await opener.click();
        const features = drawer.getByRole("button", {
          name: "功能總覽",
          exact: true,
        });
        if ((await features.getAttribute("aria-expanded")) === "false")
          await features.click();
        await drawer
          .getByRole("button", { name: "筆記", exact: true })
          .dblclick();
        await page
          .getByRole("heading", { name: "筆記", exact: true })
          .waitFor();
        assert.equal(
          await page.evaluate(
            async () =>
              (await window.fixtureStorage.listPages()).find(
                (p) => p.kind === "web",
              ).title,
          ),
          "Saved web",
        );
        const more = page.getByRole("button", {
          name: "更多操作 Sample note",
          exact: true,
        });
        await more.click();
        assert.equal(
          await page
            .getByRole("menuitem", { name: "重新命名", exact: false })
            .count(),
          1,
        );
        await page.keyboard.press("ArrowDown");
        await page.keyboard.press("Escape");
        assert.equal(
          await more.evaluate((e) => document.activeElement === e),
          true,
        );
        await more.click();
        await page
          .getByRole("menuitem", { name: "✎ 重新命名", exact: true })
          .click();
        await page
          .getByRole("textbox", { name: "名稱", exact: true })
          .fill("Renamed note");
        await page.getByRole("button", { name: "儲存", exact: true }).click();
        await page
          .getByRole("button", { name: "更多操作 Renamed note", exact: true })
          .waitFor();
        if (width === 1440) {
          const sourceId = await page.evaluate(
            async () =>
              (await window.fixtureStorage.listPages()).find(
                (p) => p.title === "Renamed note",
              ).id,
          );
          await page
            .getByRole("button", { name: "＋ 建立筆記", exact: true })
            .click();
          await page.getByText("流動頁面（無分頁）", { exact: true }).waitFor();
          await page.keyboard.press("Escape");
          await page
            .getByRole("button", { name: "更多操作 Renamed note", exact: true })
            .click();
          await page
            .getByRole("menuitem", { name: "⧉ 複製", exact: true })
            .click();
          await until(page, async () =>
            (await window.fixtureStorage.listPages()).some(
              (p) => p.title === "Renamed note copy",
            ),
          );
          const copy = await page.evaluate(async () =>
            (await window.fixtureStorage.listPages()).find(
              (p) => p.title === "Renamed note copy",
            ),
          );
          assert.notEqual(copy.id, sourceId);
          await opener.click();
          await drawer
            .getByRole("button", { name: "開啟 筆記", exact: true })
            .click();
          await page
            .getByRole("button", {
              name: "更多操作 Renamed note copy",
              exact: true,
            })
            .click();
          await page
            .getByRole("menuitem", { name: "⌫ 刪除", exact: true })
            .click();
          await page
            .getByRole("dialog", { name: "刪除", exact: true })
            .getByRole("button", { name: "取消", exact: true })
            .click();
          assert.equal(
            await page.evaluate(
              async (id) =>
                (await window.fixtureStorage.getPage(id)).deleted_at,
              copy.id,
            ),
            null,
          );
          await page
            .getByRole("button", {
              name: "更多操作 Renamed note copy",
              exact: true,
            })
            .click();
          await page
            .getByRole("menuitem", { name: "⌫ 刪除", exact: true })
            .click();
          await page
            .getByRole("dialog", { name: "刪除", exact: true })
            .getByRole("button", { name: "刪除", exact: true })
            .click();
          await until(
            page,
            async (id) =>
              !!(await window.fixtureStorage.getPage(id)).deleted_at,
            copy.id,
          );
          assert.equal(
            await page.evaluate(
              async (id) =>
                (await window.fixtureStorage.getPage(id)).deleted_at,
              sourceId,
            ),
            null,
          );
          await opener.click();
          await drawer
            .getByRole("button", { name: "開啟 字卡", exact: true })
            .click();
          await page
            .getByRole("button", {
              name: "更多操作 Sample study_set",
              exact: true,
            })
            .waitFor();
          const original = await page.evaluate(async () => {
            const p = (await window.fixtureStorage.listPages()).find(
              (p) => p.kind === "study_set",
            );
            return {
              page: p,
              snapshot: await window.fixtureStorage
                .getStudyRepository()
                .readDeck(p.id, true),
            };
          });
          await page
            .getByRole("button", {
              name: "更多操作 Sample study_set",
              exact: true,
            })
            .click();
          await page
            .getByRole("menuitem", { name: "⧉ 複製", exact: true })
            .click();
          await until(page, async () => {
            const p = (await window.fixtureStorage.listPages()).find(
              (p) => p.title === "Sample study_set copy",
            );
            if (!p) return false;
            try {
              return (
                (
                  await window.fixtureStorage
                    .getStudyRepository()
                    .readDeck(p.id)
                ).cards.length === 1
              );
            } catch {
              return false;
            }
          });
          const duplicate = await page.evaluate(async () => {
            const p = (await window.fixtureStorage.listPages()).find(
              (p) => p.title === "Sample study_set copy",
            );
            return {
              page: p,
              snapshot: await window.fixtureStorage
                .getStudyRepository()
                .readDeck(p.id, true),
            };
          });
          assert.ok(original.snapshot.events.length > 0);
          assert.notEqual(duplicate.page.id, original.page.id);
          assert.notEqual(
            duplicate.snapshot.cards[0].id,
            original.snapshot.cards[0].id,
          );
          assert.equal(duplicate.snapshot.events.length, 0);
          assert.equal(duplicate.snapshot.states[0].head, null);
          assert.equal(
            duplicate.snapshot.cards[0].front,
            original.snapshot.cards[0].front,
          );
          assert.equal(
            duplicate.snapshot.cards[0].dictionary_entry_id,
            original.snapshot.cards[0].dictionary_entry_id,
          );
          const unchanged = await page.evaluate(
            async (id) =>
              window.fixtureStorage.getStudyRepository().readDeck(id, true),
            original.page.id,
          );
          assert.deepEqual(unchanged.events, original.snapshot.events);
          assert.deepEqual(unchanged.states, original.snapshot.states);
          await opener.click();
          await drawer
            .getByRole("button", { name: "開啟 創作", exact: true })
            .click();
          assert.equal(
            await page
              .getByRole("button", { name: "世界觀", exact: true })
              .count(),
            0,
          );
          await page
            .getByRole("button", { name: "＋ 建立", exact: true })
            .click();
          await page
            .getByRole("button", { name: "世界觀", exact: true })
            .waitFor();
          await page.getByRole("button", { name: "取消", exact: true }).click();
        }
        await page.evaluate(
          () => (window.fixtureMountToken = "same-workspace"),
        );
        await opener.click();
        await drawer
          .getByRole("button", { name: "開啟 字典", exact: true })
          .click();
        await page
          .getByRole("heading", { name: "字典管理", exact: true })
          .waitFor();
        assert.equal(
          await page.evaluate(() => window.fixtureMountToken),
          "same-workspace",
        );
        await page.goto(
          `http://127.0.0.1:${server.address().port}/dictionary/admin`,
        );
        await page
          .getByRole("checkbox", { name: "🔴 匯入待審核", exact: true })
          .waitFor();
        const navs = page.getByRole("navigation", { name: "管理詞條分頁" });
        assert.equal(await navs.count(), 2);
        await navs.first().getByRole("button", { name: "下一頁" }).click();
        await navs
          .last()
          .getByRole("button", { name: "編輯第 2 頁", exact: true })
          .waitFor();
        await page
          .getByRole("checkbox", { name: "🔴 匯入待審核", exact: true })
          .check();
        await page
          .getByRole("checkbox", { name: "🟢 已發布・最新", exact: true })
          .check();
        await page.waitForFunction(
          () =>
            document.querySelectorAll("[data-dictionary-list] li").length ===
            100,
        );
        await navs.last().getByRole("button", { name: "下一頁" }).click();
        await page.waitForFunction(
          () =>
            document.querySelectorAll("[data-dictionary-list] li").length ===
            61,
        );
        assert.equal(
          await page
            .locator("[data-dictionary-list]")
            .evaluate(
              (el) =>
                getComputedStyle(el).gridTemplateColumns.split(" ").length,
            ),
          width >= 1180 ? 3 : width >= 820 ? 2 : 1,
        );
        assert.ok(
          (await page.locator("[data-dictionary-list]").textContent()).includes(
            "匯入待審核",
          ),
        );
        await navs
          .first()
          .getByRole("button", { name: "編輯第 2 頁", exact: true })
          .click();
        await navs.first().getByRole("textbox").fill("1");
        await navs.first().getByRole("textbox").press("Enter");
        await navs
          .last()
          .getByRole("button", { name: "編輯第 1 頁", exact: true })
          .waitFor();
        await page
          .getByRole("textbox", { name: "搜尋管理詞條", exact: true })
          .fill("entry 000");
        await page.waitForFunction(
          () =>
            document.querySelectorAll("[data-dictionary-list] li").length === 7,
        );
        assert.equal(
          await page
            .getByRole("checkbox", { name: "🔴 匯入待審核", exact: true })
            .isChecked(),
          true,
        );
        assert.ok(
          (await page.evaluate(() => window.rpcCalls)).every(
            (c) =>
              ![
                "publish_dictionary_bulk",
                "apply_dictionary_drafts",
                "stage_dictionary_import_reviews",
              ].includes(c.name),
          ),
        );

        if (width === 390) {
          await opener.click();
          await drawer
            .getByRole("button", { name: "帳號與同步", exact: true })
            .waitFor();
          await drawer.locator("button").filter({ hasText: "⚙" }).click();
          await page.getByRole("button", { name: "設定", exact: true }).click();
          const settingsDialog = page.getByRole("dialog", {
            name: "設定",
            exact: true,
          });
          await settingsDialog
            .getByRole("combobox", { name: "語言", exact: true })
            .selectOption("en");
          await page
            .getByRole("button", { name: "Close settings", exact: true })
            .click();
          await page.keyboard.press("Escape");
          await page
            .getByRole("checkbox", {
              name: "🔴 Import review pending",
              exact: true,
            })
            .waitFor();
          await page
            .getByRole("button", {
              name: "Open unreviewed entries",
              exact: true,
            })
            .waitFor();
          await page
            .getByRole("button", { name: "Open navigation", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Account and sync", exact: true })
            .waitFor();
          await page.keyboard.press("Escape");
        }
        await context.close();
      }
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      await new Promise((r) => server.close(r));
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  },
);
