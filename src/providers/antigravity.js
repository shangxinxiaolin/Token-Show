// Antigravity (反重力) 数据源：读取 ~/.gemini/antigravity-cli
const fs = require('fs');
const os = require('os');
const path = require('path');

function defaultDbPath() {
  return path.join(os.homedir(), '.gemini', 'antigravity-cli');
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function readRecords(agyDir, sinceMs = 0) {
  const { DatabaseSync } = require('node:sqlite');
  const dbPath = path.join(agyDir, 'conversation_summaries.db');
  const brainDir = path.join(agyDir, 'brain');

  const records = [];
  const sessions = new Map();

  if (!fs.existsSync(dbPath)) {
    return { records, sessions };
  }

  // 1. 读取所有会话信息
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const convRows = db.prepare('SELECT conversation_id, title, workspace_uris, last_modified_time FROM conversation_summaries').all();
    for (const row of convRows) {
      let dir = '';
      try {
        const uris = JSON.parse(row.workspace_uris || '[]');
        if (uris[0]) dir = uris[0].replace(/^file:\/\/\/?/, '').replace(/\//g, '\\');
      } catch {}
      sessions.set(row.conversation_id, {
        title: row.title || row.conversation_id,
        directory: dir,
        parentId: null
      });
    }
  } catch (e) {
    console.error('Error reading agy conversation_summaries.db:', e);
  } finally {
    try { db.close(); } catch {}
  }

  // 读取默认设置中的模型
  let defaultModel = 'Gemini 3.8 Flash';
  try {
    const sJson = JSON.parse(fs.readFileSync(path.join(agyDir, 'settings.json'), 'utf8'));
    if (sJson.model) defaultModel = sJson.model;
  } catch {}

  // 2. 读取每个会话中的 transcript.jsonl
  for (const [convId] of sessions.entries()) {
    const transcriptFile = path.join(brainDir, convId, '.system_generated', 'logs', 'transcript.jsonl');
    if (!fs.existsSync(transcriptFile)) continue;

    let content = '';
    try {
      content = fs.readFileSync(transcriptFile, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    let currentModel = defaultModel;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line || !line.trim()) continue;

      try {
        const o = JSON.parse(line);

        // 检测模型切换
        if (o.type === 'USER_INPUT' && o.content) {
          const match = o.content.match(/Model Selection` from .*? to (.*?)\./);
          if (match) currentModel = match[1].trim();
        }

        // 仅抓取大模型生成步骤
        if (o.type === 'PLANNER_RESPONSE' && o.source === 'MODEL') {
          const time = o.created_at ? new Date(o.created_at).getTime() : 0;
          if (sinceMs && time < sinceMs) continue;

          const input = num(o.input_tokens);
          const output = num(o.output_tokens);
          const cacheRead = num(o.cache_read_tokens);
          const cacheWrite = num(o.cache_write_tokens);
          const total = input + output + cacheRead + cacheWrite;

          if (total === 0) continue;

          records.push({
            id: `agy:${convId}:${o.step_index ?? i}`,
            client: 'antigravity',
            sessionId: convId,
            time,
            provider: 'Antigravity',
            model: currentModel,
            agent: 'planner',
            input,
            output,
            reasoning: 0,
            cacheRead,
            cacheWrite,
            total,
            cost: 0
          });
        }
      } catch {}
    }
  }

  return { records, sessions };
}

function fingerprint(agyDir) {
  const parts = [];
  const dbPath = path.join(agyDir, 'conversation_summaries.db');
  for (const f of [dbPath, dbPath + '-wal']) {
    try {
      const st = fs.statSync(f);
      parts.push(`${st.mtimeMs}:${st.size}`);
    } catch {
      parts.push('-');
    }
  }
  return parts.join('|');
}

module.exports = {
  id: 'antigravity',
  name: 'Antigravity (反重力)',
  defaultDbPath,
  readRecords,
  fingerprint,
};
