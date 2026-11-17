const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const api = {};
new Function('exports', ts.transpileModule(fs.readFileSync('src/lib/pullToRefresh.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(api);

test('ordinary pulls and fast long swipes do not arm refresh', () => {
  assert.equal(api.measureRefreshPull(0, 120, 900).ready, false);
  assert.equal(api.measureRefreshPull(0, 300, 150).ready, false);
  assert.equal(api.measureRefreshPull(0, 260, 700).ready, true);
});
test('horizontal, upward and withdrawn gestures cancel refresh', () => {
  assert.equal(api.measureRefreshPull(180, 150, 900).cancelled, true);
  assert.equal(api.measureRefreshPull(0, -20, 900).cancelled, true);
  assert.equal(api.measureRefreshPull(0, 270, 900).ready, true);
  assert.equal(api.measureRefreshPull(0, 100, 1000).ready, false);
});
