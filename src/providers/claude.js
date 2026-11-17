const path = require('path');
const os = require('os');
const { files, rows, fingerprint, num } = require('./jsonl');

const defaultDbPath = () => path.join(process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'), 'projects');
function readRecords(root) {
  const records = new Map(), sessions = new Map();
  for (const file of files(root)) {
    for (const o of rows(file)) {
      const sid = o.sessionId || path.basename(file, '.jsonl');
      const s = sessions.get(sid) || { title: sid, directory: '', parentId: null };
      if (o.cwd) s.directory = o.cwd;
      if (o.type === 'summary' && o.summary) s.title = o.summary;
      if (o.type === 'user' && s.title === sid && typeof o.message?.content === 'string') s.title = o.message.content.slice(0, 120);
      sessions.set(sid, s);
      const u = o.message?.usage;
      if (o.type !== 'assistant' || !u) continue;
      const input = num(u.input_tokens), output = num(u.output_tokens);
      const cacheRead = num(u.cache_read_input_tokens), cacheWrite = num(u.cache_creation_input_tokens);
      const total = input + output + cacheRead + cacheWrite;
      if (!total) continue;
      const id = `claude:${sid}:${o.message.id || o.uuid}`;
      // Streaming chunks share message.id; retain the most complete usage snapshot.
      if ((records.get(id)?.total || 0) > total) continue;
      records.set(id, { id, client: 'claude', sessionId: sid, time: Date.parse(o.timestamp) || 0,
        provider: 'Anthropic', model: o.message.model || 'unknown', agent: 'claude',
        input, output, reasoning: 0, cacheRead, cacheWrite, total, cost: 0 });
    }
  }
  return { records: [...records.values()], sessions };
}
module.exports = { id: 'claude', name: 'Claude Code', defaultDbPath, readRecords, fingerprint };
