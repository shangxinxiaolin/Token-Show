const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const claude = require('../src/providers/claude');
const codex = require('../src/providers/codex');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'token-providers-'));
const write = (file, rows) => fs.writeFileSync(file, rows.map(JSON.stringify).join('\n') + '\n{');
try {
  const c = path.join(root, 'projects'); fs.mkdirSync(c);
  const row = (output) => ({ type: 'assistant', sessionId: 's', timestamp: new Date().toISOString(), message: { id: 'm', model: 'claude', usage: { input_tokens: 10, output_tokens: output, cache_read_input_tokens: 20, cache_creation_input_tokens: 5 } } });
  write(path.join(c, 'a.jsonl'), [row(1), row(4)]);
  let got = claude.readRecords(c);
  assert.equal(got.records.length, 1); assert.equal(got.records[0].total, 39);
  const d = path.join(root, 'sessions'); fs.mkdirSync(d);
  const usage = (input, output) => ({ timestamp: `${input}`, type: 'event_msg', payload: { type: 'token_count', info: { total_token_usage: { input_tokens: input, cached_input_tokens: input / 2, output_tokens: output, reasoning_output_tokens: output / 2 } } } });
  write(path.join(d, 'a.jsonl'), [{ type: 'session_meta', payload: { id: 's', cwd: '/project' } }, { type: 'turn_context', payload: { model: 'gpt-test' } }, usage(100, 20), usage(100, 20), usage(160, 40)]);
  got = codex.readRecords(root);
  assert.equal(got.records.length, 2);
  assert.equal(got.records.reduce((n, r) => n + r.total, 0), 200);
  for (const r of got.records) assert.equal(r.total, r.input + r.output + r.reasoning + r.cacheRead + r.cacheWrite);
  assert.equal(got.records[1].model, 'gpt-test');
  const fp = codex.fingerprint(root);
  fs.appendFileSync(path.join(d, 'a.jsonl'), '\n');
  assert.notEqual(codex.fingerprint(root), fp);
  console.log('PASS: Claude streaming dedup; Codex cumulative deltas, cache/reasoning totals; partial logs; change detection');
} finally { fs.rmSync(root, { recursive: true, force: true }); }
