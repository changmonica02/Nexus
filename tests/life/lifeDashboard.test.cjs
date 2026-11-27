require("../loadStudy.cjs");
require("fake-indexeddb/auto");
const test = require("node:test");
const assert = require("node:assert/strict");
const { IndexedDBAdapter } = require("../../src/infrastructure/storage/IndexedDBAdapter.ts");
const { initialConfig, newCard, moveCard, selectTasks, dashboardSettingsKey } = require("../../src/features/life/dashboard/model.ts");

test("card instances retain independent settings and respect civil dates and status", () => {
  const today = new Date(2026, 10, 26);
  const first = { ...newCard("calendar"), period: "week" };
  const second = { ...first, id: crypto.randomUUID(), period: "month", size: "large", status: "pending" };
  const pages = [
    { id: "older", due_date: new Date(2026, 10, 25).getTime() },
    { id: "today", due_date: today.getTime() },
    { id: "done", due_date: today.getTime(), completed: true },
    { id: "undated", due_date: null },
    { id: "next-month", due_date: new Date(2026, 11, 1).getTime() },
    { id: "week-end", due_date: new Date(2026, 11, 3).getTime() },
  ];
  assert.deepEqual(selectTasks(pages, first, today, today).map(page => page.id), ["today", "done", "next-month"]);
  assert.deepEqual(selectTasks(pages, second, today, today).map(page => page.id), ["older", "today"]);
  assert.deepEqual(selectTasks(pages, { ...newCard("tasks"), status: "overdue" }, today, today).map(page => page.id), ["older"]);
  assert.deepEqual(moveCard([first, second], second.id, first.id), [second, first]);
});

test("dashboard persistence and backups isolate workspace owners and retain legacy backups", async () => {
  const storage = new IndexedDBAdapter();
  await storage.init();
  try {
    const ownerA = crypto.randomUUID(), ownerB = crypto.randomUUID();
    storage.setWorkspaceOwner(ownerA);
    const repoA = storage.getLifeRepository();
    const config = initialConfig();
    config.boards[0].name = "A 的儀表板";
    config.hiddenModules = ["lists"];
    config.boards.push({ id: "b", name: "學業", cards: [newCard("lists")] });
    config.defaultId = "b";
    await repoA.saveDashboard(config);
    storage.setWorkspaceOwner(ownerB);
    const repoB = storage.getLifeRepository();
    assert.equal(await repoB.readDashboard(), undefined);
    await assert.rejects(repoA.saveDashboard(config), /帳號已切換/);
    const second = initialConfig();
    await repoB.saveDashboard(second);

    storage.setWorkspaceOwner(ownerA);
    const backup = await storage.exportWorkspaceBackup();
    assert.ok(backup.settings.some(setting => setting.key === dashboardSettingsKey(ownerA)));
    assert.ok(!backup.settings.some(setting => setting.key === dashboardSettingsKey(ownerB)));
    await repoA.saveDashboard(initialConfig());
    await storage.importWorkspaceBackup(backup);
    assert.deepEqual(await repoA.readDashboard(), config);
    await storage.importWorkspaceBackup({ ...backup, settings: [] });
    assert.deepEqual(await repoA.readDashboard(), config);
    storage.setWorkspaceOwner(ownerB);
    assert.deepEqual(await storage.getLifeRepository().readDashboard(), second);
  } finally {
    await storage.close();
  }
});
