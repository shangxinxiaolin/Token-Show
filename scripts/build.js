// 打包输出到 release/<版本号>/，并清理中间产物，避免多个版本混在同一目录
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const pkg = require('../package.json');
const root = path.join(__dirname, '..');
const out = path.join('release', pkg.version);
const cli = path.join(root, 'node_modules', 'electron-builder', 'cli.js');

if (!fs.existsSync(cli)) {
  console.error('未找到 electron-builder，请先运行 npm install');
  process.exit(1);
}

const result = spawnSync(process.execPath, [
  cli,
  '--win', 'nsis', 'portable',
  `--config.directories.output=${out.split(path.sep).join('/')}`,
], { cwd: root, stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status || 1);

for (const name of ['win-unpacked', '.icon-ico', 'builder-debug.yml']) {
  fs.rmSync(path.join(root, out, name), { recursive: true, force: true });
}
console.log(`\nArtifacts: ${path.join(root, out)}`);
