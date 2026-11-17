// DeepSeek Harness 数据源：读取 ~/.dsh/sessions/*/*/session.v4.jsonl.zstd 及 projcache
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

function defaultDbPath() {
  const dshHome = process.env.DSH_HOME || path.join(os.homedir(), '.dsh');
  return dshHome;
}

// 多帧 zstd 解压缩算法
function decompressMultiZstd(buf) {
  const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
  const offsets = [];
  let idx = 0;
  while ((idx = buf.indexOf(magic, idx)) !== -1) {
    offsets.push(idx);
    idx += 4;
  }
  const out = [];
  let i = 0;
  while (i < offsets.length) {
    let j = i + 1;
    let decoded = null;
    while (j <= offsets.length) {
      const end = j < offsets.length ? offsets[j] : buf.length;
      try {
        decoded = zlib.zstdDecompressSync(buf.subarray(offsets[i], end));
        break;
      } catch (e) {
        j++;
      }
    }
    if (decoded) {
      out.push(decoded);
      i = j;
    } else {
      i++;
    }
  }
  return Buffer.concat(out).toString('utf8');
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function readRecords(dshPath, sinceMs = 0) {
  if (typeof zlib.zstdDecompressSync !== 'function') throw new Error('当前运行环境不支持 Zstandard 解压');
  const root = path.join(dshPath, 'sessions');
  const cacheRoot = path.join(dshPath, 'storages', 'session_projcache', 'sessions');
  const records = [];
  const sessions = new Map();

  // 读取会话元数据（标题、目录等）
  if (fs.existsSync(cacheRoot)) {
    try {
      const cacheFiles = fs.readdirSync(cacheRoot);
      for (const cf of cacheFiles) {
        if (!cf.endsWith('.json')) continue;
        try {
          const cdata = JSON.parse(fs.readFileSync(path.join(cacheRoot, cf), 'utf8'));
          const rec = cdata.record;
          const sid = cf.replace(/\.json$/, '');
          const title = rec?.rows?.title?.val || rec?.rows?.subagent?.val?.identity?.label || sid;
          const directory = rec?.rows?.workingDirectory?.val || rec?.identity?.cwd || '';
          sessions.set(sid, { title, directory, parentId: null });
        } catch {}
      }
    } catch {}
  }

  if (!fs.existsSync(root)) {
    return { records, sessions };
  }

  // 遍历项目与会话
  const projDirs = fs.readdirSync(root);
  for (const proj of projDirs) {
    const pdir = path.join(root, proj);
    if (!fs.statSync(pdir).isDirectory()) continue;
    const sessionDirs = fs.readdirSync(pdir);

    for (const s of sessionDirs) {
      const sFile = path.join(pdir, s, 'session.v4.jsonl.zstd');
      if (!fs.existsSync(sFile)) continue;

      let text = '';
      try {
        text = decompressMultiZstd(fs.readFileSync(sFile));
      } catch (e) {
        continue;
      }

      const lines = text.split('\n');
      for (const l of lines) {
        if (!l || !l.includes('"assistant/message"')) continue;
        try {
          const o = JSON.parse(l);
          if (o.type !== 'assistant/message') continue;
          const time = num(o.time);
          if (sinceMs && time < sinceMs) continue;

          const u = o.data?.usage;
          if (!u) continue;

          const input = num(u.inputTokens);
          const output = num(u.outputTokens);
          const cacheRead = num(u.cacheReadTokens);
          const cacheWrite = num(u.cacheWriteTokens);
          const total = num(u.totalTokens) || (input + output + cacheRead + cacheWrite);

          const src = o.data?.message?.source;
          const provider = src?.provider || 'dsh';
          const model = src?.model || 'unknown';
          const id = o.data?.id || `dsh_${s}_${o.seq || time}`;

          records.push({
            id: `dsh:${id}`,
            client: 'dsh',
            sessionId: s,
            time,
            provider,
            model,
            agent: 'dsh',
            input,
            output,
            reasoning: 0,
            cacheRead,
            cacheWrite,
            total,
            cost: 0 // DSH 会话中未直接附带单次计费，保持 0 或由价格表匹配
          });
        } catch {}
      }
    }
  }

  return { records, sessions };
}

function fingerprint(dshPath) {
  const parts = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && (entry.name === 'session.v4.jsonl.zstd' || entry.name.endsWith('.json'))) {
        const st = fs.statSync(file);
        parts.push(`${file}:${st.size}:${st.mtimeMs}`);
      }
    }
  }
  walk(path.join(dshPath, 'sessions'));
  walk(path.join(dshPath, 'storages', 'session_projcache', 'sessions'));
  return parts.sort().join('|') || '-';
}

module.exports = {
  id: 'dsh',
  name: 'DeepSeek Harness',
  defaultDbPath,
  readRecords,
  fingerprint,
};
