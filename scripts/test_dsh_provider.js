const dsh = require('../src/providers/dsh');
const { aggregate } = require('../src/aggregate');

const p = dsh.defaultDbPath();
console.log('DSH path:', p);
const t0 = Date.now();
const { records, sessions } = dsh.readRecords(p);
console.log(`Read ${records.length} records, ${sessions.size} sessions in ${Date.now() - t0}ms`);

for (const r of ['today', '7d', 'all']) {
  const a = aggregate(records, sessions, r);
  console.log(`[${r}] total: ${a.summary.total}, requests: ${a.summary.requests}, input: ${a.summary.input}, output: ${a.summary.output}, cacheRead: ${a.summary.cacheRead}, models: ${a.byModel.length}`);
}
