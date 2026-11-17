const { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { aggregate } = require('./aggregate');
const providers = {
  opencode: require('./providers/opencode'),
  dsh: require('./providers/dsh'),
  antigravity: require('./providers/antigravity'),
  claude: require('./providers/claude'),
  codex: require('./providers/codex')
};

// 开发/自动测试可用独立配置目录，避免改动本机正式设置
if (process.env.TOKEN_SHOW_USER_DATA) app.setPath('userData', process.env.TOKEN_SHOW_USER_DATA);

const POLL_MS = 3000;
let win = null;
let tray = null;
let quitting = false;

// ---------- 配置 ----------
const configFile = () => path.join(app.getPath('userData'), 'config.json');
const CLIENTS = [
  { id: 'opencode', name: 'opencode', short: 'OC' },
  { id: 'dsh', name: 'DeepSeek Harness', short: 'DSH' },
  { id: 'antigravity', name: 'Antigravity', short: 'AGY' },
  { id: 'claude', name: 'Claude Code', short: 'CC' },
  { id: 'codex', name: 'Codex', short: 'CX' },
];
const CLIENT_IDS = CLIENTS.map((c) => c.id);
const defaults = {
  clients: [CLIENT_IDS[0]],
  dbPaths: {},
  range: '7d',
  lang: 'zh',
  theme: 'dark',
  alwaysOnTop: false,
  closeToTray: true,
};
let config = { ...defaults };
function loadConfig() {
  try { config = { ...defaults, ...JSON.parse(fs.readFileSync(configFile(), 'utf8')) }; } catch { config = { ...defaults }; }
  if (!Array.isArray(config.clients)) config.clients = [];
  config.clients = [config.clients.find((id) => CLIENT_IDS.includes(id)) || CLIENT_IDS[0]];
  if (!config.dbPaths || typeof config.dbPaths !== 'object') config.dbPaths = {};
  if (config.lang !== 'en') config.lang = 'zh';
  if (config.theme !== 'light') config.theme = 'dark';
  // 旧版单数据源配置：自定义路径归到当时选中的客户端
  if (config.dbPath && config.provider && CLIENT_IDS.includes(config.provider) && !config.dbPaths[config.provider]) {
    config.dbPaths[config.provider] = config.dbPath;
  }
}
function saveConfig() {
  fs.mkdirSync(path.dirname(configFile()), { recursive: true });
  fs.writeFileSync(configFile(), JSON.stringify(config, null, 2));
}
const pathOf = (id) => (config.dbPaths && config.dbPaths[id]) || providers[id].defaultDbPath();

// ---------- 演示数据（仅截图/开发用，不读取真实日志） ----------
const DEMO = process.env.TOKEN_SHOW_DEMO === '1';
const DEMO_MODELS = {
  opencode: [
    { model: 'deepseek-v4.1', provider: 'deepseek', input: 12000, output: 1200, reasoning: 260, cacheRead: 110000 },
    { model: 'claude-opus-4-8', provider: 'anthropic', input: 8000, output: 900, reasoning: 0, cacheRead: 46000 },
    { model: 'gpt-5.6', provider: 'openai', input: 6000, output: 700, reasoning: 120, cacheRead: 32000 },
    { model: 'gemini-3.1-pro', provider: 'google', input: 5000, output: 500, reasoning: 0, cacheRead: 24000 },
  ],
  dsh: [
    { model: 'deepseek-v4.1', provider: 'deepseek', input: 10000, output: 1100, reasoning: 300, cacheRead: 84000 },
    { model: 'deepseek-reasoner', provider: 'deepseek', input: 7000, output: 1600, reasoning: 900, cacheRead: 52000 },
  ],
  antigravity: [{ model: 'gemini-3.1-pro', provider: 'google', input: 7000, output: 800, reasoning: 0, cacheRead: 38000 }],
  claude: [
    { model: 'claude-opus-4-8', provider: 'anthropic', input: 9000, output: 1000, reasoning: 0, cacheRead: 51000 },
    { model: 'claude-sonnet-4-5', provider: 'anthropic', input: 6000, output: 800, reasoning: 0, cacheRead: 30000 },
  ],
  codex: [
    { model: 'gpt-5.6', provider: 'openai', input: 8000, output: 900, reasoning: 260, cacheRead: 42000 },
    { model: 'gpt-5.5', provider: 'openai', input: 5000, output: 600, reasoning: 180, cacheRead: 26000 },
  ],
};
const DEMO_SESSIONS = {
  opencode: [['Build token dashboard', '~/projects/token-show'], ['Refactor log parser', '~/projects/log-parser'], ['Review API client', '~/projects/api-client'], ['Fix chart tooltip', '~/projects/token-show']],
  dsh: [['Analyze session logs', '~/projects/token-show'], ['Write regression tests', '~/projects/log-parser']],
  antigravity: [['Explore provider format', '~/projects/token-show']],
  claude: [['Polish dashboard layout', '~/projects/token-show'], ['Add provider adapter', '~/projects/api-client']],
  codex: [['Implement cost deltas', '~/projects/token-show'], ['Audit cache accounting', '~/projects/log-parser']],
};
function buildDemo() {
  const records = [];
  const sessions = new Map();
  const now = Date.now();
  for (const client of CLIENTS) {
    const models = DEMO_MODELS[client.id] || [];
    const titles = DEMO_SESSIONS[client.id] || [['Demo session', '~/projects/demo']];
    titles.forEach(([title, directory], i) => sessions.set(`${client.id}:${client.id}-s${i}`, { title, directory, parentId: null }));
    for (let d = 9; d >= 0; d--) {
      const count = 6 + ((d * 7 + client.id.length) % 8);
      for (let i = 0; i < count; i++) {
        const m = models[(i + d) % models.length];
        if (!m) continue;
        const jitter = 0.55 + ((i * 13 + d * 7 + client.id.length) % 90) / 100;
        const input = Math.round(m.input * jitter);
        const output = Math.round(m.output * jitter);
        const reasoning = Math.round(m.reasoning * jitter);
        const cacheRead = Math.round(m.cacheRead * jitter);
        const total = input + output + reasoning + cacheRead;
        const time = new Date(now - d * 86400000);
        time.setHours(9 + ((i * 3) % 11), (i * 17) % 60, 0, 0);
        records.push({
          id: `demo-${client.id}-${d}-${i}`, client: client.id, sessionId: `${client.id}-s${(i + d) % titles.length}`,
          time: time.getTime(), provider: m.provider, model: m.model, agent: client.id,
          input, output, reasoning, cacheRead, cacheWrite: 0, total,
          cost: client.id === 'opencode' ? +(total * 0.00000005).toFixed(6) : 0,
        });
      }
    }
  }
  const sources = CLIENTS.map((c) => ({ id: c.id, name: c.name, short: c.short, path: 'demo', ok: true, requests: records.filter((r) => r.client === c.id).length, error: null }));
  return { records, sessions, sources };
}

// ---------- 数据缓存 ----------
let cache = { fp: {}, records: [], sessions: new Map(), sources: [], error: null, loadedAt: 0 };

function refresh(force = false) {
  if (DEMO) {
    if (cache.sources.length && !force) return false;
    const demo = buildDemo();
    cache = { fp: {}, records: demo.records, sessions: demo.sessions, sources: demo.sources, error: null, loadedAt: Date.now() };
    return true;
  }
  const fps = {};
  for (const c of CLIENTS) {
    const p = pathOf(c.id);
    fps[c.id] = fs.existsSync(p) ? providers[c.id].fingerprint(p) : '-';
  }
  const same = CLIENTS.every((c) => fps[c.id] === cache.fp[c.id]);
  if (!force && same) return false;

  const records = [];
  const sessions = new Map();
  const sources = [];
  const errors = [];
  for (const c of CLIENTS) {
    const p = pathOf(c.id);
    const src = { id: c.id, name: c.name, short: c.short, path: p, ok: false, requests: 0, error: null };
    if (!fs.existsSync(p)) {
      src.error = '未找到';
      errors.push(`${c.name}：未找到 ${p}`);
      sources.push(src);
      continue;
    }
    try {
      const got = providers[c.id].readRecords(p);
      for (const r of got.records) records.push({ ...r, client: c.id });
      for (const [sid, meta] of got.sessions) sessions.set(`${c.id}:${sid}`, { ...meta, client: c.id });
      src.ok = true;
      src.requests = got.records.length;
    } catch (e) {
      src.error = e.message;
      errors.push(`${c.name}：${e.message}`);
    }
    sources.push(src);
  }
  cache = { fp: fps, records, sessions, sources, error: errors.length ? errors.join('；') : null, loadedAt: Date.now() };
  return true;
}

function snapshot(range) {
  const selected = new Set(config.clients);
  const records = cache.records.filter((r) => selected.has(r.client));
  const data = aggregate(records, cache.sessions, range || config.range);
  return {
    ...data,
    error: cache.error,
    sources: cache.sources,
    clients: CLIENTS,
    selected: [...config.clients],
    loadedAt: cache.loadedAt,
  };
}

// ---------- 托盘 ----------
function fmt(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return String(n);
}
function updateTray() {
  if (!tray) return;
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  const selected = new Set(config.clients);
  let total = 0, req = 0, cost = 0;
  for (const r of cache.records) {
    if (!selected.has(r.client) || r.time < t0.getTime()) continue;
    total += r.total; req++; cost += r.cost;
  }
  const names = CLIENTS.filter((c) => selected.has(c.id)).map((c) => c.short).join(' + ') || '无客户端';
  tray.setToolTip(`Token Show · ${names}\n今日 ${fmt(total)} tokens · ${req} 次请求 · $${cost.toFixed(2)}`);
}
function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, '..', 'assets', 'icon.png')).resize({ width: 16, height: 16 }));
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '显示主窗口', click: showWindow },
    { label: '立即刷新', click: () => { refresh(true); push(); } },
    { type: 'separator' },
    { label: '退出', click: () => { quitting = true; app.quit(); } },
  ]));
  tray.on('click', showWindow);
  updateTray();
}

// ---------- 窗口 ----------
function showWindow() {
  if (!win) return createWindow();
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}
function windowColors() {
  return config.theme === 'dark'
    ? { color: '#080f1b', symbolColor: '#e7f3ff' }
    : { color: '#edf4f8', symbolColor: '#142c40' };
}
function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: windowColors().color,
    titleBarStyle: 'hidden',
    titleBarOverlay: { ...windowColors(), height: 34 },
    title: 'Token Show',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    autoHideMenuBar: true,
    alwaysOnTop: !!config.alwaysOnTop,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('close', (e) => {
    if (!quitting && config.closeToTray) { e.preventDefault(); win.hide(); }
  });
  win.on('closed', () => { win = null; });

  // 开发用：TOKEN_SHOW_SHOT=xxx.png 时截图后退出
  if (process.env.TOKEN_SHOW_SHOT) {
    win.webContents.on('console-message', (e) => console.log('[renderer]', e.level, e.message));
    win.webContents.once('did-finish-load', () => setTimeout(async () => {
      const view = ['overview', 'models', 'sessions', 'recent'].includes(process.env.TOKEN_SHOW_SHOT_VIEW) ? process.env.TOKEN_SHOW_SHOT_VIEW : '';
      const client = CLIENTS.some((c) => c.id === process.env.TOKEN_SHOW_SHOT_CLIENT) ? process.env.TOKEN_SHOW_SHOT_CLIENT : '';
      const range = ['today', '7d', '30d', '90d', 'all'].includes(process.env.TOKEN_SHOW_SHOT_RANGE) ? process.env.TOKEN_SHOW_SHOT_RANGE : '';
      const theme = ['light', 'dark'].includes(process.env.TOKEN_SHOW_SHOT_THEME) ? process.env.TOKEN_SHOW_SHOT_THEME : '';
      const mode = ['tokens', 'cost', 'requests'].includes(process.env.TOKEN_SHOW_SHOT_MODE) ? process.env.TOKEN_SHOW_SHOT_MODE : '';
      if (view || client || range || theme || mode) {
        await win.webContents.executeJavaScript(`(() => {
          ${view ? `document.querySelector('.nav[data-view="${view}"]')?.click();` : ''}
          ${client ? `document.querySelector('#clients [data-client="${client}"]')?.click();` : ''}
          ${range ? `document.querySelector('#ranges [data-range="${range}"]')?.click();` : ''}
          ${theme ? `if (document.documentElement.dataset.theme !== '${theme}') document.querySelector('#btnTheme')?.click();` : ''}
          ${mode ? `document.querySelector('#seriesMode [data-mode="${mode}"]')?.click();` : ''}
        })()`);
        await new Promise((r) => setTimeout(r, 1200));
      }
      const viewAfter = ['overview', 'models', 'sessions', 'recent'].includes(process.env.TOKEN_SHOW_SHOT_VIEW_AFTER) ? process.env.TOKEN_SHOW_SHOT_VIEW_AFTER : '';
      if (viewAfter) {
        await win.webContents.executeJavaScript(`document.querySelector('.nav[data-view="${viewAfter}"]')?.click()`);
        await new Promise((r) => setTimeout(r, 900));
      }
      const switches = Math.min(20, Number.parseInt(process.env.TOKEN_SHOW_SHOT_SWITCHES || '0', 10) || 0);
      if (switches) {
        await win.webContents.executeJavaScript(`(async () => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          for (let i = 0; i < ${switches}; i++) {
            document.querySelector('.nav[data-view="sessions"]')?.click();
            await wait(220);
            document.querySelector('.nav[data-view="overview"]')?.click();
            await wait(220);
          }
        })()`);
        await new Promise((r) => setTimeout(r, 900));
      }
      const modeClicks = Math.min(60, Number.parseInt(process.env.TOKEN_SHOW_SHOT_MODE_CLICKS || '0', 10) || 0);
      if (modeClicks) {
        await win.webContents.executeJavaScript(`(async () => {
          const wait = (ms) => new Promise((r) => setTimeout(r, ms));
          const modes = ['tokens', 'cost', 'requests'];
          for (let i = 0; i < ${modeClicks}; i++) {
            document.querySelector('#seriesMode [data-mode="' + modes[i % 3] + '"]')?.click();
            await wait(40);
          }
          document.querySelector('#seriesMode [data-mode="cost"]')?.click();
        })()`);
        await new Promise((r) => setTimeout(r, 900));
      }
      const img = await win.webContents.capturePage();
      fs.writeFileSync(process.env.TOKEN_SHOW_SHOT, img.toPNG());
      await win.webContents.executeJavaScript("document.querySelector('main').scrollTop = 99999");
      await new Promise((r) => setTimeout(r, 400));
      fs.writeFileSync(process.env.TOKEN_SHOW_SHOT.replace(/\.png$/, '_2.png'), (await win.webContents.capturePage()).toPNG());
      quitting = true;
      app.quit();
    }, 5000));
  }
}

function push() {
  updateTray();
  if (win && !win.isDestroyed()) win.webContents.send('usage:changed');
}

// ---------- IPC ----------
ipcMain.handle('usage:get', (_e, range) => {
  if (range && range !== config.range) { config.range = range; saveConfig(); }
  return snapshot(range);
});
ipcMain.handle('usage:refresh', () => { refresh(true); updateTray(); return true; });
function publicConfig() {
  const paths = {};
  const defaults = {};
  for (const c of CLIENTS) {
    paths[c.id] = pathOf(c.id);
    defaults[c.id] = providers[c.id].defaultDbPath();
  }
  return {
    clients: [...config.clients],
    dbPaths: { ...(config.dbPaths || {}) },
    resolvedPaths: paths,
    defaultPaths: defaults,
    catalog: CLIENTS,
    version: app.getVersion(),
    range: config.range,
    lang: config.lang,
    theme: config.theme,
    alwaysOnTop: !!config.alwaysOnTop,
    closeToTray: !!config.closeToTray,
  };
}
ipcMain.handle('config:get', () => publicConfig());
ipcMain.handle('config:set', (_e, patch) => {
  const next = { ...config };
  if (patch.clients) {
    const list = patch.clients.filter((id) => CLIENT_IDS.includes(id));
    if (list.length) next.clients = [list[0]];
  }
  if (patch.dbPaths && typeof patch.dbPaths === 'object') next.dbPaths = { ...(config.dbPaths || {}), ...patch.dbPaths };
  if ('range' in patch) next.range = patch.range;
  if (patch.lang === 'en' || patch.lang === 'zh') next.lang = patch.lang;
  if (patch.theme === 'light' || patch.theme === 'dark') next.theme = patch.theme;
  if ('alwaysOnTop' in patch) next.alwaysOnTop = !!patch.alwaysOnTop;
  if ('closeToTray' in patch) next.closeToTray = !!patch.closeToTray;
  config = next;
  saveConfig();
  if (win && 'alwaysOnTop' in patch) win.setAlwaysOnTop(!!config.alwaysOnTop);
  if (win && 'theme' in patch) {
    win.setTitleBarOverlay({ ...windowColors(), height: 34 });
    win.setBackgroundColor(windowColors().color);
  }
  if (patch.dbPaths) { refresh(true); push(); }
  return publicConfig();
});
ipcMain.handle('config:chooseDb', async (_e, clientId) => {
  const id = CLIENT_IDS.includes(clientId) ? clientId : 'opencode';
  const file = id === 'opencode';
  const r = await dialog.showOpenDialog(win, {
    title: file ? `选择 ${id} 数据文件` : `选择 ${id} 数据目录`,
    defaultPath: pathOf(id),
    filters: file ? [{ name: 'SQLite', extensions: ['db', 'sqlite'] }, { name: '所有文件', extensions: ['*'] }] : undefined,
    properties: [file ? 'openFile' : 'openDirectory'],
  });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:showDb', (_e, clientId) => {
  const id = CLIENT_IDS.includes(clientId) ? clientId : config.clients[0] || 'opencode';
  shell.showItemInFolder(pathOf(id));
});

// ---------- 启动 ----------
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showWindow);
  app.whenReady().then(() => {
    loadConfig();
    refresh(true);
    createWindow();
    createTray();
    setInterval(() => { if (refresh()) push(); }, POLL_MS);
  });
  app.on('before-quit', () => { quitting = true; });
  app.on('window-all-closed', () => { if (!config.closeToTray) app.quit(); });
}
