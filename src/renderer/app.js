/* global Chart */
window.addEventListener('error', (event) => {
  console.error('[window]', event.message, `${event.filename}:${event.lineno}:${event.colno}`, event.error && event.error.stack);
});
const $ = (s) => document.querySelector(s);
const CLIENTS = [
  { id: 'opencode', name: 'opencode', short: 'OC', mark: 'O', color: '#3b82c4' },
  { id: 'dsh', name: 'DeepSeek Harness', short: 'DSH', mark: 'D', color: '#7c6bb5' },
  { id: 'antigravity', name: 'Antigravity', short: 'AGY', mark: 'A', color: '#c9842a' },
  { id: 'claude', name: 'Claude Code', short: 'CC', mark: 'C', color: '#c46c4e' },
  { id: 'codex', name: 'Codex', short: 'CX', mark: 'X', color: '#329985' },
];
const MODEL_COLORS = ['#22c55e', '#38bdf8', '#a78bfa', '#fbbf24', '#fb7185', '#2dd4bf', '#f97316', '#94a3b8'];

const I18N = {
  zh: {
    mission: '用量工作台', missionHint: '选择客户端，查看每一次调用的消耗。', localData: '本地数据', selectedClient: '已选择', selectClient: '切换查看',
    today: '今天', d7: '7 天', d30: '30 天', d90: '90 天', all: '全部',
    live: '实时', day: '白天', night: '夜间', langName: '简体中文',
    console: '用量控制台', navOverview: '概览', navModels: '模型', navSessions: '会话', navRecent: '最近请求',
    watching: '个客户端', allClients: '全部客户端',
    tokens: 'Token', cost: '费用', requests: '请求',
    clientShare: 'Token 构成', byModel: '按模型', bySession: '按会话（Top 50）', recent: '最近请求',
    trendTokens: 'Token 趋势 · 按模型', trendCost: '费用趋势 · 按模型', trendReq: '请求趋势 · 按模型',
    overview: '概览', settings: '设置',
    settingsHint: '自动检测当前用户的客户端日志。路径留空使用默认目录；筛选决定显示哪些用量。',
    pin: '窗口置顶', tray: '关闭窗口时最小化到托盘',
    openData: '打开数据位置', cancel: '取消', save: '保存', browse: '浏览',
    refresh: '刷新', settingsBtn: '设置',
    total: '总 Token', io: '输入 / 输出', out: '输出', reason: '推理',
    cache: '缓存读取', hit: '命中率', write: '写入',
    costNote: '仅 opencode 记录费用', avg: '均', per: '/ 次',
    todayCard: '今日', times: '次', none: '无数据', empty: '当前客户端在此时间范围没有记录，请切换「全部」查看历史用量。',
    emptyRange: '当前时间范围没有 {client} 的用量记录。切换到「全部」可查看历史记录。',
    noCost: '该客户端没有记录费用。\nDeepSeek Harness、Claude Code、Codex 的日志不含账单金额。',
    noUsage: '所选时间范围没有用量记录。',
    otherModels: '其他模型',
    colClientModel: '客户端 / 模型', colReq: '请求', colIn: '输入', colOut: '输出', colReason: '推理',
    colCacheR: '缓存读', colCacheW: '缓存写', colTotal: '总计', colShare: '占比', colCost: '费用',
    colSession: '会话', colLast: '最近活动', colTime: '时间', colClient: '客户端', colModel: '模型',
    updated: '更新于', records: '条', missing: '未找到', notFound: '未找到',
    clients: '客户端筛选', range: '时间范围', metric: '趋势指标', lang: '语言', theme: '外观',
  },
  en: {
    mission: 'Usage workbench', missionHint: 'Choose a client to explore usage, one request at a time.', localData: 'Local data', selectedClient: 'Selected', selectClient: 'View usage',
    today: 'Today', d7: '7d', d30: '30d', d90: '90d', all: 'All',
    live: 'Live', day: 'Day', night: 'Night', langName: 'English',
    console: 'Usage console', navOverview: 'Overview', navModels: 'Models', navSessions: 'Sessions', navRecent: 'Recent',
    watching: 'clients', allClients: 'All clients',
    tokens: 'Tokens', cost: 'Cost', requests: 'Requests',
    clientShare: 'Token composition', byModel: 'By model', bySession: 'By session (Top 50)', recent: 'Recent requests',
    trendTokens: 'Token trend · by model', trendCost: 'Cost trend · by model', trendReq: 'Request trend · by model',
    overview: 'Overview', settings: 'Settings',
    settingsHint: 'Client logs are detected for the current user. Leave paths blank for automatic detection; filters choose which usage to display.',
    pin: 'Keep window on top', tray: 'Minimize to tray on close',
    openData: 'Open data location', cancel: 'Cancel', save: 'Save', browse: 'Browse',
    refresh: 'Refresh', settingsBtn: 'Settings',
    total: 'Total tokens', io: 'Input / output', out: 'Output', reason: 'Reasoning',
    cache: 'Cache read', hit: 'Hit rate', write: 'Write',
    costNote: 'Cost is recorded by opencode only', avg: 'Avg', per: '/ req',
    todayCard: 'Today', times: 'reqs', none: 'No data', empty: 'No records for this client in this period. Select All to check historical usage.',
    emptyRange: 'No {client} usage in this period. Choose All to see historical records.',
    noCost: 'No cost is recorded for this client.\nDeepSeek Harness, Claude Code and Codex logs do not include billing amounts.',
    noUsage: 'No usage recorded in this period.',
    otherModels: 'Other models',
    colClientModel: 'Client / model', colReq: 'Requests', colIn: 'Input', colOut: 'Output', colReason: 'Reasoning',
    colCacheR: 'Cache read', colCacheW: 'Cache write', colTotal: 'Total', colShare: 'Share', colCost: 'Cost',
    colSession: 'Session', colLast: 'Last active', colTime: 'Time', colClient: 'Client', colModel: 'Model',
    updated: 'Updated', records: 'rows', missing: 'Missing', notFound: 'Not found',
    clients: 'Client filter', range: 'Time range', metric: 'Trend metric', lang: 'Language', theme: 'Appearance',
  },
};
let lang = 'zh';
let theme = 'light';
let view = 'overview';
const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.zh[k] || k;

let range = '7d';
let seriesMode = 'tokens';
let selected = new Set([CLIENTS[0].id]);
let data = null;
let seenIds = new Set();
let seriesChart;
let clientChart;
let savingClients = false;
let loadSeq = 0;

const clientOf = (id) => CLIENTS.find((c) => c.id === id) || { id, name: id, short: id, mark: '?', color: '#94a3b8' };

function fmt(n) {
  n = Number(n) || 0;
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(Math.round(n));
}
const full = (n) => (Number(n) || 0).toLocaleString('en-US');
const money = (n) => '$' + (Number(n) || 0).toFixed((n || 0) < 1 ? 4 : 2);
const pct = (a, b) => (b ? ((a / b) * 100).toFixed(1) + '%' : '—');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function timeOf(ts) {
  const d = new Date(ts);
  const now = new Date();
  const loc = lang === 'en' ? 'en-GB' : 'zh-CN';
  const hm = d.toLocaleTimeString(loc, { hour12: false });
  return d.toDateString() === now.toDateString() ? hm : `${d.getMonth() + 1}/${d.getDate()} ${hm}`;
}
function announce(message) {
  const node = $('#status');
  node.textContent = '';
  node.textContent = message;
}
function applyI18n() {
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  $('#clients').setAttribute('aria-label', t('clients'));
  $('#ranges').setAttribute('aria-label', t('range'));
  $('#seriesMode').setAttribute('aria-label', t('metric'));
  $('#btnLang').setAttribute('aria-label', t('lang'));
  $('#btnTheme').setAttribute('aria-label', theme === 'dark' ? t('day') : t('night'));
  $('#btnRefresh').setAttribute('aria-label', t('refresh'));
  $('#btnSettings').setAttribute('aria-label', t('settingsBtn'));
  $('#langLabel').textContent = t('langName');
  $('#pageTitle').textContent = t({ overview: 'mission', models: 'navModels', sessions: 'navSessions', recent: 'recent' }[view]);
  $('#themeIcon').innerHTML = theme === 'dark'
    ? '<path d="M21 14.5A8.5 8.5 0 0 1 9.5 3 7 7 0 1 0 21 14.5z"/>'
    : '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>';
}
function applyTheme() {
  document.documentElement.dataset.theme = theme;
  Chart.defaults.color = theme === 'light' ? '#506779' : '#9ab0c8';
  Chart.defaults.borderColor = theme === 'light' ? '#d6e3eb' : '#233b53';
}
function pill(id) {
  const c = clientOf(id);
  return `<span class="tag ${esc(c.id)}">${esc(c.short)}</span>`;
}
function showView(name) {
  view = name;
  applyI18n();
  document.querySelectorAll('.nav').forEach((b) => {
    const on = b.dataset.view === name;
    b.classList.toggle('on', on);
    b.setAttribute('aria-current', on ? 'page' : 'false');
  });
  document.querySelectorAll('.view').forEach((el) => el.classList.toggle('on', el.id === `view-${name}`));
  if (name === 'overview') {
    renderCharts();
    requestAnimationFrame(() => {
      if (seriesChart) seriesChart.resize();
      if (clientChart) clientChart.resize();
    });
  }
  $('#content').focus();
}

function renderCharts() {
  if (!data) return;
  renderSeries();
  renderClientChart();
}

function renderClients() {
  const focused = document.activeElement?.dataset.client;
  const sources = Object.fromEntries((data?.sources || []).map((s) => [s.id, s]));
  $('#clients').innerHTML = CLIENTS.map((c) => {
    const on = selected.has(c.id);
    const src = sources[c.id];
    const missing = src && !src.ok;
    const detail = on ? t('selectedClient') : missing ? t('missing') : t('selectClient');
    return `<button type="button" role="radio" tabindex="${on ? 0 : -1}" class="chip ${on ? 'on' : 'off'}" data-client="${c.id}" aria-checked="${on}">
      <i class="dot" aria-hidden="true">${esc(c.mark)}</i><span class="client-copy"><span class="client-name">${esc(c.name)}</span><span class="client-state">${on ? '✓ ' : ''}${esc(detail)}</span></span>
    </button>`;
  }).join('');
  $('#activeClient').textContent = clientOf([...selected][0]).name;
  if (focused) document.querySelector(`#clients [data-client="${focused}"]`)?.focus();
}

function splits(stat, field = 'clients') {
  return CLIENTS.filter((c) => selected.has(c.id) && stat?.[field]?.[c.id]).map((c) => {
    const v = stat[field][c.id];
    const text = field === 'clientCost' ? money(v) : field === 'clientReq' ? full(v) : fmt(v);
    return `<span class="split"><i class="dot" style="background:${c.color};width:7px;height:7px;border-radius:50%" aria-hidden="true"></i>${esc(c.short)} <b>${text}</b></span>`;
  }).join('');
}

function renderCards() {
  const s = data.summary;
  const cacheHit = s.cacheRead / (s.input + s.cacheRead + s.cacheWrite || 1);
  const cards = [
    { k: t('total'), v: fmt(s.total), s: full(s.total), extra: splits(s), cls: 'hero' },
    { k: t('io'), v: fmt(s.input), s: `${t('out')} ${fmt(s.output)} · ${t('reason')} ${fmt(s.reasoning)}` },
    { k: t('cache'), v: fmt(s.cacheRead), s: `${t('hit')} ${(cacheHit * 100).toFixed(1)}% · ${t('write')} ${fmt(s.cacheWrite)}` },
    { k: t('cost'), v: money(s.cost), extra: splits(s, 'clientCost'), s: t('costNote') },
    { k: t('requests'), v: full(s.requests), extra: splits(s, 'clientReq'), s: `${t('avg')} ${fmt(s.requests ? s.total / s.requests : 0)} ${t('per')}` },
    { k: t('todayCard'), v: fmt(data.today.total), extra: splits(data.today), s: `${full(data.today.requests)} ${t('times')} · ${money(data.today.cost)}` },
  ];
  $('#cards').innerHTML = cards.map((c) => `
    <article class="card ${c.cls || ''}">
      <div class="k">${c.k}</div>
      <div class="v">${c.v}</div>
      ${c.extra ? `<div class="splits">${c.extra}</div>` : ''}
      <div class="s">${c.s}</div>
    </article>`).join('');
}

Chart.defaults.color = '#8a8178';
Chart.defaults.borderColor = 'rgba(63,58,52,0.08)';
Chart.defaults.font.family = '"Segoe UI", "Microsoft YaHei", sans-serif';
// 切换筛选时会重建图表；关闭动画避免销毁动画中的图表触发 Chart.js 竞态（this._fn 错误）
Chart.defaults.animation = false;

const MAX_MODEL_SERIES = 5;
function modelColor(key) {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return MODEL_COLORS[Math.abs(h) % MODEL_COLORS.length];
}
function renderSeries() {
  const labels = data.series.map((p) => (data.hourly ? p.label : p.label.slice(5)));
  const field = seriesMode === 'tokens' ? 'models' : seriesMode === 'cost' ? 'modelCost' : 'modelReq';
  const stack = seriesMode === 'tokens' ? 'tokens' : seriesMode === 'cost' ? 'cost' : 'req';
  const metric = (m) => (seriesMode === 'tokens' ? m.total : seriesMode === 'cost' ? m.cost : m.requests);
  const models = [...(data.byModel || [])].filter((m) => selected.has(m.client)).sort((a, b) => metric(b) - metric(a));
  const top = models.slice(0, MAX_MODEL_SERIES);
  const rest = models.slice(MAX_MODEL_SERIES);
  const nameCount = models.reduce((map, m) => map.set(m.model, (map.get(m.model) || 0) + 1), new Map());
  const labelOf = (m) => {
    if (nameCount.get(m.model) < 2) return m.model;
    const provider = m.provider.length > 14 ? `${m.provider.slice(0, 13)}…` : m.provider;
    return `${m.model} · ${provider}`;
  };
  const pick = (p, key) => {
    const v = p[field]?.[key] || 0;
    return seriesMode === 'cost' ? +v.toFixed(4) : v;
  };
  let datasets = top.map((m) => ({
    label: labelOf(m),
    data: data.series.map((p) => pick(p, m.key)),
    backgroundColor: modelColor(m.key),
    stack,
    borderRadius: 2,
  }));
  if (rest.length) {
    const keys = rest.map((m) => m.key);
    datasets.push({
      label: `${t('otherModels')} (${rest.length})`,
      data: data.series.map((p) => {
        const v = keys.reduce((n, key) => n + (p[field]?.[key] || 0), 0);
        return seriesMode === 'cost' ? +v.toFixed(4) : v;
      }),
      backgroundColor: '#64748b',
      stack,
      borderRadius: 2,
    });
  }
  const titles = { tokens: t('trendTokens'), cost: t('trendCost'), requests: t('trendReq') };
  $('#seriesTitle').textContent = titles[seriesMode];
  const costMode = seriesMode === 'cost';
  const hasValue = datasets.some((d) => d.data.some((v) => v > 0));
  const costTick = (v) => '$' + (v ? Number(v.toFixed(4)) : 0);
  const opts = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 9, boxHeight: 9, usePointStyle: true, font: { size: 11 } } },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${seriesMode === 'cost' ? money(c.raw) : full(c.raw)}` } },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 10 } },
      y: {
        stacked: true,
        beginAtZero: true,
        ...(hasValue ? {} : { suggestedMax: costMode ? 0.01 : 1 }),
        ticks: { precision: costMode ? 4 : 0, callback: (v) => (costMode ? costTick(v) : fmt(v)) },
      },
    },
  };
  const seriesTotal = datasets.reduce((n, d) => n + d.data.reduce((a, b) => a + b, 0), 0);
  const empty = $('#seriesEmpty');
  empty.hidden = seriesTotal > 0;
  empty.textContent = empty.hidden ? '' : costMode ? t('noCost') : t('noUsage');

  try {
    if (seriesChart) { seriesChart.destroy(); seriesChart = null; }
    seriesChart = new Chart($('#seriesChart'), { type: 'bar', data: { labels, datasets }, options: opts });
  } catch (err) {
    seriesChart = null;
    console.error('series chart failed', err);
  }
}

function renderClientChart() {
  const rows = [
    { name: t('colIn'), total: data.summary.input, color: '#51becb' },
    { name: t('colOut'), total: data.summary.output, color: '#668aee' },
    { name: t('colReason'), total: data.summary.reasoning, color: '#b2a1ff' },
    { name: t('colCacheR'), total: data.summary.cacheRead, color: '#39b394' },
    { name: t('colCacheW'), total: data.summary.cacheWrite, color: '#d6a45d' },
  ];
  $('#clientChart').setAttribute('aria-label', `${t('clientShare')}: ${rows.map(r => `${r.name} ${full(r.total)}`).join(', ')}`);
  const cfg = {
    type: 'doughnut',
    data: {
      labels: rows.map((c) => c.name),
      datasets: [{ data: rows.map((c) => c.total), backgroundColor: rows.map((c) => c.color), borderWidth: 0 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      cutout: '64%',
      plugins: {
        legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } },
        tooltip: { callbacks: { label: (c) => `${c.label}: ${fmt(c.raw)} (${pct(c.raw, data.summary.total)})` } },
      },
    },
  };
  const empty = $('#clientEmpty');
  empty.hidden = data.summary.total > 0;
  empty.textContent = empty.hidden ? '' : t('noUsage');

  try {
    if (clientChart) { clientChart.destroy(); clientChart = null; }
    clientChart = new Chart($('#clientChart'), cfg);
  } catch (err) {
    clientChart = null;
    console.error('client chart failed', err);
  }
}

function renderModelTable() {
  const max = Math.max(1, ...data.byModel.map((m) => m.total));
  const rows = data.byModel.map((m) => `
    <tr>
      <td class="bar">${pill(m.client)} ${esc(m.model)}
        <span class="sub">${esc(m.provider)}</span>
        <span class="fill" style="width:${(m.total / max) * 100}%;background:${clientOf(m.client).color}"></span></td>
      <td>${full(m.requests)}</td><td>${fmt(m.input)}</td><td>${fmt(m.output)}</td><td>${fmt(m.reasoning)}</td>
      <td>${fmt(m.cacheRead)}</td><td>${fmt(m.cacheWrite)}</td><td><b>${fmt(m.total)}</b></td>
      <td>${pct(m.total, data.summary.total)}</td><td>${money(m.cost)}</td>
    </tr>`).join('');
  $('#modelTable').innerHTML = `
    <thead><tr><th>${t('colClientModel')}</th><th>${t('colReq')}</th><th>${t('colIn')}</th><th>${t('colOut')}</th><th>${t('colReason')}</th><th>${t('colCacheR')}</th><th>${t('colCacheW')}</th><th>${t('colTotal')}</th><th>${t('colShare')}</th><th>${t('colCost')}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="10" class="empty">${t('empty')}</td></tr>`}</tbody>`;
}

function renderSessionTable() {
  const rows = data.bySession.map((s) => `
    <tr>
      <td class="title" title="${esc(s.title)}">${pill(s.client)} <span class="trunc">${esc(s.title)}</span><div class="sub trunc">${esc(s.directory)}</div></td>
      <td>${full(s.requests)}</td><td>${fmt(s.input)}</td><td>${fmt(s.output)}</td><td>${fmt(s.cacheRead)}</td>
      <td><b>${fmt(s.total)}</b></td><td>${money(s.cost)}</td><td>${timeOf(s.last)}</td>
    </tr>`).join('');
  $('#sessionTable').innerHTML = `
    <thead><tr><th>${t('colSession')}</th><th>${t('colReq')}</th><th>${t('colIn')}</th><th>${t('colOut')}</th><th>${t('colCacheR')}</th><th>${t('colTotal')}</th><th>${t('colCost')}</th><th>${t('colLast')}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="8" class="empty">${t('empty')}</td></tr>`}</tbody>`;
}

function renderRecent(first) {
  const rows = data.recent.map((r) => {
    const isNew = !first && !seenIds.has(r.id);
    return `
    <tr class="${isNew ? 'new' : ''}">
      <td>${timeOf(r.time)}</td>
      <td class="l">${pill(r.client)}</td>
      <td class="l">${esc(r.model)} <span class="sub">${esc(r.provider)}</span></td>
      <td class="l title" title="${esc(r.sessionTitle)}"><span class="trunc">${esc(r.sessionTitle)}</span></td>
      <td>${full(r.input)}</td><td>${full(r.output)}</td><td>${full(r.reasoning)}</td>
      <td>${full(r.cacheRead)}</td><td>${full(r.cacheWrite)}</td><td><b>${full(r.total)}</b></td><td>${money(r.cost)}</td>
    </tr>`;
  }).join('');
  seenIds = new Set(data.recent.map((r) => r.id));
  $('#recentTable').innerHTML = `
    <thead><tr><th>${t('colTime')}</th><th style="text-align:left">${t('colClient')}</th><th style="text-align:left">${t('colModel')}</th><th style="text-align:left">${t('colSession')}</th><th>${t('colIn')}</th><th>${t('colOut')}</th><th>${t('colReason')}</th><th>${t('colCacheR')}</th><th>${t('colCacheW')}</th><th>${t('colTotal')}</th><th>${t('colCost')}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="11" class="empty">${t('empty')}</td></tr>`}</tbody>`;
}

function paint(first = false) {
  applyI18n();
  const err = $('#error');
  err.hidden = !data.error;
  err.textContent = data.error || '';
  document.querySelectorAll('#ranges button').forEach((b) => {
    const on = b.dataset.range === range;
    b.classList.toggle('pill-btn', true);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  renderClients();
  renderCards();
  const notice = $('#notice');
  notice.hidden = data.summary.requests > 0;
  notice.textContent = notice.hidden ? '' : t('emptyRange').replace('{client}', clientOf([...selected][0]).name);
  if (view === 'overview') renderCharts();
  renderModelTable();
  renderSessionTable();
  renderRecent(first);
  const loc = lang === 'en' ? 'en-GB' : 'zh-CN';
  const names = (data.sources || []).map((s) => `${clientOf(s.id).short} ${s.ok ? `${s.requests} ${t('records')}` : t('missing')}`).join(' · ');
  $('#footer').textContent = `${names} · ${t('updated')} ${new Date(data.loadedAt).toLocaleTimeString(loc, { hour12: false })}`;
  announce($('#footer').textContent);
}

async function load(first = false) {
  const seq = ++loadSeq;
  const next = await window.api.getUsage(range);
  if (seq !== loadSeq) return; // 丢弃较早请求的迟到响应
  data = next;
  if (Array.isArray(data.selected)) selected = new Set(data.selected);
  paint(first);
}

function flashLive() {
  const el = $('#live');
  el.classList.add('flash');
  setTimeout(() => el.classList.remove('flash'), 800);
}

$('#ranges').addEventListener('click', (e) => {
  const r = e.target.closest('button')?.dataset.range;
  if (!r || r === range) return;
  range = r;
  load(true);
});

$('#clients').addEventListener('click', async (e) => {
  const id = e.target.closest('button')?.dataset.client;
  if (!id || savingClients) return;
  if (selected.has(id)) return;
  selected = new Set([id]);
  savingClients = true;
  try {
    await window.api.setConfig({ clients: [...selected] });
    await load(true);
  } finally {
    savingClients = false;
  }
});

$('#clients').addEventListener('keydown', (e) => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return;
  e.preventDefault();
  if (savingClients) return;
  const buttons = [...$('#clients').querySelectorAll('button')];
  const index = buttons.indexOf(e.target.closest('button'));
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? buttons.length - 1 : (index + (['ArrowLeft', 'ArrowUp'].includes(e.key) ? -1 : 1) + buttons.length) % buttons.length;
  buttons[next].focus();
  buttons[next].click();
});

$('#seriesMode').addEventListener('click', (e) => {
  const m = e.target.closest('button')?.dataset.mode;
  if (!m) return;
  seriesMode = m;
  document.querySelectorAll('#seriesMode button').forEach((b) => {
    const on = b.dataset.mode === m;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
  renderSeries();
});
$('#btnRefresh').addEventListener('click', async () => { await window.api.refresh(); await load(); flashLive(); });
$('#nav').addEventListener('click', (e) => {
  const name = e.target.closest('button')?.dataset.view;
  if (name) showView(name);
});
$('#btnLang').addEventListener('click', async () => {
  lang = lang === 'zh' ? 'en' : 'zh';
  applyI18n();
  if (data) paint();
  await window.api.setConfig({ lang });
});
$('#btnTheme').addEventListener('click', async () => {
  theme = theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  applyI18n();
  if (data && view === 'overview') renderCharts();
  await window.api.setConfig({ theme });
});

$('#btnSettings').addEventListener('click', async () => {
  const c = await window.api.getConfig();
  $('#pathRows').innerHTML = CLIENTS.map((cl) => `
    <div class="path-row">
      <span>${esc(cl.short)}</span>
      <input data-path="${cl.id}" type="text" name="${esc(cl.id)}Path" autocomplete="off" spellcheck="false" value="${esc(c.dbPaths[cl.id] || '')}" aria-label="${esc(cl.name)}" placeholder="${esc(c.defaultPaths[cl.id] || '')}" />
      <button type="button" data-browse="${cl.id}">${t('browse')}</button>
    </div>`).join('');
  $('#cfgTop').checked = c.alwaysOnTop;
  $('#cfgTray').checked = c.closeToTray;
  $('#settings').showModal();
});
$('#pathRows').addEventListener('click', async (e) => {
  const id = e.target.dataset.browse;
  if (!id) return;
  const p = await window.api.chooseDb(id);
  if (p) $(`#pathRows input[data-path="${id}"]`).value = p;
});
$('#btnShowDb').addEventListener('click', () => {
  const first = [...selected][0] || 'opencode';
  window.api.showDb(first);
});
$('#settings').addEventListener('close', async () => {
  if ($('#settings').returnValue !== 'ok') return;
  const dbPaths = {};
  document.querySelectorAll('#pathRows input[data-path]').forEach((el) => { dbPaths[el.dataset.path] = el.value.trim(); });
  await window.api.setConfig({
    dbPaths,
    alwaysOnTop: $('#cfgTop').checked,
    closeToTray: $('#cfgTray').checked,
  });
  load(true);
});

window.api.onChanged(() => { load(); flashLive(); });

(async () => {
  const c = await window.api.getConfig();
  range = c.range || '7d';
  $('#appVersion').textContent = c.version ? `v${c.version}` : '';
  lang = c.lang === 'en' ? 'en' : 'zh';
  theme = c.theme === 'dark' ? 'dark' : 'light';
  if (Array.isArray(c.clients) && c.clients.length) selected = new Set(c.clients);
  applyTheme();
  applyI18n();
  showView('overview');
  load(true);
})();
