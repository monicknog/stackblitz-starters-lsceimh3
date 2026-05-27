const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'src', 'figurinhas-album.json');
const backup = file + '.bak.sanitize.' + Date.now();
try {
  let raw = fs.readFileSync(file, 'utf8');
  try {
    JSON.parse(raw);
  } catch (e) {
    // Attempt basic sanitization
    raw = raw.replace(/\/\*[\s\S]*?\*\//g, ''); // remove /* */ comments
    raw = raw.replace(/^[ \t]*\/\/.*$/gm, '');      // remove // comments
    raw = raw.replace(/\{\/\/.*$/gm, '');           // remove lines starting with {//
    raw = raw.replace(/\},\|\|.*$/gm, '},');        // remove garbage after },
    raw = raw.replace(/\},[^\n]*\|\|[^\n]*$/gm, '},');
    raw = raw.replace(/^\s*_\d+\s*$/gm, '');        // remove lines like _21
    raw = raw.replace(/\u0000/g, '');                // remove null chars
    // remove any isolated lines containing non-json tokens like sequences with | or Ä if not inside quotes
    raw = raw.split('\n').filter(line => !(/\|\||\^|Ä/.test(line) && !/\"/.test(line))).join('\n');
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('Sanitization failed, JSON still invalid:', e.message);
    process.exit(3);
  }
  fs.copyFileSync(file, backup);
  const before = data.length;
  const filtered = data.filter(item => !(String(item.numero) === '21' && String(item.tipo) === 'Jogador'));
  const after = filtered.length;
  fs.writeFileSync(file, JSON.stringify(filtered, null, 2), 'utf8');
  console.log(`Removed ${before - after} items (kept ${after}). Backup at ${backup}`);
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
