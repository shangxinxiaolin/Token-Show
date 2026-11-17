const assert = require('node:assert/strict');
const { aggregate } = require('../src/aggregate');

const now = Date.now();
const rec = (model, total, cost, time) => ({
  id: `${model}-${time}-${total}`, client: 'demo', provider: 'provider', model, sessionId: 's',
  time, input: total, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total, cost,
});
const records = [
  rec('model-a', 100, 0.1, now - 1000),
  rec('model-a', 50, 0.05, now - 2000),
  rec('model-b', 30, 0.03, now - 3000),
];
const data = aggregate(records, new Map(), '7d');

assert.equal(data.summary.total, 180);
assert.equal(data.summary.cost.toFixed(2), '0.18');
assert.equal(data.byModel.length, 2);

const todayPoint = data.series.find((p) => p.total > 0);
assert.ok(todayPoint.models, 'series buckets expose per-model totals');
const keyA = 'demo/provider/model-a';
const keyB = 'demo/provider/model-b';
assert.equal(todayPoint.models[keyA], 150);
assert.equal(todayPoint.models[keyB], 30);
assert.equal(todayPoint.modelReq[keyA], 2);
assert.equal(todayPoint.modelCost[keyA].toFixed(2), '0.15');
const modelSum = Object.values(todayPoint.models).reduce((n, v) => n + v, 0);
assert.equal(modelSum, todayPoint.total, 'stacked model values add up to the bar total');

console.log('PASS: per-day model breakdown adds up to totals (tokens, requests, cost)');
