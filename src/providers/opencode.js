// opencode 数据源：只读读取 ~/.local/share/opencode/opencode.db
const fs = require('fs');
const os = require('os');
const path = require('path');

function defaultDbPath() {
  const candidates = [];
  if (process.env.XDG_DATA_HOME) candidates.push(path.join(process.env.XDG_DATA_HOME, 'opencode', 'opencode.db'));
  candidates.push(path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db'));
  if (process.env.LOCALAPPDATA) candidates.push(path.join(process.env.LOCALAPPDATA, 'opencode', 'opencode.db'));
  if (process.env.APPDATA) candidates.push(path.join(process.env.APPDATA, 'opencode', 'opencode.db'));
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

function openDb(dbPath) {
  const { DatabaseSync } = require('node:sqlite');
  // 只读打开；opencode 使用 WAL 模式，只读连接仍可看到 WAL 中未合并的最新数据
  return new DatabaseSync(dbPath, { readOnly: true });
}

function tableExists(db, name) {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * 读取所有 assistant 消息的用量记录。
 * 新版 opencode 写入 session_message(type='assistant')，旧版写入 message(role='assistant')。
 * 两表可能有重叠（迁移），按 id 去重，优先新表。
 */
function readRecords(dbPath, sinceMs = 0) {
  const db = openDb(dbPath);
  try {
    const records = new Map();

    const pushRow = (r) => {
      if (records.has(r.id)) return;
      const input = num(r.input), output = num(r.output), reasoning = num(r.reasoning);
      const cacheRead = num(r.cache_read), cacheWrite = num(r.cache_write);
      const total = input + output + reasoning + cacheRead + cacheWrite;
      if (total === 0 && num(r.cost) === 0) return; // 未完成/中断的消息
      records.set(r.id, {
        id: `opencode:${r.id}`,
        client: 'opencode',
        sessionId: r.session_id,
        time: num(r.time_created),
        provider: r.provider || 'unknown',
        model: r.model || 'unknown',
        agent: r.agent || '',
        input, output, reasoning, cacheRead, cacheWrite, total,
        cost: num(r.cost),
      });
    };

    if (tableExists(db, 'session_message')) {
      const rows = db.prepare(`
        SELECT id, session_id, time_created,
          json_extract(data,'$.model.providerID') AS provider,
          json_extract(data,'$.model.id') AS model,
          json_extract(data,'$.agent') AS agent,
          json_extract(data,'$.cost') AS cost,
          json_extract(data,'$.tokens.input') AS input,
          json_extract(data,'$.tokens.output') AS output,
          json_extract(data,'$.tokens.reasoning') AS reasoning,
          json_extract(data,'$.tokens.cache.read') AS cache_read,
          json_extract(data,'$.tokens.cache.write') AS cache_write
        FROM session_message
        WHERE type='assistant' AND time_created >= ?`).all(sinceMs);
      rows.forEach(pushRow);
    }

    if (tableExists(db, 'message')) {
      const rows = db.prepare(`
        SELECT id, session_id, time_created,
          json_extract(data,'$.providerID') AS provider,
          json_extract(data,'$.modelID') AS model,
          json_extract(data,'$.agent') AS agent,
          json_extract(data,'$.cost') AS cost,
          json_extract(data,'$.tokens.input') AS input,
          json_extract(data,'$.tokens.output') AS output,
          json_extract(data,'$.tokens.reasoning') AS reasoning,
          json_extract(data,'$.tokens.cache.read') AS cache_read,
          json_extract(data,'$.tokens.cache.write') AS cache_write
        FROM message
        WHERE json_extract(data,'$.role')='assistant' AND time_created >= ?`).all(sinceMs);
      rows.forEach(pushRow);
    }

    // 会话标题 / 目录
    const sessions = new Map();
    for (const t of ['session', 'session_v2']) {
      if (!tableExists(db, t)) continue;
      for (const s of db.prepare(`SELECT id, title, directory, parent_id FROM ${t}`).all()) {
        sessions.set(s.id, { title: s.title || '', directory: s.directory || '', parentId: s.parent_id || null });
      }
    }

    return { records: [...records.values()], sessions };
  } finally {
    db.close();
  }
}

/** 用于检测数据变化：db 与 wal 文件的 mtime+size */
function fingerprint(dbPath) {
  const parts = [];
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
  id: 'opencode',
  name: 'opencode',
  defaultDbPath,
  readRecords,
  fingerprint,
};
