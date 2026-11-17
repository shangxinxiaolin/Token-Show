const path = require('path');
const os = require('os');
const { files, rows, fingerprint, num } = require('./jsonl');

const defaultDbPath = () => process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
function logFiles(root) {
  return path.basename(root) === 'sessions' || path.basename(root) === 'archived_sessions'
    ? files(root) : [...files(path.join(root, 'sessions')), ...files(path.join(root, 'archived_sessions'))];
}
function readRecords(root) {
  const records = new Map(), sessions = new Map();
  const keys = ['input_tokens', 'cached_input_tokens', 'cache_write_input_tokens', 'output_tokens', 'reasoning_output_tokens'];
  for (const file of logFiles(root)) {
    let sid = path.basename(file, '.jsonl'), model = 'unknown', provider = 'OpenAI', previous = null;
    const meta = { title: sid, directory: '', parentId: null };
    for (const o of rows(file)) {
      const p = o.payload || {};
      if (o.type === 'session_meta') {
        sid = p.id || sid; meta.title = sid; meta.directory = p.cwd || '';
        provider = p.model_provider || provider;
      }
      if (o.type === 'turn_context') model = p.model || model;
      if (p.type === 'user_message' && meta.title === sid && typeof p.message === 'string') meta.title = p.message.slice(0, 120);
      if (o.type !== 'event_msg' || p.type !== 'token_count' || !p.info?.total_token_usage) continue;
      const current = p.info.total_token_usage;
      if (previous && keys.every((k) => num(current[k]) === num(previous[k]))) continue;
      const reset = previous && (num(current.input_tokens) < num(previous.input_tokens) || num(current.output_tokens) < num(previous.output_tokens));
      const usage = Object.fromEntries(keys.map((k) => [k, reset ? num(p.info.last_token_usage?.[k]) : Math.max(0, num(current[k]) - num(previous?.[k]))]));
      previous = current;
      const cacheRead = Math.min(usage.cached_input_tokens, usage.input_tokens);
      const cacheWrite = Math.min(usage.cache_write_input_tokens, usage.input_tokens - cacheRead);
      const reasoning = Math.min(usage.reasoning_output_tokens, usage.output_tokens);
      const input = usage.input_tokens - cacheRead - cacheWrite;
      const output = usage.output_tokens - reasoning;
      const total = usage.input_tokens + usage.output_tokens;
      if (!total) continue;
      const id = `codex:${sid}:${o.timestamp}:${keys.map((k) => num(current[k])).join(':')}`;
      records.set(id, { id, client: 'codex', sessionId: sid, time: Date.parse(o.timestamp) || 0,
        provider, model, agent: 'codex', input, output, reasoning, cacheRead, cacheWrite, total, cost: 0 });
    }
    sessions.set(sid, meta);
  }
  return { records: [...records.values()], sessions };
}
function logFingerprint(root) {
  if (['sessions', 'archived_sessions'].includes(path.basename(root))) return fingerprint(root);
  return fingerprint(path.join(root, 'sessions')) + '|' + fingerprint(path.join(root, 'archived_sessions'));
}
module.exports = { id: 'codex', name: 'Codex', defaultDbPath, readRecords, fingerprint: logFingerprint };
