import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const DB_DIR = path.join(process.cwd(), '.data');
const DB_PATH = path.join(DB_DIR, 'album.sqlite');
const ALBUM_ID = 'principal';

fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS album_state (
    id TEXT PRIMARY KEY,
    album_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

const existing = db.prepare('SELECT COUNT(1) AS cnt FROM album_state WHERE id = ?').get(ALBUM_ID);
if (existing && existing.cnt > 0) {
  console.log('Linha já existe; atualizando updated_at');
  db.prepare('UPDATE album_state SET updated_at = ? WHERE id = ?').run(new Date().toISOString(), ALBUM_ID);
} else {
  console.log('Inserindo linha inicial com objeto vazio');
  db.prepare('INSERT INTO album_state (id, album_json, updated_at) VALUES (?, ?, ?)').run(ALBUM_ID, JSON.stringify({}), new Date().toISOString());
}

db.close();
console.log('Arquivo sqlite gerado em', DB_PATH);
