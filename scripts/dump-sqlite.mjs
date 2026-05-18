import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), '.data', 'album.sqlite');
const OUT_PATH = path.join(process.cwd(), 'scripts', 'album.sql');

if (!fs.existsSync(DB_PATH)) {
  console.error('Arquivo sqlite não encontrado em', DB_PATH);
  process.exit(2);
}

const db = new Database(DB_PATH, { readonly: true });

const header = `-- Dump gerado por dump-sqlite.mjs\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\nCREATE TABLE IF NOT EXISTS album_state (\n  id TEXT PRIMARY KEY,\n  album_json TEXT NOT NULL,\n  updated_at TEXT NOT NULL\n);\n\n`;

const rows = db.prepare('SELECT id, album_json, updated_at FROM album_state').all();

let inserts = '';
for (const r of rows) {
  const id = String(r.id).replace(/'/g, "''");
  const album_json = String(r.album_json).replace(/'/g, "''");
  const updated_at = String(r.updated_at).replace(/'/g, "''");
  inserts += `INSERT INTO album_state (id, album_json, updated_at) VALUES ('${id}', '${album_json}', '${updated_at}');\n`;
}

const footer = `\nCOMMIT;\n`;

fs.writeFileSync(OUT_PATH, header + inserts + footer, 'utf8');
console.log('Dump SQL gravado em', OUT_PATH);

db.close();
