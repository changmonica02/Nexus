async function navigateLife(page, name) {
  if (name === '計時工具') { await page.evaluate(() => window.showLifeTools()); return; }
  const children = ['行程', '重要日期', '任務', '習慣', 'Tasks'];
  const target = children.includes(name) ? name==='Tasks'?'Calendar':'日曆' : name;
  const tab = page.getByRole('tab', { name: target, exact: true });
  if (!await tab.isVisible()) {
    const toggle = page.locator('.life-nav-toggle');
    await toggle.waitFor();
    if (await toggle.getAttribute('aria-expanded') !== 'true') await toggle.click();
  }
  await tab.click();
  if (children.includes(name)) {
    if (!await page.getByRole('region', { name: '日曆事項管理', exact: true }).isVisible()) await page.getByRole('button', { name: '管理', exact: true }).click();
    await page.getByRole('group', { name: '管理類型', exact: true }).getByRole('button', { name: name === '習慣' ? '任務' : name, exact: true }).click();
  }
}
module.exports = { navigateLife };
