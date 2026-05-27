const fs = require('fs');
const path = require('path');
const file = path.resolve(__dirname, '..', 'src', 'figurinhas-album.json');
const backup = file + '.bak.' + Date.now();
try {
  const raw = fs.readFileSync(file, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('JSON parse failed:', e.message);
    process.exit(2);
  }
  if (!Array.isArray(data)) {
    console.error('Expected array in JSON');
    process.exit(2);
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
