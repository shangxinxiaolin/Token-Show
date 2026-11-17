const fs = require('fs');
const path = require('path');

function files(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(root, e.name);
    return e.isDirectory() ? files(p) : e.isFile() && e.name.endsWith('.jsonl') ? [p] : [];
  }).sort();
}
function rows(file) {
  return fs.readFileSync(file, 'utf8').split('\n').flatMap((line) => {
    try { return [JSON.parse(line)]; } catch { return []; } // A live log may end with a partial line.
  });
}
function fingerprint(root) {
  return files(root).map((f) => { const s = fs.statSync(f); return `${f}:${s.size}:${s.mtimeMs}`; }).join('|');
}
const num = (v) => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
module.exports = { files, rows, fingerprint, num };
