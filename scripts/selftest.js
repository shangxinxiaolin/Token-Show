const p = require('../src/providers/opencode');
const { aggregate } = require('../src/aggregate');
console.log('node', process.versions.node, 'electron', process.versions.electron);
const db = p.defaultDbPath();
console.log('db', db);
let t = Date.now();
const { records, sessions } = p.readRecords(db);
console.log('records', records.length, 'sessions', sessions.size, 'ms', Date.now() - t);
t = Date.now();
for (const r of ['today', '7d', 'all']) {
  const a = aggregate(records, sessions, r);
  console.log(r, JSON.stringify(a.summary), 'models', a.byModel.length, 'series', a.series.length, 'top session:', a.bySession[0]?.title);
}
console.log('agg ms', Date.now() - t);
