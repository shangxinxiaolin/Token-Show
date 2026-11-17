// 将原始用量记录聚合为仪表盘所需数据
const DAY = 86400000;

function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function rangeStart(range, now = Date.now()) {
  switch (range) {
    case 'today': return startOfDay(now);
    case '7d': return startOfDay(now) - 6 * DAY;
    case '30d': return startOfDay(now) - 29 * DAY;
    case '90d': return startOfDay(now) - 89 * DAY;
    default: return 0;
  }
}

function emptyStat() {
  return {
    input: 0, output: 0, reasoning: 0, cacheRead: 0, cacheWrite: 0, total: 0, cost: 0, requests: 0,
    clients: {}, clientReq: {}, clientCost: {},
  };
}

// 按模型拆分时间桶：同一根柱子可堆叠多个模型
function addModel(stat, r) {
  const key = `${r.client || ''}/${r.provider || ''}/${r.model || ''}`;
  if (!stat.models) { stat.models = {}; stat.modelReq = {}; stat.modelCost = {}; }
  stat.models[key] = (stat.models[key] || 0) + r.total;
  stat.modelReq[key] = (stat.modelReq[key] || 0) + 1;
  stat.modelCost[key] = (stat.modelCost[key] || 0) + r.cost;
}

function add(stat, r) {
  stat.input += r.input;
  stat.output += r.output;
  stat.reasoning += r.reasoning;
  stat.cacheRead += r.cacheRead;
  stat.cacheWrite += r.cacheWrite;
  stat.total += r.total;
  stat.cost += r.cost;
  stat.requests += 1;
  const client = r.client || 'unknown';
  stat.clients[client] = (stat.clients[client] || 0) + r.total;
  stat.clientReq[client] = (stat.clientReq[client] || 0) + 1;
  stat.clientCost[client] = (stat.clientCost[client] || 0) + r.cost;
}

function pad(n) { return String(n).padStart(2, '0'); }
function dayKey(t) { const d = new Date(t); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function hourKey(t) { return `${pad(new Date(t).getHours())}:00`; }

function aggregate(records, sessions, range, opts = {}) {
  const now = Date.now();
  const start = rangeStart(range, now);
  const inRange = records.filter((r) => r.time >= start);
  const hourly = range === 'today';

  // 概览
  const summary = emptyStat();
  inRange.forEach((r) => add(summary, r));

  const todayStat = emptyStat();
  const t0 = startOfDay(now);
  records.forEach((r) => { if (r.time >= t0) add(todayStat, r); });

  // 时间序列
  const buckets = new Map();
  if (hourly) {
    for (let h = 0; h < 24; h++) buckets.set(`${pad(h)}:00`, emptyStat());
  } else {
    const first = start || (inRange.length ? startOfDay(Math.min(...inRange.map((r) => r.time))) : t0);
    for (let t = first; t <= now; t += DAY) buckets.set(dayKey(t), emptyStat());
  }
  inRange.forEach((r) => {
    const k = hourly ? hourKey(r.time) : dayKey(r.time);
    if (!buckets.has(k)) buckets.set(k, emptyStat());
    add(buckets.get(k), r);
    addModel(buckets.get(k), r);
  });
  const series = [...buckets.entries()].map(([label, s]) => ({ label, ...s }));

  // 按客户端
  const byClientMap = new Map();
  inRange.forEach((r) => {
    const k = r.client || 'unknown';
    if (!byClientMap.has(k)) byClientMap.set(k, { id: k, ...emptyStat() });
    add(byClientMap.get(k), r);
  });
  const byClient = [...byClientMap.values()].sort((a, b) => b.total - a.total);

  // 按模型（同一模型在不同客户端分开统计）
  const byModelMap = new Map();
  inRange.forEach((r) => {
    const client = r.client || '';
    const k = `${client}/${r.provider}/${r.model}`;
    if (!byModelMap.has(k)) byModelMap.set(k, { key: k, client, provider: r.provider, model: r.model, ...emptyStat() });
    add(byModelMap.get(k), r);
  });
  const byModel = [...byModelMap.values()].sort((a, b) => b.total - a.total);

  // 按会话（子会话归入父会话）
  const bySessionMap = new Map();
  inRange.forEach((r) => {
    const client = r.client || '';
    let sid = r.sessionId;
    let key = `${client}:${sid}`;
    let s = sessions.get(key);
    while (s && s.parentId && sessions.has(`${client}:${s.parentId}`)) {
      sid = s.parentId;
      key = `${client}:${sid}`;
      s = sessions.get(key);
    }
    if (!bySessionMap.has(key)) {
      bySessionMap.set(key, {
        id: key, client, title: s?.title || sid,
        directory: s?.directory || '', last: 0, ...emptyStat(),
      });
    }
    const e = bySessionMap.get(key);
    add(e, r);
    if (r.time > e.last) e.last = r.time;
  });
  const bySession = [...bySessionMap.values()].sort((a, b) => b.total - a.total).slice(0, opts.sessionLimit || 50);

  // 最近请求
  const recent = [...inRange].sort((a, b) => b.time - a.time).slice(0, opts.recentLimit || 100).map((r) => ({
    ...r,
    sessionTitle: sessions.get(`${r.client || ''}:${r.sessionId}`)?.title || r.sessionId,
  }));

  return { range, start, generatedAt: now, summary, today: todayStat, series, byClient, byModel, bySession, recent, hourly };
}

module.exports = { aggregate, rangeStart };
